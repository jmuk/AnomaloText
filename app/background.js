var defaultParams = {
    minWidth: 640,
    minHeight: 400
};

var fileHandlers = {};

var menus = [];

var lastOpenedAppWindow;
var newId = 0;

var emptyFileHandler;

function onLaunched() {
    openWindow();
}

function getFileList() {
    var fileList = [];
    for (var id in fileHandlers)
        fileList.push(fileHandlers[id]);
    fileList.sort(function(a, b) { return a.getName().localeCompare(b.getName()); });
    return fileList;
};

function switchBufferTo(editor, fileHandlerId) {
    if (typeof(fileHandlerId) == 'string')
        fileHandlerId = Number(fileHandlerId);
    var fileHandler = fileHandlers[fileHandlerId];
    if (!fileHandler) {
        console.log('cannot find the handler for' + fileHandlerId);
        return;
    }

    editor.fileHandler.detachBuffer(editor);
    fileHandler.addBuffer(editor);
    editor.onFileLoaded(fileHandler);
};

function openNewFile(fileEntry, editor) {
    editor.fileHandler.detachBuffer(editor);
    for (var k in fileHandlers) {
        var fileHandler = fileHandlers[k];
        if (fileHandler.fileEntry &&
            fileEntry.fullPath == fileHandler.fileEntry.fullPath) {
            fileHandler.addBuffer(editor);
            fileHandler.setFileEntry(fileEntry);
            return;
        }
    }

    var fileHandler = new FileHandler();
    fileHandlers[fileHandler.id] = fileHandler;
    fileHandler.addBuffer(editor);
    fileHandler.setFileEntry(fileEntry);
};

function loadFile(fileEntry, editor) {
    if (editor.fileHandler == emptyFileHandler)
        emptyFileHandler = null;
    editor.fileHandler.setFileEntry(fileEntry);
}

function createEmptyFileBuffer(callback) {
    if (emptyFileHandler) {
        callback(emptyFileHandler);
        return;
    }

    var fileHandler = new FileHandler();
    fileHandlers[fileHandler.id] = fileHandler;
    emptyFileHandler = fileHandler;
    callback(fileHandler);
}

function openWindow(callback) {
    if (!callback)
        callback = createEmptyFileBuffer;

    function onCreated(appWindow) {
        newId++;
        lastOpenedAppWindow = appWindow;
        appWindow.onRegistered = callback;
    };
    var params = {};
    for (var k in defaultParams) {
        params[k] = defaultParams[k];
    }
    params.id = String(newId);
    chrome.app.window.create('app/editor.html', params, onCreated);
};

function registerWindow(w, callback) {
    if (lastOpenedAppWindow &&
        lastOpenedAppWindow.contentWindow == w) {
        lastOpenedAppWindow.onRegistered(callback);
    } else {
        createEmptyFileBuffer(callback);
    }
};

function updateFileList(callback) {
    var fileList = getFileList();
    callback(fileList);
}

chrome.app.runtime.onLaunched.addListener(onLaunched);