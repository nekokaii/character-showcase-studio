# 内置中文字体

新增三款与系统黑体、寒蝉全圆体具有明显差异的中文字体：

| 字体 | 用途 | 字符覆盖 | WOFF2 大小 |
| --- | --- | --- | --- |
| ZCOOL XiaoWei / 站酷小薇 | 宋体与衬线标题 | 7,016 | 2,632,944 bytes |
| Ma Shan Zheng / 马善政 | 毛笔书法 | 7,015 | 3,250,504 bytes |
| ZCOOL KuaiLe / 站酷快乐 | 活泼手写 | 7,053 | 871,456 bytes |

来源为 Google Fonts 仓库的固定提交 `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`：

- https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zcoolxiaowei
- https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/mashanzheng
- https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/zcoolkuaile

各字体的 SIL Open Font License 原文分别在同目录的 `*-OFL.txt`，也随网页、HTML / OBS 输出嵌入。使用 FontTools 4.67.0 / Brotli 直接将原 TTF 转成 WOFF2，保留完整原始字符集；转换前后已核对 cmap、glyf、hmtx、name 表，没有按示例文字裁剪。

```python
from fontTools.ttLib import TTFont
font = TTFont('ZCOOLXiaoWei-Regular.ttf')
font.flavor = 'woff2'
font.save('zcoolxiaowei.woff2')
```

原 TTF SHA-256：

- 小薇：`a42b620140f493db42f741351dfbf343c0936d58588ee8004b8b2a218d997ff1`
- 马善政：`6d2546bb189c732a8ca29af9e22457b152387d158aa459e4ac2ce1e51788b7fb`
- 快乐：`812a6fc1fe54b6d73a419245c32dfeba8aa33104d5be90d1cf6af082007cb71d`

WOFF2 SHA-256：

- 小薇：`10e1555bfe02869bf7758cf618f6bdc9b7640ca9a90ca687404b303196c72178`
- 马善政：`a38bc5a880e517cfc26a6b8b7dae2e6fe556093fd3fd9b6ebc57e065a51e5f8d`
- 快乐：`e70a49294d6da87550bd86aa6cf6d660966a939a5836c0748e68cdddbf062975`

新增字体均为原始 400 字重；粗体由浏览器模拟。缺少的字符可回退到系统字体。中英衬线选项保留英文 Cormorant，中文优先使用小薇。AE 的原生文字映射到对应 PostScript 字体名，仍需要在桌面安装原字体。

自定义字体单独存入浏览器 IndexedDB，不占用 16 KiB 的展示参数额度。字体二进制随剪辑工程、视频渲染载荷、独立监视和 HTML / OBS 输出携带；工程恢复不会依赖原字体路径。AE 暂不自动安装或打包自定义字体，需用户安装并重新指定。
