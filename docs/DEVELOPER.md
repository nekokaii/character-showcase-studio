# 开发交接说明

## 构建及依赖

使用 Node.js 18+ 执行 `node tools/build.mjs`。构建只读取文件夹内部的源码、字体和运行时，无需安装 npm 依赖。`tools/prepare-vendor.py` 是可选的供应商资源刷新脚本，需要联网；它不是常规构建或预览所必需的。

`tools/sync-source.mjs <目录>` 用于从本项目的其他开发副本刷新 `src/`，交接后可不使用。它不会修改输入目录。

## 模块地图

| 源文件 | 主要职责 |
| --- | --- |
| `exploration-full-template.html` | 预览画布、全局及方案控件、基本样式 |
| `exploration-full-logic.js` | 参数默认值、验证与恢复、表单绑定、统一绘制、图片读取 |
| `studio-workspace.js` | 将现有控件组织为三栏编辑器，管理视觉方案、窄屏页签、专注预览和画布自适应 |
| `studio-workspace.css` | 编辑器外壳、表单、三栏滚动与窄屏布局；样式限制在 `.studio-editor` 下 |
| `studio-output.js` / `.css` | 可调片头、输出弹窗、纯画面与导出页模式 |
| `timeline.js` | 可变片头的叙事时间映射、阶段保持与展示循环 |
| `story-intro.js` / `.css` | 双镜头海报片头、对角文案、独立素材与确定性的特效覆盖层 |
| `exploration-full-scene.js` | 基础场景、几何绘制及背景 |
| `urban-language-scene.js` | `district / tuner / arcade` 三套都市街头方案的调色板、推荐几何与动态背景 |
| `urban-language-styles.css` | 三套都市街头方案的字体排版、切形、横竖屏和信息互换规则 |
| `design-language-scene.js` | 时尚、前卫、毛绒、松弛、可爱及纸片方案绘制 |
| `design-language-styles.css` | 不同设计语言的文字及信息排版 |
| `dual-language-scene.js` | 双画面方案的几何与场景逻辑 |
| `dual-language-styles.css` | 双画面排版、横竖屏及互换规则 |
| `dual-language-markup.html` | 双画面额外装饰和信息结构 |
| `studio-geometry.js` | 可切换的几何方案 |
| `motion-clock.js` | 不重置的环形、文字、边框动画时钟 |
| `information-motion.js` | 文字入场及轻微持续动态 |
| `variant-codec.js` | `tuple-v1` 方案参数编码及默认值重建；与配置验证分离 |
| `badge-assets.json` | 标识目录及嵌入素材 |
| `badge-assets/` | 可检查或替换的徽章原始图形和来源说明 |

构建脚本在约定的标记位置插入这些模块。添加新文件时，需同步更新构建入口；不要在生成后的大文件中继续维护业务逻辑。

## 编辑器结构

`exploration-full-logic.js` 创建各方案视图后，通过 `mountStudioWorkspace(root, views)` 组织编辑界面，之后继续绑定原始表单控件。`tools/build.mjs` 分别在 `/* STUDIO_WORKSPACE */` 和 `/* STUDIO_WORKSPACE_STYLES */` 插入新增脚本与样式。

桌面界面由 `.studio-header` 和 `.studio-layout` 构成。布局使用 260 像素左栏、弹性中央预览和 280 像素右栏，左右面板独立滚动。根节点使用 `.studio-editor` 与 `100dvh`，中央画布根据可用宽高计算 `--preview-width`，保持横屏 16:9 或竖屏 9:16。

- `.studio-content`：所有方案共用的作品资料。系列管理独立放在最上方，三个系列以按钮切换；系列名称、编号与短句在其下折叠编辑。其余分组为角色与品牌、角色图片、交付格式与适配标识、作品链接与条码。
- `.studio-canvas-toolbar`：视觉方案选择与前后切换、画幅、信息边框、文字信息开关；`.studio-preview` 保留当前方案画布，`.studio-playback` 提供播放、片头、展示页、互换、时间轴及全局速度。
- `.studio-inspector`：当前视觉方案的配色与字体、圆环与几何、动态背景、文字动效、标识、阴影、滤镜和角色图大小。双画面控制仅出现在双画面方案；信息边框文字及滚动控制仅在启用边框时显示。

原始 `.viz-carousel` 在挂载时改为 `.studio-views`，方案切换由工作台管理，不再使用旧轮播导航。`.studio-views` 和活动 `section[data-design]` 使用 `display: contents` 让预览与检查器参与外层网格；非活动方案通过 `hidden` 隐藏。

工作台迁移真实表单节点，保留原 ID、数据属性和已有监听器，避免复制出多套同 ID 控件。系列选择器只有一个，三个系列按钮同步这一份状态。播放速度和边框控件也各保留一份，切换方案时移动到当前播放区与检查器。

窗口宽度小于 1120 像素时，使用「作品内容 / 画面预览 / 画面样式」页签；初次进入默认为预览。专注模式隐藏左右设置，中央预览跨全部列；退出按钮或 Esc 恢复。编辑器尺寸与样式不应侵入 `.design-art` 内部的作品排版。

## 配置与资产

当前配置结构为 `character-explorations` 版本 6，作用域如下。

| 作用域 | 数据 |
| --- | --- |
| 全局共用 | `activeDesign`、角色名字、当前系列、品牌、署名、交付格式、徽章列表、二维码链接、横竖屏、边框及滚动、互换、播放与文字信息开关 |
| 按系列 | `seriesData.atelier / fur / mini` 中的系列名称、编号前缀、作品编号、中文短句与英文短句 |
| 按视觉方案 | `variants[design]` 中的配色、字体、背景、几何大小与速度、标识外观、文字动效、滤镜与投影；双画面方案另存分区比例与画面指引 |
| 按视觉方案 × 系列 | `variants[design].geometryBySeries[series]`，只区分所选几何样式，不表示其他视觉参数也按系列保存 |

`activeDesign` 默认是 `couture`，写入同一份版本 6 状态快照。恢复时只接受已注册的方案键；旧快照缺少该字段时使用默认方案，不需迁移原有系列或效果参数。UI 的方案选择器与实际显示视图由此字段同步。徽章背景、文字颜色、透明度和展示方式均可自定义。

浏览器保存由外层运行时代理，沙盒内部通过状态接口发送 JSON。数据上限为 16 KiB；新增参数时应测量包含 `modelContent` 与 `privateContent` 的完整快照。0.8.8 使用下述 `tuple-v1` 编码后，生产默认快照为 9,523 字节，所有文字填满上限的快照为 11,035 字节。恢复逻辑兼容早期探索版及旧 Studio 配置。不要直接把整个 DOM 或图片 Base64 写入当前状态。

0.9.0 新增双镜头字段后，生产默认完整快照为 10,493 字节，文字上限快照为 12,005 字节。独立输出的十三方案长文、自定义颜色及小数时间边界为展开 16,883 字节、`tuple-v1` 编码后 8,284 字节；宿主的 16 KiB 上限仍保持校验。

图片由用户选择后在当前会话读取，未加入持久化项目。后续正式产品应建立资产 ID、文件引用和项目打包机制。上传内容不应被当成脚本执行。

## 动效及响应式

叙事时间轴负责片头与展示阶段；连续时钟负责环形、文字与边框动态。片头重播及循环切换时应保持几何运动连贯，调整速度不应造成相位跳动。二维码及条码避免持续位移，以保持可扫描性。

新排版需验证 16:9、9:16、左右互换、长角色名、全部标识及二维码同时启用、窄屏控制区。保留减少动态偏好与播放暂停控制。

## 沙盒与运行时

### 独立输出实现

`state.introDuration` 为 0–30 秒，旧配置默认 4.5 秒；`state.output` 保存 `resolution / transparent / includeCharacters / start / fit / fps / aeIntro`。仍使用版本 6 的可选字段，完整快照保持在 16 KiB 内。

旧片头的叙事绘制通过 `studioNarrativeTime` 映射到原有 4.5 秒片头；双镜头模式通过 `studioStoryPose` 使用各镜头局部时间。实际时间轴长为 `introDuration + studioShowDuration(narrative) + 已启用的片尾时长`。改变片头或展示长度保留所在阶段的相对进度，连续几何、文字、边框时钟不重置。`studioAdvanceTime` 区分无片尾的持续展示与重复展示、自动片尾和手动片尾：持续展示只播放一次引入及信息入场，独立时钟继续；重复或手动待命时只循环展示段，自动模式在设定展示时长后进入片尾。

纯画面通过 `.is-clean-output` 隐藏编辑外壳；透明模式移除背景填充，保留几何画布。各场景绘制入口接收 `transparent`，不要隐藏承载圆环的 `.background-treatment` 整层。

既有 MessageChannel 新增 `studio-output-export / studio-output-result`：`standalone-host-bridge.js` 检查按钮用户激活并发送参数和图片，`standalone-shell.js` 交给 `studio-output-host.js` 打包。外层仅使用构建时可信的 iframe 模板，不接受沙盒传入 HTML。

打包器限制状态 16 KiB；`studio-output.js` 的 `htmlPayload` 对状态克隆使用与持久化相同的 `tuple-v1` 编码，再交给外层宿主，避免十三套方案、长文和高精度时间使展开对象超限。独立输出由同一 `restore` 路径展开并验证，编码不修改编辑器内存中的状态。仅接收 PNG/JPEG/WebP Base64 图片，每张编码长度不超过 18 MiB。JSON 中 `<` 转义；保留原 CSP 和沙盒。输出初始 globals 包含 `studioOutput` 和 `studioImages`，持久化模式为 `none`，不会覆盖工作台参数。原生 Spout2 在 OBS 插件中实现。

`tests/check-output.cjs` 验证可变片头、素材选择、输入边界、脚本转义、横竖屏及透明模式下十三套方案的背景填充。输出文件是快照，不包含项目回导或实时同步。

完整页面采用外层壳与 `sandbox="allow-scripts"` iframe，保留原 CSP。构建会用随包资源替换模板和运行时中的 CDN 引用，并内嵌所有必要运行时、库、图标、拉丁字体及中文圆体；常规预览无需联网。中文圆体单独放在 `assets/fonts/rounded-cn.css`，不受 `prepare-vendor.py` 刷新拉丁字体影响；来源及许可见 `assets/fonts/CHILL-ROUND.md`。外层运行时负责本地状态回执、主题及高度适配；当前方案导航与编辑器布局由 `studio-workspace.js` 管理。

如果今后改为常规网页框架，可重构这层适配，但不要直接取消沙盒和 CSP。改变安全边界属于独立开发事项，应单独审查。

## 建议验证

每次修改后至少重新构建，检查控制台、所有方案可切换、输入即时更新、刷新可恢复参数、时间轴暂停与变速、横竖屏、双画面两张图片、边框滚动和徽章显示。AE 导出实现与可编辑性范围见 `AE-EXPORT.md`。

## OBS 与 AE 导出包

`runtime/export-packages.js` 仅接收校验后的场景数据，不从 iframe 接收脚本或 HTML。OBS 包包含纯页面、浏览器源场景集合模板及只在解压目录写入配置的准备脚本。准备脚本不改动正在运行的 OBS。

AE 在沙盒内按固定输出尺寸测量一次 DOM，使用生产 Canvas 绘图器采样几何，再恢复编辑器测量、时钟及文字动效。耗时素材处理完成后用户再点击下载，保证 MessageChannel 下载仍由用户操作触发。导出字体和图层效果限制见 AE-EXPORT.md。

`fit=contain` 使用完整显示；`fit=cover` 在纯输出视图中使用 max(width,height*ratio) 铺满，超出部分裁切；编辑模式仍为完整显示。

## 0.9.0 双镜头海报片头

新增 `narrative.introStyle = 'story'`，新项目默认使用。已保存的 v6 `model / title` 选择继续恢复；原有十三套设计及其控件不受影响。`studioStoryDuration(narrative)` 统一计算双镜头片长，`state.introDuration` 在 story 模式下始终由镜头开关、各自时长与过渡设置派生，旧快照中的独立片头长度不能覆盖该结果。`studioStoryPose(time, intro, narrative)` 是可拖动、可暂停、可重播的纯姿态函数，不能使用一次性事件驱动镜头切换。

新增配置仍随 v6 的 `narrative` 保存：

| 字段 | 用途与初始值 |
| --- | --- |
| `characterShotEnabled / authorShotEnabled` | 两个镜头独立开关，初始均开启 |
| `characterShotDuration / authorShotDuration` | 各镜头时长，初始 2.5 / 2 秒 |
| `storyTransitionDuration` | 镜头过渡时长，初始 0.6 秒 |
| `characterCorner / authorCorner` | 对角排版，初始 `tl-br / tr-bl` |
| `characterEffect / authorEffect` | `none / crt / holo / polar`，初始 `polar` |
| `characterEffectStrength / authorEffectStrength` | 各镜头效果强度，初始 0.3 |
| `characterEffectSpeed / authorEffectSpeed` | 各镜头效果速度，初始 0.7 |
| `storyPackagingOnly / storyFlash` | 仅包装 / 可选闪光，初始均关闭 |
| `characterScale / authorScale` | 图片缩放，初始 1.15 / 1.25 |
| `characterX / characterY / authorX / authorY` | 图片位置百分比，初始 55 / 50 / 45 / 50 |

前两幕只呈现对应镜头及轻量对角文案，主展示信息、模型层与圆环不应提前露出；第三幕进入原有展示页。连续环形、文字和边框时钟继续独立累积，即使前两幕隐藏也不通过重置时钟实现切换。关闭的镜头不占时长，两个镜头均关闭时直接展示；启用的镜头时长限制为 0.5–12 秒，过渡限制为 0.15–3 秒。保留减少动态偏好、任意时刻 seek 与原有片尾行为。

`src/story-intro.js` 及对应样式承载两幕海报。`studioPaintStoryEffect(ctx,w,h,{effect,time,strength,speed,accent,dark})` 以镜头局部时间确定扫描 / 全息 / 偏振覆盖层，同输入必须绘制同一结果，不依赖帧序、随机状态或 CSS 动画时钟；`none` 或零强度不绘制特效。强度和速度与两张素材分别配置。

`images.introCharacter / images.introAuthor` 是两张单独的会话素材，与 `model / portrait` 分离。允许 12 MB 以内 PNG/JPEG/WebP，不将图片 Base64 写入持久化状态。未上传专用图片时，角色镜头按主角色图、补充图回退，作者镜头按补充图、主角色图回退；没有图片时仍保留文字包装。HTML / OBS 使用原有 `tuple-v1` 参数快照并在导出包中携带所选图片；`includeCharacters:false` 排除全部四张角色/镜头图片，`storyPackagingOnly:true` 单独排除两张镜头图。宿主打包器与沙盒侧都应执行相同过滤；独立页 `start:'show'` 从派生的片头末端开始。

AE 在 `scene.story.shots` 保存各镜头独立的时间、素材与文案，导入后分别生成 `07 INTRO CHARACTER` 与 `08 INTRO CREATOR` 海报预合成。主合成控制器的 `Character / Author Shot Start / Duration` 可分别调节；展示与信息开始跟随最后镜头的结束时间，并保留手动偏移。`Character / Author Effect Strength / Speed` 独立调节简化的原生特效；复杂网页覆盖层与素材着色不逐像素复制。每个镜头的文字、图片与覆盖层可继续编辑，信息边框始终保留在主合成的独立图层中。

回归由 `check-story-intro.cjs`、`check-motion-state.cjs` 和 `check-output.cjs` 覆盖纯时间姿态、旧配置迁移、新字段往返、派生时长、素材不持久化、图片过滤及独立输出恢复；既有十三方案和 AE 检查继续执行。

## 0.8.8 都市街头设计与紧凑状态

新增三套独立方案，总数从 10 套增至 13 套：`district`「街区 · 超频档案」、`tuner`「映像 · 午夜频道」、`arcade`「潮玩 · 弹性街角」。选择器以「街头二游 · 新增」和「原有方案」两个 `optgroup` 展示；默认活动方案仍为 `couture`。三个新增方案分别注册在 `variantDefaults / languageKeys / languageNotes`，拥有独立的字体、颜色、标识、阴影、环速及背景默认值；作品与系列内容继续共用原来的作用域。

`urban-language-scene.js` 提供 `urbanLanguagePalette(variant, dark)` 与 `paintUrbanLanguage(ctx, w, h, t, variant, settings)`。`paintExploration` 优先分派到该模块；仅 `signature` 使用专属几何，选择其他环形时返回原有通用绘制路径。街区采用分段机械环，午夜频道采用调频椭圆轨道，弹性街角采用不规则圆角玩具环。三者是原创几何与字体排版，不打包《绝区零》或其他游戏的官方 Logo、角色、界面截图及字体资产。

`urban-language-styles.css` 接在既有设计样式之后，为新增方案提供各自的排版、切形、竖屏和互换规则。新增设计沿用全部共享控件、信息边框、片头片尾、独立连续时钟、1080p / 4K 逻辑尺寸、OBS 输出及 AE 原生几何采集。圆环从片头就按 `ringTime` 运动，背景使用独立的 `t` / `gridMoving` 时钟；推荐几何保持固定拓扑并记录 `studioIntroTransform`，使 AE 的持续运动与可编辑过渡继续分离。

为了容纳十三套完整设置，v6 快照增加可选标记 `privateContent.variantEncoding = 'tuple-v1'`，状态版本仍为 6。运行中的 `state.variants` 始终保留可读对象结构，只有保存时编码：

```js
snapshot.variantEncoding = 'tuple-v1';
snapshot.variants = encodeStudioVariants(state.variants);
// 恢复时，在既有字段验证前展开：
expanded = decodeStudioVariants(source.variants, variantBaseline);
```

`src/variant-codec.js` 的每个方案是固定顺序的 51 槽数组：27 个主字段、16 个 `effects` 字段、5 个 `shadows` 字段及 3 个 `geometryBySeries` 字段。缺失的可选值明确写 `null`。该位置协议只可在末尾追加；更换既有槽的意义或顺序必须使用新的编码标记。不要依赖对象键的枚举顺序生成协议。

带标记的快照从初始化后捕获的 `variantBaseline` 深拷贝重建，再覆盖已知非 `null` 标量，因此另一份配置省略的设置不会继承当前会话修改。未知方案、未来追加槽以及非标量槽被忽略；展开结果仍经过原有枚举、颜色、数值范围验证。无标记的 v6 及更早版本继续按旧的对象格式恢复，保留旧局部配置的合并语义。

`ownSnapshots` 保存实际发送的编码快照签名，而不是运行中展开对象的签名。`stateSignature` 递归排序对象键、保留数组顺序，因此宿主重排 JSON 键后的自身回执不会触发配置恢复或重建连续时钟。新增字段时同时更新协议及回归测试，尤其要检查旧对象迁移、编码快照默认值复原、全部方案修改与最大长度文字的容量。

`tests/check-variant-codec.cjs` 验证十三方案的编码往返、默认值隔离、可选槽、未知数据与不执行输入；`tests/check-urban-designs.cjs` 验证三个方案的稳定路径拓扑、环速和背景独立时钟、片头运动、透明、配色与阴影开关、深浅背景、横竖屏和互换。已有输出、几何采集、自适应运动及 AE 过渡回归均包含十三方案。

## 0.8.7 老电视关机与 AE 过渡时间

`runtime/crt-motion.js` 提供 ES3 语法的 `studioCRTPose(progress)`。`tools/build.mjs` 将同一份可信函数分别放入网页时间轴之前及 AE 导入模板的 `/* CRT_MOTION_FUNCTION */` 标记，AE 表达式再嵌入该函数正文。包络只依赖进度，不使用随机状态或一次性事件，拖动、暂停、重播可得到相同结果。返回 `shutter / signal / signalWidth / dot / dotScale / flash / scan / jitter / flicker`，分别控制栅格闪烁、纵向坍缩、横向亮线、中央荧光点及余晖。黑色遮片只关闭舞台区域，持续边框依然独立。

AE 原生过渡与持续几何运动分离。`src/ae-export.js` 以 `introProgress:1` 采样已经落位的连续几何；绘图器通过 recorder 专用的可选 `studioIntroTransform / studioIntroOpacity / studioIntroRotation` 标记记录片头变换，普通 Canvas 绘制不受这些接口影响。每个 geometry operation 可附带：

```js
introTransform: { from: [x, y], to: [x, y], scale: 1.44, rotation: degrees },
introOpacity: 0.24
```

`from / to` 是录制矩阵转换后的合成坐标，`rotation` 可选且单位为度。局部旋转分支需要将锚点偏移与镜像方向一并转换，避免 Couture 局部构件在片头绕错中心。记录器的 save / restore 同步保存标记；静态切形不应继承圆环标记。双页分界元素使用独立的初始透明度倍率。`src/export-layout.js` 仅按输出倍率缩放 `from / to`，角度、缩放比、透明度和时间不缩放；`runtime/export-packages.js` 校验所有新字段。

AE 模板中，采样 Path、Stroke Width、Group Opacity 通过同属性 `valueAtTime` 读取连续运动时间。路径仍保留 0.8.4 的自适应采样及 LINEAR 插值。整个 GEOMETRY 预合成不再使用 Time Remap：原生矢量组 Anchor / Position / Scale / Rotation 在未重映射的合成时间上计算片头姿态，因此修改过渡长度不会改变环内持续运动速度。`Geometry Speed=0` 只冻结持续运动，位置和大小过渡仍会推进。

导出场景 `narrative` 可包含 `transitionStart / transitionDuration / infoDuration / endingTransitionDuration`，单位均为输出合成秒数。缺省值分别为片头长度的 `1/6`、`0.8`、`.85 / speed`、`min(.8 / speed, ending.duration * .28)`；旧数据未提供时回退这些默认值。AE 的信息和片尾开始时间直接从片头、展示、片尾安排初始化。

| AE CONTROLS | 驱动范围 |
| --- | --- |
| `Show Transition Start / Duration` | 片头几何原生变换、原版大字片头的名字位置和缩放 |
| `Information Start` | 模型先行信息入场及名字显示基准；延迟名字保留其相对提前量 |
| `Information Fade Duration / Title Fade Duration` | 信息和模型先行名字的淡入长度；大字片头信息仍按条目错峰 |
| `Ending Start / Ending Transition Duration` | 展示退场与品牌入场，所有品牌元素在同一交叉过渡区间内完成 |
| `Geometry Speed` | 采样几何的持续运动时间，不重映射上述过渡 |
| `Cyber Shutdown / Shutdown Duration` | 主合成末端的老电视关机；原生遮片、扫描线、光束、亮点和余晖可单独编辑 |

开始时间限制在主合成范围内，过渡长度最短为一帧。`INTRO / SHOWCASE / ENDING / CYBER SHUTDOWN` markers 仅是初始说明，不参与表达式求值。时间滑杆不自动修改主合成、预合成和素材图层总长度；增加完整片长应重新导出，或由用户同步修改相关合成和图层。关机保持锚定主合成末端，提前片尾开始不会将关机一起前移。具体用户操作见 `AE-EXPORT.md`。

## 0.8.6 无片尾持续展示

`timeline.js` 的 `showPlayback` 是 `continuous`（默认）或 `repeat`。`studioContinuousShow` 仅在关闭片尾时生效。持续模式把叙事进度限制在展示段末端，`advanceMotionClock` 仍逐帧递增，避免信息入场随定时循环重置，也避免无限增长的叙事时间。编辑器和独立输出的暂停 / 恢复判断排除此模式；显式重播、拖动时间轴仍按原逻辑处理。时间读数取独立时钟，显示 `∞`。

AE 继续导出有限的 `showDuration`，无需修改 AE 插值或合成逻辑。新设置随既有 v6 状态保存，未包含该字段的旧配置默认持续模式；所有显式重复和品牌片尾流程保留。

## 0.8.5 斜切标题避让

`src/exploration-full-logic.js` 的 `fitPosterCopy` 在 `fitText` 后执行，仅作用于 `poster`。它将名字及 `::before` / `::after` 的局部矩形按 CSS 变换投影到未动画的标题布局坐标，加入阴影和动效余量后向下避让中文、英文短句。每次测量先清除上次的内联偏移，不累加位移，不读取当前动画的包围盒。竖屏标题高度约束在 `src/exploration-full-template.html` 中。AE 采集仍经过同一 `measure` 路径，无额外 AE 专用位置补丁。

## 0.8.4 AE 圆环插值修复

- `src/ae-geometry-motion.js` 取代固定 0.5 秒采样。每个区间核对 1/4、1/2、3/4 时刻的曲线；偏差超过 0.25 逻辑像素时，只细分需要加密的操作，最短区间为四分之一帧。误差包含绝对贝塞尔控制点、描边宽度及透明度；精确保留采样时间。
- 保留静止区间的首尾，防止后续运动向静止段倒灌；不改变原始设计中的尺寸变化。路径拓扑变化明确报错。`ellipse / ell` 的分段取整增加浮点容差，避免整周弧线偶然多出一个顶点。
- 采集期间保存并暂停播放状态，结束后恢复；每 32 次采集让出事件循环，不等待后台标签页可能暂停的动画帧。
- AE 路径、透明度、描边宽度显式使用 LINEAR 插值。描边宽度可随片头大小过渡变化，且 4K 成比例缩放。
- 每组路径采样上限增至 16384；48 MiB 场景数据上限保留。`scene.json` 取消深层缩进，避免密集数据被排版空白放大至 ZIP 单文件上限。旧数据未提供采样描边时仍回退固定描边。
- 新增真实绘图器的运动误差回归，并在本机 AE 对浏览器生成的工程核对非关键帧形状；详见 `RING-MOTION-QA.md`。

## 0.8.3 展示时长与赛博关机

- 角色名不再自动附加句号，保留用户输入的文字。
- `narrative.showDuration` 为 1–60 秒，旧状态默认 12。总时长、段落切换、手动循环、片尾快捷键、输出摘要与 AE 均引用同一设置。`studioRetimeShow` 保留展示中的相对进度及片尾偏移，不重置连续几何时钟。
- `shutdownEnabled / shutdownDuration` 控制片尾最后一段关机，默认开启、0.8 秒；时长限定 0.3–1.5 秒且不超过片尾 45%。`studioNarrativePose` 纯函数产生可拖动、可重播的收束姿态。
- 网页中央区域用上下黑色遮片关闭，品牌压扁并短暂偏移，亮线缩为点后消失；信息边框持续显示。AE 将遮片和亮线建为独立原生形状图层，提供开关和时长控制，尺寸按逻辑分辨率缩放。
- AE 最大合成时长 204 秒（30+60+12，以 0.5× 播放），此版本每组几何最多 410 个采样（0.8.4 已提高）；场景 48 MiB 总量限制保留。旧导出数据缺失关机字段时默认关闭，保持旧工程行为。
- 回归覆盖时长边界、循环、重定时、状态保存、输入校验、关机开关和任意时刻拖动。浏览器导出的横屏 1080p 与竖屏 4K 工程通过本机 AE 结构、表达式和渲染检查，见 `SEQUENCE-QA.md`。

## 0.8.2 持续边框与独立 AE 图层

- 网页边框不再绑定 `pose.info` / `pose.outro` 的透明度，所有片头与片尾样式下均从开始显示至结束。滚动时钟保持原逻辑。
- AE 主合成中每侧边框分为原生形状底板与文字预合成，明确命名 `BORDER TOP/BOTTOM/LEFT/RIGHT · background/text`。图层覆盖整个合成时长，位于片尾动画之上，不使用内容淡入淡出表达式。
- 边框文字预合成内，以 `Border copy · EDIT THIS` 为唯一编辑源，滚动副本的 Source Text 表达式引用它。
- 生产叙事渲染器的回归测试覆盖所有片头、片尾样式和阶段。

## 0.8.1 分辨率与排版独立

- `src/export-layout.js` 统一逻辑尺寸：横屏 1920×1080，竖屏 1080×1920。输出尺寸只决定整体缩放与像素密度。
- 纯画面 DOM 始终按逻辑尺寸布局，用整体 transform 适配视口；Canvas 使用未变换尺寸绘制，并提高 backing store 密度。禁止将变换后的 DOM 边界再次送入布局测量。
- AE 采集先在逻辑尺寸测量，再缩放所有坐标、字号、描边、圆角、图标、形状及其动画采样。路径与采样可能共享引用，缩放函数必须创建新数组。
- AE 模板中的程序化图案、边框字体、信息位移和片尾描边也按输出倍率计算。颜色、透明度、时间和速度不缩放。
- `tests/check-resolution.cjs` 检查横竖屏、完整显示 / 铺满、共享路径、空间字段往返以及真实 measure 函数的高分辨率 Canvas 行为。
- 实际浏览器导出 1080p / 4K AE 包的 scene 数据逐项通过精确两倍对照；本机 AE 均成功导入并渲染，两组表达式检查通过。参见 `RESOLUTION-QA.md`。

## 0.8.0 叙事动画

`state.narrative` 保存片头类型、名字淡入时机、片尾开关 / 时长 / 样式 / 内容 / 触发方式。`src/timeline.js` 提供纯时间函数，`src/studio-narrative.js` 和 `.css` 管理编辑控件与品牌落版。时间轴可拖动，所有叙事动画都由当前时间计算，不依赖一次性 CSS animation。圆环仍使用独立不归零的运动时钟。

片尾关闭时沿用原来的展示循环；自动模式在展示 12 秒后播放片尾，手动模式跨展示边界时循环，点击片尾或纯输出按 E 才进入。片尾末尾停住，再次播放从头开始。AE 始终生成有限段落，不保留网页无限循环语义；品牌合成与原生表达式位于 runtime/ae-import-template.jsx。具体检查记录见 NARRATIVE-QA.md。
