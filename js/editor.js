var editors = [];

(function() {
var modeHandler = new ModeHandler('./modes/');

function loadFile(filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState != XMLHttpRequest.DONE)
            return;
        callback(filename, xhr.responseText);
    };
    xhr.send();
}

function onFileLoaded(filename, contents) {
    var model = new EditorModel(
	new ModelBackend(), modeHandler.getMode(filename));
    var lines = contents.split('\n');
    editors.push(new EditorController(model));
    model.setContents(lines);
}

function windowOnLoad() {
    loadFile('/editor/main.py', onFileLoaded);
}

window.addEventListener('load', windowOnLoad);
})();

function onFontActive() {
    for (var i = 0; i < editors.length; i++) {
        editors[i].updateHeight();
    }
}