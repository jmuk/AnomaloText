var url;
function onLaunched() {
    chrome.app.window.create('app/editor.html');
}

chrome.app.runtime.onLaunched.addListener(onLaunched);
