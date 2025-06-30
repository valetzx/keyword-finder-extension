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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightKeywordsInText(text, keys) {
  let html = escapeHtml(text);
  for (const key of keys) {
    if (!key) continue;
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    html = html.replace(regex, '<mark>$&</mark>');
  }
  return html;
}

// 主流程：读取 URL、关键字列表、抓取页面并搜索
document.getElementById('runBtn').addEventListener('click', async () => {
  const urlFiles = document.getElementById('urlFile').files;
  const keyFiles = document.getElementById('keyFile').files;
  let urls, keys;

  if (urlFiles.length) {
    urls = await readLines(urlFiles[0]);
    localStorage.setItem('urls', JSON.stringify(urls));
  } else {
    urls = JSON.parse(localStorage.getItem('urls') || '[]');
  }

  if (keyFiles.length) {
    keys = await readLines(keyFiles[0]);
    localStorage.setItem('keys', JSON.stringify(keys));
  } else {
    keys = JSON.parse(localStorage.getItem('keys') || '[]');
  }

  if (!urls.length || !keys.length) {
    alert('请先选择 url.txt 和 key.txt');
    return;
  }
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = '';

  document.getElementById('progressContainer').hidden = false;

  let processed = 0;
  const total = urls.length;

  for (const url of urls) {
    processed++;
    updateProgress(processed, total, '正在处理 URL');
    console.log(`Fetching (${processed}/${total}):`, url);
    try {
      const res = await fetch(url);
      const html = await res.text();
      console.log('Fetched:', url);

      // 提取文本节点并搜索关键字
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let node;
      const textNodes = [];
      while (node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        if (text) textNodes.push({ node, text });
      }

      for (const key of keys) {
        console.log(`Searching for keyword '${key}' in ${url}`);
        if (!key) {
          console.warn('关键字为空，请检查 key.txt 文件格式');
          continue;
        }
        let found = false;
        for (const { node, text } of textNodes) {
          const pos = text.indexOf(key);
          if (pos !== -1) {
            found = true;
            const parentEl = node.parentElement;
            const contentText = parentEl ? parentEl.textContent.trim() : text;
            const fragment = `#:~:text=${encodeURIComponent(key)}`;
            const anchor = url + fragment;
            console.log(`Found '${key}' in content:`, contentText);
          const row = document.createElement('tr');
          row.innerHTML = `
              <td>${highlightKeywordsInText(contentText, keys)}</td>
              <td><a href="#" class="direct-link">直达</a></td>
              <td><a href="${url}" target="_blank">${url}</a></td>
            `;
          tbody.appendChild(row);
          const link = row.querySelector('.direct-link');
          link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof chrome !== 'undefined' &&
                chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ highlightData: { url, keys } }, () => {
                if (chrome.tabs && chrome.tabs.create) {
                  chrome.tabs.create({ url: anchor });
                } else {
                  window.open(anchor, '_blank');
                }
              });
            } else {
              window.open(anchor, '_blank');
            }
          });
            break;
          }
        }
        if (!found) console.warn(`Keyword '${key}' 未在 ${url} 找到。`);
      }
    } catch (e) {
      console.error(`抓取失败 (${url}):`, e);
    }
  }

  updateProgress(total, total, '完成');
  console.log('全部处理完成');
});

// 清除缓存
document.getElementById('clearCacheBtn').addEventListener('click', () => {
  localStorage.removeItem('urls');
  localStorage.removeItem('keys');
  alert('已清除缓存');
});

// 页面加载时检查缓存
document.addEventListener('DOMContentLoaded', () => {
  const hasCache = localStorage.getItem('urls') && localStorage.getItem('keys');
  if (hasCache) {
    document.getElementById('progressContainer').hidden = false;
    document.getElementById('status').textContent = '已加载缓存，可直接运行';
  }

  if (location.hash === '#inTab') {
    document.body.style.width = 'auto';
    const table = document.querySelector('table');
    if (table) table.style.width = 'auto';
  }

  const btn = document.getElementById('inTabBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const url = (typeof chrome !== 'undefined' &&
                   chrome.runtime && chrome.runtime.getURL)
                   ? chrome.runtime.getURL('popup.html#inTab')
                   : 'popup.html#inTab';
      if (typeof chrome !== 'undefined' &&
          chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else {
        window.location.href = url;
      }
    });
  }
});

