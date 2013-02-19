var url;
var defaultParams = {
    minWidth: 640,
    minHeight: 400
};
function onLaunched() {
    chrome.app.window.create('app/editor.html', defaultParams);
}

chrome.app.runtime.onLaunched.addListener(onLaunched);
