# ISeeYou Copilot Instructions

## Architecture Overview

**ISeeYou** is an Expo-based React Native fortune-telling platform with video calling, real-time chat, and AI features. The app operates as a **three-service microarchitecture**:

- **API Gateway** (port 8080): `EXPO_PUBLIC_API_BASE_URL` → `/core/**` routes for auth, bookings, users, service packages
- **Chat Service** (port 8081): `EXPO_PUBLIC_CHAT_BASE_URL` → `/chat/**` and `/admin/**` for messaging, WebSocket socket.io
- **Socket Service** (port 8082): `EXPO_PUBLIC_SOCKET_PORT` → Real-time events via socket.io

**Key dependency:** CometChat UI Kit (`@cometchat/chat-uikit-react-native`) encapsulates both chat SDK and calls SDK—initialization must happen once per app lifecycle.

## Environment & Network Setup

### Pre-startup Scripts
All start commands (`npm start`, `npm run android`, `npm run ios`, `npm run web`) invoke:
1. `scripts/ensure-env.js` → Copies `.env.example` to `.env` if missing
2. `scripts/update-local-ip.js` → Auto-detects local IPv4 and rewrites `EXPO_PUBLIC_*_BASE_URL` vars

**Critical env vars:**
- `EXPO_PUBLIC_API_BASE_URL` (gateway, auto-rewritten to local IP on startup)
- `EXPO_PUBLIC_CHAT_BASE_URL` (chat service, auto-rewritten)
- `EXPO_PUBLIC_SOCKET_PORT` (default 8082)
- CometChat: `EXPO_PUBLIC_COMETCHAT_APP_ID`, `EXPO_PUBLIC_COMETCHAT_REGION`, `EXPO_PUBLIC_COMETCHAT_AUTH_KEY`
- Firebase: `EXPO_PUBLIC_FIREBASE_*` vars in app.json

On Android emulator, `scripts/update-local-ip.js` resolves `localhost` → `10.0.2.2` (Android VM gateway).

## API Layer & Authentication

### `src/services/api.js` Pattern
- **Two axios instances:** `API` (core gateway), `ChatAPI` (chat service)
- **Request interceptor:** Auto-injects `Authorization: Bearer {authToken}` from secure storage if present
- **Response interceptor:** On 401, attempts token refresh via `/core/auth/refresh`; queues pending requests until new token obtained
- **`skipAuth` config option:** Set `{ skipAuth: true }` to bypass auth injection (e.g., login, password recovery endpoints)

### Data Flow
```
Login → API.post('/core/auth/login') 
  → Response contains { token, refreshToken, userId, role, cometChatUid }
  → Store in SecureStore (keys: authToken, refreshToken, userRole, userId, cometChatUid)
  → Bootstrap CometChat user → runRealtimeSelfCheck health diagnostic
```

### FormData Requests
Services using multipart (avatar upload, package creation, Seer registration):
```javascript
const formData = new FormData();
formData.append('field', value);
return API.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
```

## CometChat Integration

### Initialization Flow (`src/services/cometchat.ts`)
1. **Early init:** `initCometChat()` in `src/app/_layout.tsx` (non-blocking, survives HMR via globalThis)
2. **User login:** `bootstrapCometChatUser()` after auth endpoint succeeds
3. **Call state:** `CallProvider` wraps entire app (via `src/contexts/CallContext.tsx`)
4. **Login persistence:** Global state stored on `globalThis.__ISU_COMETCHAT_STATE__` to survive Fast Refresh

### CallContext (`src/contexts/CallContext.tsx`)
Manages call lifecycle state (`idle`, `connecting`, `ringingOut`, `ringingIn`, `inCall`, `error`). Exposes:
- `startVideoCall(uid)` → Initiates outgoing call
- `acceptIncomingCall()` → Accepts incoming
- `endCurrentCall()` → Terminates active call
- `startCallRecording()` / `stopCallRecording()` → Call recording
- Real-time call listeners registered via `addCometChatCallListeners()`

### Module Polyfill
`src/polyfills/native-event-emitter.ts` patches missing `NativeEventEmitter` in React Native—required for CometChat SDK to function. Must be imported early in `_layout.tsx`.

## Routing & Layout

### File-based Routing (`src/app/`)
- Expo Router drives navigation via `.tsx` file structure
- `src/app/_layout.tsx` → Root layout, initializes CometChat, registers push notifications, handles deep links
- `src/app/(tabs)/` → Tab bar container (booking, home, knowledge, message, profile)
- Individual screens in `src/screens/` (not auto-routed; imported explicitly by route files)

### Deep Linking
`_layout.tsx` handles custom schemes (`iseeyou://homescreen`, `iseeyou://bookings`, `iseeyou://payment-success`). Add new routes via `Linking.parse()` and `router.replace()` dispatch.

## Key Domains

### Authentication & Profiles (`src/screens/AuthScreen.tsx`)
- Dual-mode (login/signup) UI; signup branches to Seer registration (steps 1–3)
- Zodiac sign calculation based on birthDate
- Email verification flow: 403 + "Email chưa được xác thực" → redirect to OTP screen
- CometChat login deferred until after auth endpoint succeeds (prevents race conditions)

### Bookings & Transactions (`src/screens/tabs/BookingScreen.tsx`, `src/screens/TransactionHistoryScreen.tsx`)
- Query via `getMyBookings(params)`, `getBookingDetail(id)`, `getSeerPayments(params)`, `getCustomerPayments(params)`
- Status enums: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELED`, `FAILED`
- Payment methods: `VNPAY`, `PAYPAL`, `MOMO`, `BANK_TRANSFER`
- Use `useFocusEffect` to refresh on tab focus (avoid stale data)

### Chat (`src/screens/ChatDetailScreen.tsx`)
- Conversation query: `getChatConversations(params)`, `getChatConversation(id)`, `getChatConversationByBookingId(bookingId)`
- File upload (media): `uploadChatFile(formData)` with 20s timeout
- Message fetch: `getChatMessages(conversationId, params)` with pagination
- Session control: `endChatSession(id)` to close booking-linked conversations

### AI Chat (`src/screens/AIChatScreen.tsx`)
- SSE-based streaming via `src/services/aiChat.ts`
- AI base URL resolved from `EXPO_PUBLIC_AI_BASE_URL` or inferred from gateway port 8081
- Request: POST with auth header + `multipart/form-data` (supports image context)
- Response parsing: `stripSseArtifacts()` removes event metadata; accumulates streamed JSON fields
- Session storage key: `aiChat:lastSession` (AsyncStorage)

### Service Packages & Reviews
- CRUD: `createServicePackage()`, `updateServicePackage()`, `deleteServicePackage()`, `getMyPackages(params)`
- Interaction (wishlist, reviews): `interactWithServicePackage(packageId, payload)`
- Review submission: `submitBookingReview(id, data)`

### Certificates & Knowledge
- Certificates: `createCertificate()`, `updateCertificate()`, `deleteCertificate()` with multipart form data
- Knowledge items: `getKnowledgeItems(params)`, `getKnowledgeItemDetail(id)`
- Search: `KnowledgeSearchModal` component for in-app discovery

## Constants & Styling

### Colors (`src/constants/colors.js`)
Centralized color palette (light/dark mode support). Import and use for UI consistency:
```typescript
import Colors from "@/src/constants/colors";
// Colors.primary, Colors.success, Colors.error, Colors.gray, etc.
```

### Theme (`src/constants/theme.js`)
React Native Paper theme object; applied via `<PaperProvider theme={theme}>` in `_layout.tsx`.

## Patterns & Conventions

1. **Error Handling:** Check `error?.response?.status` and `error?.response?.data?.message` for specific error codes (401 = reauth, 403 = permission/verification, 4xx = validation)
2. **Loading States:** Use `ActivityIndicator` from React Native or Paper `ProgressBar` for UX feedback
3. **Async Storage:** Use `expo-secure-store` (SecureStore) for sensitive data; `AsyncStorage` for session/cache data
4. **Notifications:** Push tokens auto-registered via Firebase Messaging (`messaging().getToken()`); stored in SecureStore
5. **Component Reuse:** `TopBar.tsx` (with search), `TopBarNoSearch.tsx` (plain header) for consistent navigation headers

## Build & Deployment

### Local Development
```bash
npm start                  # Expo Go, web, or dev client
npm run android            # Android emulator/device (runs env setup + Expo)
npm run ios                # iOS simulator/device
npm run web                # Web browser
npm run lint               # ESLint (Expo flat config)
```

### Building for Release (`eas.json`)
- **Development:** `eas build --platform android|ios --profile development`
- **Production:** `eas build --profile production` (auto-increments version)
- Submit: `eas submit --platform android|ios --profile production`

## Common Debugging

- **CometChat init fails:** Check env vars in `app.json` or `.env` for `EXPO_PUBLIC_COMETCHAT_*`
- **Network timeout:** Verify `.env` URLs match backend services (gateway, chat, socket)
- **Token refresh loop:** Inspect refresh endpoint response structure; ensure `token` field is present
- **Call state stuck:** Check `CallContext` state via React DevTools; verify CometChat listeners are wired
- **Health check warnings:** Run `runRealtimeSelfCheck()` in console; output lists missing auth tokens or env mismatches

## TypeScript & Paths

- **Base path alias:** `@/*` maps to project root (configured in `tsconfig.json`)
- **Strict mode enabled:** All `.ts`/`.tsx` files require explicit types
- **No implicit `any`:** Use generics or explicit `any` with justification

---

**Last updated:** November 2025 | Expo ~54.0 | React Native Paper | CometChat UI Kit 5.2.3
