# ISeeYou - Nền Tảng Tư Vấn Chiêm Tinh

<div align="center">
  
**Ứng dụng tư vấn chiêm tinh hiện đại, đa nền tảng với video call, chat thời gian thực và các tính năng AI.**

[Tính Năng](#-tính-năng) • [Tech Stack](#-tech-stack) • [Bắt Đầu](#-bắt-đầu) • [Kiến Trúc](#-kiến-trúc) • [Phát Triển](#-phát-triển)

</div>

---

## 📱 Tổng Quan

**ISeeYou** là một nền tảng tư vấn chiêm tinh được xây dựng bằng React Native và Expo, kết nối người dùng với các chuyên gia tư vấn chuyên nghiệp. Ứng dụng bao gồm:

- **Video Call** cho các cuộc tư vấn trực tiếp
- **Chat Thời Gian Thực** được tích hợp với hệ thống đặt lịch
- **Trợ Lý AI** hỗ trợ tư vấn tức thì
- **Quản Lý Gói Dịch Vụ** và khám phá
- **Xác Thực An Toàn** với làm mới token tự động
- **Thông Báo Đẩy** qua Firebase
- **Hệ Thống Thanh Toán** với lịch sử giao dịch
- **Hồ Sơ Chuyên Gia** với chứng chỉ và thống kê hiệu năng

---

## ✨ Tính Năng

### Cho Người Dùng
- 🔍 Tìm kiếm và khám phá gói dịch vụ và chuyên gia
- 📞 Đặt lịch video call tư vấn
- 💬 Chat thời gian thực với chuyên gia
- 🤖 Trợ lý chat hỗ trợ AI
- ❤️ Hệ thống yêu thích và đánh giá
- 📊 Lịch sử giao dịch và phương thức thanh toán (VNPAY, PayPal, Momo, Chuyển khoản)
- 🔔 Thông báo đẩy cho đặt lịch và tin nhắn

### Cho Chuyên Gia
- 📦 Tạo và quản lý gói dịch vụ
- 📋 Quản lý chứng chỉ và bằng cấp
- 📈 Thống kê hiệu năng và lịch sử lương
- 🎯 Phân tích khách hàng tiềm năng
- 💰 Theo dõi thanh toán và thu nhập

---

## 🛠 Tech Stack

### Khung Phát Triển Frontend
- **React Native** 0.81.4 - Framework phát triển ứng dụng di động đa nền tảng
- **Expo** 54.0.10 - Nền tảng phát triển và công cụ
- **Expo Router** 6.0.8 - Định tuyến dựa trên file (tương tự Next.js)
- **React Navigation** 7.1.17 - Quản lý điều hướng

### UI & Styling
- **React Native Paper** - Thư viện thành phần Material Design
- **Tailwind CSS** (qua plugin Prettier) - CSS tiện ích
- **Lucide React Native** - Thư viện biểu tượng
- **Expo Linear Gradient** - Nền gradient

### Quản Lý Trạng Thái & Dữ Liệu
- **TanStack React Query** 5.90.6 - Quản lý trạng thái máy chủ
- **AsyncStorage** - Lưu trữ phiên cục bộ
- **SecureStore** (expo-secure-store) - Lưu trữ mã hóa cho dữ liệu nhạy cảm

### Giao Tiếp Thời Gian Thực
- **CometChat UI Kit** 5.2.3 - SDK chat và video call
  - CometChat Chat SDK 4.0.16
  - CometChat Calls SDK 4.4.0
- **Socket.IO** - Sự kiện thời gian thực qua WebSocket

### Tích Hợp Backend
- **Axios** 1.12.2 - HTTP client với interceptors
- Kiến trúc ba dịch vụ:
  - **API Gateway** (cổng 8080) - Xác thực, đặt lịch, người dùng, gói dịch vụ
  - **Chat Service** (cổng 8081) - Tin nhắn và WebSocket
  - **Socket Service** (cổng 8082) - Sự kiện thời gian thực

### Xác Thực & Bảo Mật
- **Firebase Authentication** - Thông báo đẩy
- **Quản Lý JWT Token** - Làm mới tự động với hàng đợi yêu cầu
- **Lưu Trữ An Toàn** - Lưu trữ thông tin xác thực được bảo vệ

### Công Cụ Phát Triển
- **TypeScript** - Kiểm tra loại
- **ESLint** - Chất lượng mã (Expo flat config)
- **Prettier** - Định dạng mã
- **React DevTools** - Gỡ lỗi
- **Expo Application Services (EAS)** - Xây dựng và gửi ứng dụng

---

## 🚀 Bắt Đầu

### Yêu Cầu Hệ Thống
- **Node.js** 16+ và npm
- **Expo CLI** (cài đặt toàn cục hoặc qua npx)
- **Android Studio** (cho trình giả lập Android) hoặc **Xcode** (cho iOS simulator)
- **Git**
- **Expo Go** (ứng dụng di động để test trực tiếp)

### Cài Đặt

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd ISeeYou
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường**
   
   Dự án bao gồm `scripts/ensure-env.js` tự động sao chép `.env.example` sang `.env` khi chạy lần đầu. Bạn cũng có thể tạo `.env` thủ công:

   ```bash
   cp .env.example .env
   ```

   Sau đó cập nhật `.env` với cấu hình của bạn:
   ```bash
   # thay 'localhost' với IP của máy chủ nếu cần thiết
   # Backend Services (Tự động cập nhật IP cục bộ khi khởi động)
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
   EXPO_PUBLIC_CHAT_BASE_URL=http://localhost:8081
   EXPO_PUBLIC_AI_BASE_URL=http://localhost:8081
   EXPO_PUBLIC_SOCKET_PORT=8082
   EXPO_PUBLIC_SOCKET_URL=http://localhost:8082
   EXPO_PUBLIC_CHAT_PORT=8081
   
   # CometChat Configuration
   EXPO_PUBLIC_COMETCHAT_APP_ID=your_app_id
   EXPO_PUBLIC_COMETCHAT_REGION=us
   EXPO_PUBLIC_COMETCHAT_AUTH_KEY=your_auth_key
   EXPO_PUBLIC_COMETCHAT_VARIANT_ID=your_variant_id
   
   # Firebase Configuration (trong app.json hiện tại)
   # Xem app.json cho EXPO_PUBLIC_FIREBASE_* variables
   ```

   > **Ghi Chú:** Trên trình giả lập Android, `scripts/update-local-ip.js` tự động chuyển `localhost` → `10.0.2.2` (Android VM gateway)

### Chạy Ứng Dụng

#### Chạy với Expo Go (Cách Nhanh Nhất)

>Lưu ý: Một số công nghệ được dùng không hỗ trợ Go (vd: Firebase Cloud Messaging) nên cách này chỉ nên dùng khi muốn app được chạy nhanh nhất có thể. 

**Expo Go** là ứng dụng di động cho phép bạn test ứng dụng Expo mà không cần xây dựng native. Đây là cách nhanh nhất để bắt đầu:

1. **Tải Expo Go**
   - **iOS:** Tải từ [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - **Android:** Tải từ [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Khởi động Expo development server**
   ```bash
   npx expo start
   ```

3. **Mở Expo Go và quét QR code**
   - Sau khi chạy `npx expo start`, một mã QR sẽ xuất hiện trong terminal
   - Mở Expo Go trên điện thoại của bạn
   - Nhấn "Scan QR code" (iOS) hoặc quét bằng camera (Android)
   - Ứng dụng sẽ tải và chạy trực tiếp trên điện thoại của bạn

4. **Công phím trong Expo Go:**
   - Lắc điện thoại để mở menu
   - Reload: Làm mới ứng dụng
   - Hot Reload: Cập nhật code tự động (nếu bật)
   - Fullscreen: Chế độ toàn màn hình

**Ưu điểm của Expo Go:**
- ✅ Không cần máy ảo Android hoặc Xcode
- ✅ Chạy trực tiếp trên điện thoại thực
- ✅ Phát triển nhanh với Hot Reload
- ✅ Dễ dàng chia sẻ với team

#### Development Server (Terminal Interactive)
```bash
npm start
```
Sau đó nhấn:
- `a` - Mở trong trình giả lập Android
- `i` - Mở trong iOS simulator
- `w` - Mở trong trình duyệt web
- `j` - Mở trong Expo Go (Android)
- `r` - Reload ứng dụng
- `m` - Bật/tắt menu

#### Android Emulator
```bash
npm run android
```
Tự động chạy thiết lập môi trường và mở trình giả lập Android.

#### iOS Simulator
```bash
npm run ios
```
Yêu cầu macOS. Tự động chạy thiết lập môi trường và mở iOS simulator.

---

## 🏗 Kiến Trúc

### Kiến Trúc Ba Dịch Vụ

```
┌─────────────────────────────────────────────────────┐
│ Ứng Dụng Di Động (React Native) + Web (Expo Router) │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   API Gateway   Chat Service  Socket Service
   (cổng 8080)   (cổng 8081)   (cổng 8082)
   /core/**      /chat/**      WebSocket
                 /admin/**     socket.io
```

### Luồng Xác Thực
```
1. Đăng nhập → API.post('/core/auth/login')
2. Response: { token, refreshToken, userId, role, cometChatUid }
3. Lưu trong SecureStore (authToken, refreshToken, userRole, userId, cometChatUid)
4. Khởi tạo CometChat user qua bootstrapCometChatUser()
5. Request interceptor tự động thêm: Authorization: Bearer {token}
6. Khi 401: Làm mới token → Hàng đợi các yêu cầu chờ → Thử lại
```

### Cấu Trúc Thư Mục
```
src/
├── app/                    # Expo Router pages (định tuyến dựa trên file)
│   ├── _layout.tsx         # Root layout, CometChat init, xử lý auth
│   ├── (tabs)/             # Tab bar screens
│   └── auth.tsx, chat.tsx, etc.
├── screens/                # Screen components (được import bởi routes)
├── services/               # API services
│   ├── api.js              # Axios instances + interceptors
│   ├── cometchat.ts        # CometChat initialization
│   ├── aiChat.ts           # AI chat SSE streaming
│   └── ...
├── contexts/               # React Context providers
│   └── CallContext.tsx     # Quản lý trạng thái video call
├── components/             # Thành phần UI tái sử dụng
├── constants/              # Màu, chủ đề, hằng số
├── hooks/                  # Custom React hooks
├── utils/                  # Hàm tiện ích
├── types/                  # Định nghĩa loại TypeScript
└── polyfills/              # Polyfills (NativeEventEmitter)
```

### Các Pattern Chính

#### Request Interceptor
```typescript
// Tự động thêm auth token vào yêu cầu
headers.Authorization = `Bearer ${authToken}`;

// Bỏ qua auth cho các endpoint công khai
if (config.skipAuth) delete headers.Authorization;
```

#### Response Interceptor
```typescript
// Khi 401: Làm mới token và thử lại
if (error.response.status === 401) {
  // 1. Làm mới token qua /core/auth/refresh
  // 2. Hàng đợi các yêu cầu chờ
  // 3. Thử lại với token mới
}
```

#### CometChat Initialization
```typescript
// 1. Khởi tạo sớm trong _layout.tsx (không chặn, tồn tại qua Fast Refresh)
initCometChat()

// 2. Khi đăng nhập thành công: Bootstrap user
bootstrapCometChatUser(userId, cometChatUid)

// 3. CallProvider bao bọc toàn bộ ứng dụng để quản lý trạng thái call
```

---

## 💻 Phát Triển

### Các Script Có Sẵn

```bash
# Khởi động development server (menu interactive)
npm start

# Chạy trên trình giả lập Android
npm run android

# Chạy trên iOS simulator (chỉ macOS)
npm run ios

# Chạy phiên bản web
npm run web

# Chạy ESLint
npm run lint

# Đặt lại dự án về trạng thái ban đầu
npm run reset-project
```

### Xây Dựng Cho Release

#### Development Build
```bash
eas build --platform android|ios --profile development
```

#### Production Build (tự động tăng version)
```bash
eas build --profile production
```

#### Gửi Lên App Stores
```bash
eas submit --platform android|ios --profile production
```

### Chất Lượng Mã

- **TypeScript** - Bật strict mode cho tất cả các file
- **ESLint** - Thực thi các tiêu chuẩn mã (Expo flat config)
- **No implicit `any`** - Sử dụng kiểu rõ ràng hoặc generics
- **Base path alias** `@/*` - Ánh xạ tới gốc dự án

### Mẹo Gỡ Lỗi

| Vấn Đề | Giải Pháp |
|--------|----------|
| CometChat init fails | Kiểm tra `EXPO_PUBLIC_COMETCHAT_*` trong `.env` và `app.json` |
| Network timeout | Xác minh `.env` URLs khớp với các dịch vụ backend (gateway, chat, socket) |
| Token refresh loop | Kiểm tra `/core/auth/refresh` response; đảm bảo có trường `token` |
| Call state stuck | Kiểm tra `CallContext` qua React DevTools; xác minh listeners đã được đăng ký |
| Health check warnings | Chạy `runRealtimeSelfCheck()` trong console để chẩn đoán |

---

## 🔐 Tham Chiếu Biến Môi Trường

| Biến | Mục Đích | Ví Dụ |
|------|---------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | API gateway cốt lõi | `http://192.168.1.4:8080` |
| `EXPO_PUBLIC_CHAT_BASE_URL` | Chat service với WebSocket | `http://192.168.1.4:8081` |
| `EXPO_PUBLIC_AI_BASE_URL` | AI chat SSE streaming | `http://192.168.1.4:8081` |
| `EXPO_PUBLIC_SOCKET_PORT` | Socket.io port | `8082` |
| `EXPO_PUBLIC_SOCKET_URL` | Socket.io full URL | `http://192.168.1.4:8082` |
| `EXPO_PUBLIC_COMETCHAT_APP_ID` | CometChat app identifier | (từ CometChat dashboard) |
| `EXPO_PUBLIC_COMETCHAT_REGION` | CometChat region | `us`, `eu`, `in` |
| `EXPO_PUBLIC_COMETCHAT_AUTH_KEY` | CometChat authentication | (từ CometChat dashboard) |
| `EXPO_PUBLIC_COMETCHAT_VARIANT_ID` | CometChat variant | (từ CometChat dashboard) |

> **Ghi Chú Tự Động Cập Nhật:** `scripts/update-local-ip.js` tự động cập nhật các biến `EXPO_PUBLIC_*_BASE_URL` mỗi khi chạy `npm start`, `npm run android`, `npm run ios`, và `npm run web` với địa chỉ IP cục bộ của máy bạn.

---

## 📚 Các Module Chính

### Services
- **`api.js`** - Axios instances cho API Gateway và Chat Service
- **`cometchat.ts`** - CometChat SDK initialization và user bootstrap
- **`aiChat.ts`** - AI chat streaming qua Server-Sent Events (SSE)

### Contexts
- **`CallContext.tsx`** - Quản lý trạng thái video call (idle → connecting → inCall → ended)

### Utilities
- Token refresh với request queueing
- FormData helpers cho multipart uploads
- Date/time formatting với dayjs

---

## 🚦 Các Enum Trạng Thái & Phương Thức Thanh Toán

### Trạng Thái Đặt Lịch
- `PENDING` - Chờ xác nhận
- `CONFIRMED` - Được chuyên gia xác nhận
- `COMPLETED` - Phiên làm việc kết thúc
- `CANCELED` - Bị hủy bởi người dùng hoặc chuyên gia
- `FAILED` - Thanh toán hoặc lỗi hệ thống

### Phương Thức Thanh Toán
- `VNPAY` - Cổng thanh toán Việt Nam
- `PAYPAL` - PayPal
- `MOMO` - Ví điện tử Việt Nam
- `BANK_TRANSFER` - Chuyển khoản ngân hàng trực tiếp

---

## 📞 Hỗ Trợ & Liên Hệ

Để báo cáo lỗi, đặt câu hỏi hoặc đóng góp:
- Kiểm tra [Hướng Dẫn Copilot](./.github/copilot-instructions.md) để biết chi tiết kiến trúc
- Xem [Tài Liệu Expo](https://docs.expo.dev/) cho các câu hỏi cụ thể về framework
- Kiểm tra [Tài Liệu CometChat](https://www.cometchat.com/docs/) cho các tính năng thời gian thực

---

## 📄 Thành viên dự án

- 23520540 - Tăng Minh Hoàng
- 23520582 - Võ Phi Hùng
- 23520975 - Nguyễn Đình Hoài Nam

---

**Cập Nhật Lần Cuối:** Tháng 12 2025 | Expo 54.0 | React Native 0.81 | React 19
