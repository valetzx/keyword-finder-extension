# keyword-finder-extension
Chrome extension that searches a list of pages for keywords and generates
direct links using the `#:~:text=` fragment.

When a link with `#:~:text=` is opened, `contentScript.js` now reads the
fragment text and highlights it on the destination page so the keyword
snippet stays visible even after the browser's default highlight fades.
