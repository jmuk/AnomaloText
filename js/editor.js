var editors = [];
(function() {
function loadFile(filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState != XMLHttpRequest.DONE)
            return;
        callback(xhr.responseText);
    };
    xhr.send();
}

function onFileLoaded(contents) {
    var model = new EditorModel(contents);
    var view = new EditorView(contents);
    editors.push(new EditorController(model, view));
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