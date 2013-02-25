var AppEditor;

(function() {
     
// TODO: move mode to background page and run from fileHandler.
var modeHandler = new ModeHandler('../modes/');

AppEditor = function(fileHandler) {
    this.backend = new AppModelBackend(fileHandler);
    this.model = new EditorModel(
        this.backend, modeHandler.getMode(fileHandler.getName()));
    this.controller = new EditorController(this.model);
    fileHandler.addBuffer(this);
    this.backend.updateIndicator();

    this.controller.registerKeybind(new AppKeybind(fileHandler));
};

AppEditor.prototype.onFileLoaded = function(fileHandler) {
    this.backend.updateFileHandler(fileHandler);
    this.model.setMode(modeHandler.getMode(fileHandler.getName()));
    this.controller.onFileLoaded(fileHandler);
};

})()