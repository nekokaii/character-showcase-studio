# 寒蝉全圆体 / ChillRoundF

「圆润」中文使用寒蝉全圆体 v3.200；英文保留 Nunito。原有项目中的 `rounded` 值保持兼容。

- 作者仓库：https://github.com/Warren2060/ChillRound
- 固定来源：https://github.com/Warren2060/ChillRound/releases/download/v3.200/ChillRoundF_v3.200.zip
- 发布包 SHA-256：`7a061e39cc8f377ce122f0ae68d1fe3ef43d78431388362c61ea8d695722d267`
- 许可：SIL Open Font License 1.1，完整原文在 `chill-round-OFL.txt`，构建时也嵌入网页以随 HTML / OBS 输出携带。

`chill-round-f-regular.woff2` 与 `chill-round-f-bold.woff2` 分别直接转换自发布包中的 `ChillRoundFRegular.otf` 和 `ChillRoundFBold.otf`，保留原始完整字符集、字形轮廓与字体命名，未按样例文案裁剪。CSS 字重 400 / 700；其他字重由浏览器选择最接近的字面。内置中文字体会让页面增大约 8.8 MB，但使用时不需要联网下载。

转换使用 FontTools 4.67.0（含 Brotli），可在解压目录重现：

```python
from fontTools.ttLib import TTFont

for source, target in [
    ('ChillRoundFRegular.otf', 'chill-round-f-regular.woff2'),
    ('ChillRoundFBold.otf', 'chill-round-f-bold.woff2'),
]:
    font = TTFont(source)
    font.flavor = 'woff2'
    font.save(target)
```

`tools/build.mjs` 将字体及其许可嵌入网页，视频渲染复用这些字形。首次切换完成字体加载后会重新测量展示页和片头文字。AE 的原生可编辑文字需要用户安装发布包中的桌面字体；导入脚本优先匹配 `ChillRoundFRegular / ChillRoundFBold`，缺失时报告替代情况并回退。

验证：`node tests/check-rounded-font.mjs` 通过 Chrome 实际字形来源检查（CDP）确认中文使用 ChillRoundF、英文使用 Nunito，并检查字重、横竖屏、片头、项目 JSON 恢复与离线渲染。
