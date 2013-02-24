var editor = null;
(function() {
// TODO: move mode to background page and run from fileHandler.
var modeHandler = new ModeHandler('../modes/');

function createEditor(fileHandler) {
    var backend = new AppModelBackend(fileHandler);
    var model = new EditorModel(backend, modeHandler.getMode(fileHandler.getName()));
    editor = new EditorController(model);
    fileHandler.addBuffer(editor);

    editor.registerKeybind(new AppKeybind(fileHandler, editor));
}

function windowOnLoad() {
    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.registerWindow(window, createEditor);
    });
}

window.addEventListener('load', windowOnLoad);
})();
