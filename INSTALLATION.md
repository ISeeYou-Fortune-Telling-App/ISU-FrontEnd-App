## Prerequisities
- **ISeeYou Backend** (visit https://github.com/ISeeYou-Fortune-Telling-App/ISU-Backend-Production for installation instructions)
- **Node.js** 16+ and npm
- **Git**
- **Expo CLI** (install via `npm install --global expo-cli` or use npx)
- Optional: **Android Studio** (for Android emulator) or **Xcode** (for iOS simulator)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ISeeYou
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   The project includes `.env` as a store of environment variables. You can contact us for the `.env` file, put it in the project folder, then modify it as follows:
   
   ```bash
   # Replace 'localhost' with your host's IPv4 address
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
   EXPO_PUBLIC_AI_BASE_URL=http://localhost:8080
   EXPO_PUBLIC_CHAT_BASE_URL=http://localhost:8080/core
   EXPO_PUBLIC_CHAT_PORT=8081
   EXPO_PUBLIC_SOCKET_URL=http://localhost:8080/socket
   EXPO_PUBLIC_SOCKET_PORT=8082
   
   # CometChat Configuration
   EXPO_PUBLIC_COMETCHAT_APP_ID=app_id
   EXPO_PUBLIC_COMETCHAT_REGION=us
   EXPO_PUBLIC_COMETCHAT_AUTH_KEY=key
   EXPO_PUBLIC_COMETCHAT_VARIANT_ID=id
   ```
   > **Note:** On Android emulators, `scripts/update-local-ip.js` automatically converts `localhost` → `10.0.2.2` (Android VM gateway)

4. **Download & install the app (Android)**
   #### Preview Build
      - Download the APK file from this link: https://drive.google.com/drive/folders/1UWySi4O1KFTQQqKX2bHfB_zalJ1tsDjg
      - Install on your device

   #### Development Build
      - Go to our Git: https://github.com/ISeeYou-Fortune-Telling-App/ISU-FrontEnd-App
      - Under the "Releases" section, look for "ISeeYou EAS Build"
      - Download the APK file (ISeeYou_v0.1_dev.apk)
      - Install on your device

## Running the App

#### Preview Build
- Open the app
- Allow it to send notifications
- It should navigate to the authentication screen. You can register for a customer account or seer account.
- Afterwards, use the OTP code that's mailed to you to verify your account. Then, return to the authentication screen and log in with your new account. You will then see the Home screen.
- Enjoy!

#### Development Build (Terminal)
```bash
npx expo start
```
Your terminal should look something like this:
![Example Terminal](images/example.png)

Then:
- open the Development Build app on your device
- click on "Scan QR Code"
![Example Terminal](images/example_app.jpg)
- and scan the QR code that appears in your terminal.
- After scanning, the app should navigate to the authentication screen. You can register for a customer account or seer account.
- Afterwards, use the OTP code that's mailed to you to verify your account. Then, return to the authentication screen and log in with your new account. You will then see the Home screen.
- Enjoy!

#### Android Emulator
```bash
npm run android
```
Automatically runs environment setup and opens Android emulator.

#### iOS Simulator
```bash
npm run ios
```
Requires macOS. Automatically runs environment setup and opens iOS simulator.

---