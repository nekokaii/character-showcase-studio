# 第三方代码、字体与图形

请在后续分发中保留对应许可文件和原代码注释。本文件说明来源，不授予额外的商标或官方认证权利。

| 内容 | 来源与许可位置 |
| --- | --- |
| Lucide 1.17.0 | `vendor/lucide.js`；ISC 与部分 Feather 图标 MIT，见 `vendor/LUCIDE-LICENSE.txt` |
| Floating UI Core 1.7.3、DOM 1.7.4 | `vendor/`；MIT，见 `vendor/FLOATING-UI-LICENSE.txt` |
| JsBarcode 3.12.1 | `src/barcode-code128.min.js`；MIT，见 `vendor/JSBARCODE-LICENSE.txt` |
| QR Code Generator | `src/qrcode-generator.js`；MIT，见 `vendor/QRCODE-LICENSE.txt`；作者 Kazuhiko Arase |
| Barlow Condensed、Cormorant Garamond、Manrope、Nunito、Space Grotesk | `assets/fonts/`；SIL Open Font License，见各字体的 `*-OFL.txt` |
| VRCFaceTracking、lilToon、Poiyomi 图形及通用图标 | 具体图形来源、修改方式和使用边界见 `src/badge-assets.json` 与 `src/badge-assets/SOURCE-NOTICES.txt` |
| 独立预览运行时 | 来自此项目原可视化的独立页面导出运行时；保留在 `runtime/` 中及其原始注释 |

下载源的精确地址保存在 `vendor/SOURCES.json`。Noto Sans SC 未打包；中文使用系统字体回退。

MMD Compatible、ARKit Compatible 等通用适配图形不是官方认证徽章。页面中的适配选择由作品作者自行维护，应与实际交付内容一致。
# Local video editor dependencies

The optional local video editor uses Playwright Core (Apache-2.0), installed through npm with its license in `node_modules/playwright-core/LICENSE`. It drives an existing Chrome or Edge browser.

The setup script installs the FFmpeg 9.0.2 Essentials Windows build from Gyan Doshi (GPL-3.0). Its license is retained in `tools/ffmpeg/LICENSE`. Build information and corresponding source: <https://www.gyan.dev/ffmpeg/builds/>, <https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2>, <https://github.com/FFmpeg/FFmpeg>. FFmpeg is an optional executable dependency and is not embedded in the exported HTML.
