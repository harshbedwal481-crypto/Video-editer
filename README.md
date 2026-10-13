# ClipForge Studio — starter project

A free, browser-first video-editor prototype with a dark/light theme, video import/preview, trim-range export, text overlay, optional music input, and an experimental chroma-key control.

## Important limitations
- This is a starter prototype, not a finished VN-equivalent editor.
- Animated keyframes, multi-track compositing, undo/redo, projects, transitions, and reliable audio mixing are not implemented yet.
- Chroma-key behavior depends on the FFmpeg core build and filter support; test it before relying on it.
- Export runs on the user's device and can be slow or fail on phones with limited memory.
- FFmpeg.wasm is large and may need to be self-hosted for production. Check all FFmpeg and codec licensing obligations before distributing.
- Do not use VN's name, logo, assets, or exact UI. ClipForge is a placeholder name; check trademark availability before commercial use.

## Run locally
Install Node.js 22+ and a recent npm, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production website build:

```bash
npm run build
```

Upload the contents of `dist/` to your static hosting provider (for example, Netlify).

## Build an Android APK
Android APK compilation requires Android Studio/Android SDK and a compatible Java/Gradle setup. This ZIP does not contain a compiled APK.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, allow Gradle sync to finish, then choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The debug APK is normally created under `android/app/build/outputs/apk/debug/`.

For a website that already has an Android folder, do not run `npx cap add android` a second time.

## Privacy
Video and audio files are processed in the browser. The FFmpeg engine is downloaded from a CDN on first export in this prototype. For production, consider self-hosting dependencies and adding a clear privacy notice.
