// 读取文本文件为字符串数组
function readLines(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l);
      resolve(lines);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// 更新进度条和状态文字
function updateProgress(current, total, message) {
  const progressBar = document.getElementById('progressBar');
  const status = document.getElementById('status');
  const percent = total ? Math.floor((current / total) * 100) : 0;
  progressBar.value = percent;
  status.textContent = `${message} (${current}/${total})`;
  console.log(message, current, '/', total);
}

// 主流程：读取文件，抓取页面，查找关键字并插入表格
document.getElementById('runBtn').addEventListener('click', async () => {
  const urlFiles = document.getElementById('urlFile').files;
  const keyFiles = document.getElementById('keyFile').files;
  if (!urlFiles.length || !keyFiles.length) {
    alert('请先选择 url.txt 和 key.txt');
    return;
  }

  const urls = await readLines(urlFiles[0]);
  const keys = await readLines(keyFiles[0]);
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = '';

  const dateRegex = /\d{4}[年\/\-\.][0-1]?\d[月\/\-\.][0-3]?\d(?:日)?/;

  // 显示进度条
  const progressContainer = document.getElementById('progressContainer');
  progressContainer.hidden = false;

  let processed = 0;
  const total = urls.length;

  for (const url of urls) {
    processed++;
    updateProgress(processed, total, `正在处理 URL`);

    console.log(`Fetching (${processed}/${total}):`, url);
    try {
      const res = await fetch(url);
      const html = await res.text();
      console.log(`Fetched:`, url);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 使用 TreeWalker 遍历所有文本节点
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        if (text) textNodes.push({ node, text });
      }

      keys.forEach(key => console.log(`Searching for keyword '${key}' in ${url}`));

      // 对每个关键字检查命中情况
      for (const key of keys) {
        let foundForKey = false;
        if (!key) {
          console.warn(`关键字为空，请检查 key.txt 文件格式`);
          continue;
        }
        textNodes.forEach(({ node, text }, idx) => {
          const pos = text.indexOf(key);
          if (pos !== -1) {
            foundForKey = true;
            const parent = node.parentElement;
            if (!parent.id) parent.id = `elem-${idx}-${Date.now()}`;
            const anchor = url + '#' + parent.id;
            console.log(`Found keyword '${key}' at position ${pos} text node ${idx}`);

            const snippetStart = Math.max(0, pos - 50);
            const snippetEnd = Math.min(text.length, pos + key.length + 150);
            const snippet = text.slice(snippetStart, snippetEnd);

            const dateMatch = snippet.match(dateRegex);
            const date = dateMatch ? dateMatch[0] : '';

            let link = '';
            const linkElem = node.parentElement.closest('a');
            if (linkElem) link = linkElem.href;

            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${date}</td>
              <td>${snippet.replace(/</g, '&lt;')}</td>
              <td>${link ? `<a href="${link}" target="_blank">链接</a>` : ''}</td>
              <td><a href="${anchor}" target="_blank">直达</a></td>
              <td><a href="${url}" target="_blank">${url}</a></td>
            `;
            tbody.appendChild(row);
          }
        });
        if (!foundForKey) {
          console.warn (`Keyword '${key}' 未在 ${url} 找到。可能原因：关键字大小写不匹配或页面结构不同。`);
        }
      }
    } catch (e) {
      console.error(`抓取失败 (${url}):`, e);
    }
  }

  updateProgress(total, total, `完成`);
  console.log('全部处理完成');
});