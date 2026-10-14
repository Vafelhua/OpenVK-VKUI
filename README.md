# OpenVK (VKUI)

Клиент OpenVK на React + VKUI с интерфейсом в стиле VK 6.17. Целевое устройство: iPhone 6 / iOS 12.5.

## Возможности

- Вход по логину/паролю через OAuth `openvk.org/token`
- Лента (`newsfeed.get`)
- Сообщения и чаты (`messages.*`)
- Друзья (`friends.get`, `friends.getRequests`)
- Сообщества (`groups.get`, `groups.search`)
- Музыка (`audio.get`, `audio.search`, `audio.getRecommendations`, `audio.getCatalog`)
- Профиль, лайки (`likes.add/delete`)

API: `https://api.openvk.org/method/` (v5.106). HTTP-запросы идут через CapacitorHttp с User-Agent `okhttp/4.9.0` (обход Anubis и CORS).

## Сборка IPA

CI: GitHub Actions (`.github/workflows/build.yml`) собирает unsigned IPA.

1. Запушьте репозиторий на GitHub
2. Actions → Build iOS IPA → Run workflow
3. Скачайте артефакт `OpenVK-vkui-unsigned-ipa`

Локально (macOS + Xcode):

```bash
npm install
npm run build
npx cap sync ios
cd ios/App && pod install
xcodebuild -workspace App.xcworkspace -scheme App -sdk iphoneos -configuration Release \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO build
```

## Установка

Unsigned IPA подписывается через AltStore / Sideloadly / ESign.

- Bundle ID: `org.openvk.vkui`
- Минимум: iOS 12.0

## Стек

- React 18 + VKUI 7
- Vite
- Capacitor 4 (iOS 12)
- @capacitor-community/http
