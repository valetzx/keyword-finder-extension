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

// 从目标链接中提取发布时间和包含"2025"的片段
async function fetchDetails(link) {
  try {
    const res = await fetch(link);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const dateRegex = /\d{4}[年\/\-\.][0-1]?\d[月\/\-\.][0-3]?\d(?:日)?/;
    let date = '';
    let detail = '';

    // 查找含有"发布"字样的元素以获得日期
    const pubElems = Array.from(doc.querySelectorAll('p,div,span,section,article'));
    for (const el of pubElems) {
      const txt = el.textContent.trim();
      if (txt.includes('发布')) {
        const m = txt.match(dateRegex);
        if (m) {
          date = m[0];
          break;
        }
      }
    }

    // 搜索包含"2025"的文本片段
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim();
      const idx = text.indexOf('2025');
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + 4 + 150);
        detail = text.slice(start, end);
        break;
      }
    }

    return { date, detail };
  } catch (e) {
    console.error('获取详情失败', e);
    return { date: '', detail: '' };
  }
}

// 主流程：读取文件，抓取页面，查找关键字并插入表格
// 如果地址栏带有 #intab，则放宽页面宽度限制
document.addEventListener('DOMContentLoaded', () => {
  if (location.hash === '#intab') {
    document.body.classList.add('intab');
  }
});

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

        const sourceDomain = new URL(url).hostname;

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
        for (const [idx, { node, text }] of textNodes.entries()) {
          const pos = text.indexOf(key);
          if (pos !== -1) {
            foundForKey = true;
            console.log(`Found keyword '${key}' at position ${pos} text node ${idx}`);

            const snippetStart = Math.max(0, pos - 50);
            const snippetEnd = Math.min(text.length, pos + key.length + 150);
            const snippet = text.slice(snippetStart, snippetEnd);

            const dateMatch = snippet.match(dateRegex);
            let date = dateMatch ? dateMatch[0] : '';

            let link = '';
            const linkElem = node.parentElement.closest('a');
            if (linkElem) link = linkElem.getAttribute('href');

          const fullLink = link ? new URL(link, url).href : '';

          let detailText = '';
          if (fullLink) {
            const info = await fetchDetails(fullLink);
            if (info.date) date = info.date; // 使用链接页面中的日期覆盖
            detailText = info.detail;
          }

            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${date}</td>
              <td>${snippet.replace(/</g, '&lt;')}</td>
              <td>${detailText.replace(/</g, '&lt;')}</td>
              <td>${fullLink ? `<a href="${fullLink}" target="_blank">链接</a>` : ''}</td>
              <td>${sourceDomain}</td>
            `;
          tbody.appendChild(row);
          }
        }
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