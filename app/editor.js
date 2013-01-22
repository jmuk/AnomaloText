var editor = null;
(function() {
var modeHandler = new ModeHandler('../modes/');

function onFileLoaded(filename, contents) {
    var model = new EditorModel(contents, modeHandler.getMode(filename));
    editor = new EditorController(model);
}

function windowOnLoad() {
    onFileLoaded('', '');
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
