var editor = null;

function onModeLoaded(mode) {
    editor.onModeLoaded(mode);
}

function updateFileList() {
    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.updateFileList(window.fileListUpdated);
    });
}

(function() {

function createEditor(fileHandler) {
    editor = new AppEditor(fileHandler);
    updateFileList();
}

function windowOnLoad() {
    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.registerWindow(window, createEditor);
    });
}

function windowOnBlur() {
    if (editor)
        editor.recordFileEditId();
}

function windowOnFocus() {
    if (editor)
        editor.syncFileHandler();
}

window.addEventListener('load', windowOnLoad);
window.addEventListener('blur', windowOnBlur);
window.addEventListener('focus', windowOnFocus);
})();
