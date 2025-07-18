# Keyword Finder Extension

该扩展从给定的 URL 列表中抓取页面，在文本中搜索关键字并生成结果表格。表格包含以下列：

1. **日期** – 如果找到指向详情的链接，会在后台抓取该链接页面，从带有“发布”字样的段落中提取日期；若未找到则显示文本片段中的日期（如有）。
2. **文本内容** – 命中关键字周围的文本片段。
3. **详情** – 在链接页面中搜索所有包含“2025”的文本并截取显示，若有多处将全部列出。
4. **转到** – 生成的可点击链接，指向文本片段所在的页面或详情页面。
5. **来源域名** – 当前处理页面的域名。

使用方法：

1. 准备 `url.txt` 和 `key.txt`，分别为要抓取的地址列表与关键字列表。
2. 在扩展弹出页中可设置页数，默认值为 1。当 URL 中包含 `\${pageNub}` 时，会按页数展开为多个地址。
3. 选择两个文件并点击“运行”。
4. 处理完成后，结果将显示在表格中，可点击“下载 CSV”保存结果。
