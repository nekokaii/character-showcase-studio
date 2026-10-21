# Cloudflare 发布

正式地址：https://nekokaii.com/showcase-generator

源码仓库：https://github.com/nekokaii/character-showcase-studio

此项目使用独立 Worker `character-showcase-studio`，只接管上述路径及其子路径。
现有首页、DNS 和 `/studio*` 项目均保留。实际页面及所有运行资源内嵌于单个 HTML；
原有沙盒 iframe 和 CSP 由构建脚本保留。

## 手动更新

在本项目文件夹中，安装 Node.js 18 或更新版本，执行：

```sh
npx wrangler login
npx wrangler deploy
```

部署命令自动重新构建网页，只上传 `dist-cloudflare/index.html`。
GitHub 推送与 Cloudflare 部署是两个独立步骤；当前没有配置自动部署。
交接给其他开发者时，对方需要有对应 Cloudflare 账户的部署权限。
不要把登录令牌或本机 Wrangler 配置提交到仓库。

## 发布时的默认画面

`runtime/startup-defaults.json` 保存发布预设，来源是本地工作台导出的 HTML 中的纯配置 JSON。
构建只嵌入参数，不执行导出文件中的代码，也不改变沙盒或 CSP。
当前预设包括 Kgg / Studio-K、街区超频档案、上下边框、深底绯红及片头后处理等完整参数。
上传图片不属于此预设。

更新预设时修改 `widgetState` 并更换 `revision`。每个浏览器遇到新 revision 时应用一次，
随后继续保存用户自己的修改。旧浏览器配置会备份到原存储键后加 `:before-startup-preset`。
仅调整代码而未更换 revision 时，不覆盖用户已保存的参数。

## 单独 HTML 播放

「单独 HTML」从片头开始自动播放角色镜头、作者镜头、展示和已启用的片尾；以各镜头开关与时长为准。
启用的片尾会自动进入，关闭片尾则按展示设置持续运动或重复展示。
OBS 输出包继续遵循直接展示 / 手动片尾设置。导出画面不因系统减少动态效果而停住；编辑器仍尊重该系统偏好。

## 0.16.1 本机剪辑分支的网页发布

本次明确发布 `feature/video-editor-0.16.1` 的当前页面，仍使用原来的 Worker、域名路径和浏览器设置存储键，不涉及首页、DNS 或 `/studio*`。线上提供展示模板编辑及 HTML / OBS / AE 输出；视频导入、音轨和 FFmpeg / GPU 导出由本机 Node 服务运行。线上点击「剪辑工作台」会显示下载与本机入口，不向 Cloudflare 请求本机专用 API，也不从网页跨源调用电脑上的服务。

剪辑版本下载后先运行 `setup-editor.cmd`，再运行 `start-editor.cmd`。素材和本机剪辑工程保存在使用者的电脑上，不随网页部署上传。发布前记录 Worker 的当前版本，可通过 Wrangler 的回滚命令恢复。
