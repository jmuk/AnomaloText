var editor = null;

function onModeLoaded(mode) {
    editor.onModeLoaded(mode);
}

(function() {

function createEditor(fileHandler) {
    editor = new AppEditor(fileHandler);
}

function windowOnLoad() {
    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.registerWindow(window, createEditor);
    });
}

window.addEventListener('load', windowOnLoad);
})();
