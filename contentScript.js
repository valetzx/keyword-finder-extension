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

function highlightDocument(keys) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.nodeValue;
    if (text && text.trim()) nodes.push(node);
  }
  for (const n of nodes) {
    const original = n.nodeValue;
    const html = highlightKeywordsInText(original, keys);
    if (html !== escapeHtml(original)) {
      const span = document.createElement('span');
      span.innerHTML = html;
      n.parentNode.replaceChild(span, n);
    }
  }
}

// 从 URL 中解析 :~:text= 片段
function getTextFragment() {
  const match = location.href.match(/#:~:text=([^&]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

if (typeof chrome !== 'undefined' &&
    chrome.storage && chrome.storage.local) {
  chrome.storage.local.get('highlightData', data => {
    const info = data.highlightData;
    if (info) {
      const { url, keys } = info;
      if (url && Array.isArray(keys) && location.href.startsWith(url)) {
        highlightDocument(keys);
        chrome.storage.local.remove('highlightData');
        return;
      }
    }
    const frag = getTextFragment();
    if (frag) highlightDocument([frag]);
  });
} else {
  const frag = getTextFragment();
  if (frag) highlightDocument([frag]);
}

