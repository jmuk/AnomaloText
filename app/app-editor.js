var AppEditor;

(function() {
     
// TODO: move mode to background page and run from fileHandler.
var modeHandler = new ModeHandler('../modes/');

AppEditor = function(fileHandler) {
    this.fileHandler = fileHandler;
    this.editId = fileHandler.editId;
    this.model = new EditorModel(modeHandler.getMode(fileHandler.getName()));
    this.controller = new EditorController(this.model);
    fileHandler.on('change', this.updateIndicator, this);
    fileHandler.on('fileLoad', this.syncFileHandler, this);
    this.updateIndicator();
    // TODO: allow multiple editors in a window.
    this.id = window.editorWindowId;
    this.metadata = new MetadataManager(this.controller, this.model);
    modeHandler.on('load', this.metadata.onModeChanged, this.metadata);

    this.controller.registerKeybind(new AppKeybind(this));
    this.menuHandler = new MenuHandler(this);
};

AppEditor.prototype.setFileHandler = function(fileHandler) {
    if (this.fileHandler == fileHandler)
        return;
    this.editId = null;
    if (this.fileHandler) {
        this.fileHandler.off('change', this.updateIndicator, this);
        this.fileHandler.off('fileLoad', this.syncFileHandler, this);
    }
    this.fileHandler = fileHandler;
    this.fileHandler.on('change', this.updateIndicator, this);
    fileHandler.on('fileLoad', this.syncFileHandler, this);
    this.syncFileHandler();
};

AppEditor.prototype.recordFileEditId = function() {
    this.editId = this.fileHandler.editId;
};

AppEditor.prototype.syncFileHandler = function() {
    this.updateIndicator();
    var newMode = modeHandler.getMode(this.fileHandler.getName());
    this.model.setMode(newMode);
    this.metadata.onModeChanged(newMode);
    if (this.editId != this.fileHandler.editId)
        this.controller.onFileLoaded(this.fileHandler.content);
    updateFileList();
};

AppEditor.prototype.saveFile = function(fileEntry) {
    this.fileHandler.saveToEntry(fileEntry, (function() {
        var newMode = modeHandler.getMode(fileHandler.getName());
        this.model.setMode(newMode);
        this.metadata.onModeChanged(newMode);
        this.updateIndicator();
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

AppEditor.prototype.updateIndicator = function() {
    var fileName = this.fileHandler.getName();
    if (this.fileHandler.edited)
        fileName += '*';
    document.getElementById('indicator').textContent = fileName;
};

})()