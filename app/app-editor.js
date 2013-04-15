var AppEditor;

(function() {
     
// TODO: move mode to background page and run from fileHandler.
var modeHandler = new ModeHandler('../modes/');

AppEditor = function(fileHandler) {
    this.fileHandler = fileHandler;
    this.model = new EditorModel(modeHandler.getMode(fileHandler.getName()));
    this.controller = new EditorController(this.model);
    fileHandler.addBuffer(this);
    this.fileHandler.updateIndicator();
    // TODO: allow multiple editors in a window.
    this.id = window.editorWindowId;
    this.metadata = new MetadataManager(this.controller, this.model);

    this.controller.registerKeybind(new AppKeybind(this));
    this.menuHandler = new MenuHandler(this);
};

AppEditor.prototype.onFileLoaded = function(fileHandler) {
    this.fileHandler = fileHandler;
    this.syncFileHandler();
};

AppEditor.prototype.syncFileHandler = function() {
    this.fileHandler.updateIndicator();
    this.model.setMode(modeHandler.getMode(this.fileHandler.getName()));
    this.controller.onFileLoaded(this.fileHandler);
    updateFileList();
};

AppEditor.prototype.onModeLoaded = function(newMode) {
    this.metadata.onModeChanged(newMode);
};

AppEditor.prototype.saveFile = function(fileEntry) {
    this.fileHandler.saveToEntry(fileEntry, (function() {
        this.model.setMode(modeHandler.getMode(fileHandler.getName()));
        this.fileHandler.updateIndicator();
    }).bind(this));
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