var AppEditor;

(function() {
     
// TODO: move mode to background page and run from fileHandler.
var modeHandler = new ModeHandler('../modes/');

AppEditor = function(fileHandler) {
    this.fileHandler = fileHandler;
    this.backend = new AppModelBackend(fileHandler);
    this.model = new EditorModel(
        this.backend, modeHandler.getMode(fileHandler.getName()));
    this.controller = new EditorController(this.model);
    fileHandler.addBuffer(this);
    this.backend.updateIndicator();
    // TODO: allow multiple editors in a window.
    this.id = window.editorWindowId;

    this.controller.registerKeybind(new AppKeybind(this));
    this.menuHandler = new MenuHandler(this);
};

AppEditor.prototype.onFileLoaded = function(fileHandler) {
    console.log(fileHandler);
    this.fileHandler = fileHandler;
    this.backend.updateFileHandler(fileHandler);
    this.model.setMode(modeHandler.getMode(fileHandler.getName()));
    this.controller.onFileLoaded(fileHandler);
};

AppEditor.prototype.saveFile = function(fileEntry) {
    this.fileHandler.saveToEntry(fileEntry);
};

AppEditor.prototype.openFile = function(fileEntry) {
    var editor = this;
    if (this.fileHandler.empty()) {
        chrome.runtime.getBackgroundPage(function(bgPage) {
            bgPage.loadFile(fileEntry, editor);
        });
    } else {
        chrome.runtime.getBackgroundPage(function(bgPage) {
            bgPage.openNewFile(fileEntry, editor);
        });
    }
};

})()