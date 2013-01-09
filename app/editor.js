var editors = [];
(function() {
var modeHandler = new ModeHandler('../modes/');

function onFileLoaded(filename, contents) {
    var model = new EditorModel(contents, modeHandler.getMode(filename));
    var view = new EditorView(contents);
    editors.push(new EditorController(model, view));
}

function windowOnLoad() {
    chrome.fileSystem.chooseEntry(
        {type: 'openWritableFile'},
        function(entry){
            entry.file(function(file) {
                var reader = new FileReader();
                reader.onerror = function(e) {
                    console.log('error');
                };
                reader.onloadend = function(e) {
                    console.log(reader.readyState);
                    if (reader.readyState != FileReader.DONE)
                        return;
                    onFileLoaded(entry.name, reader.result);
                };
                reader.readAsText(file, 'utf-8');
            });
        });
}

window.addEventListener('load', windowOnLoad);
})();

function onFontActive() {
    for (var i = 0; i < editors.length; i++) {
        editors[i].updateHeight();
    }
}