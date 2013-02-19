var editor = null;
(function() {
var modeHandler = new ModeHandler('../modes/');

function onFileLoaded(entry, contents) {
    console.log(entry);
    var backend = new AppModelBackend(entry, contents);
    var model = new EditorModel(contents, backend, modeHandler.getMode(entry.name));
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
                    onFileLoaded(entry, reader.result);
                };
                reader.readAsText(file, 'utf-8');
            });
        });
}

window.addEventListener('load', windowOnLoad);
})();
