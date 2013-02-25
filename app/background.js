var defaultParams = {
    minWidth: 640,
    minHeight: 400
};

var fileHandlers = {};

var appWindows = {};

var menus = [];

var lastOpenedAppWindow;
var newId = 0;

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
    var fileHandler = new FileHandler();
    fileHandlers[fileHandler.id] = fileHandler;
    fileHandler.addBuffer(editor);
    fileHandler.setFileEntry(fileEntry);
    updateFileList();
};

function loadFile(fileEntry, editor) {
    editor.fileHandler.setFileEntry(fileEntry);
    updateFileList();
}

function createEmptyFileBuffer(callback) {
    var fileHandler = new FileHandler();
    fileHandlers[fileHandler.id] = fileHandler;
    callback(fileHandler);
    updateFileList();
}

function openWindow(callback) {
    if (!callback)
        callback = createEmptyFileBuffer;

    function onCreated(appWindow) {
        newId++;
        lastOpenedAppWindow = appWindow;
        appWindows[newId] = appWindow;
        appWindow.onRegistered = callback;
    };
    var params = {};
    for (var k in defaultParams) {
        params[k] = defaultParams[k];
    }
    params.id = String(newId);
    chrome.app.window.create('app/editor.html', params, onCreated);
};

function openNewFileAndWindow(fileEntry) {
    var fileHandler = new FileHandler();
    function newFileAndWindowCallback(callback) {
        callback(fileHandler);
        fileHandler.setFileEntry(fileEntry);
        fileHandlers[fileHandler.id] = fileHandler;
        fileListUpdated();
    }
    openWindow(newFileAndWindowCallback);
};

function registerWindow(w, callback) {
    if (lastOpenedAppWindow &&
        lastOpenedAppWindow.contentWindow == w) {
        w.editorWindowId = newId;
        lastOpenedAppWindow.onRegistered(callback);
        return;
    };
  for (var id in appWindows) {
      var appWindow = appWindows[id];
      if (appWindow.contentWindow == w) {
          w.editorWindowId = id;
          appWindow.onRegistered(callback);
          return;
      }
  }
};

function onWindowClosed(windowId) {
    var buffer = appWindows[windowId];
    delete appWindows[windowId];
    // TODO: reset all resources if |appWindows| is empty.
};

function updateFileList() {
    var fileList = getFileList();
    for (id in appWindows) {
        var appWindow = appWindows[id];
        appWindow.contentWindow.fileListUpdated(fileList);
    }
}

chrome.app.runtime.onLaunched.addListener(onLaunched);
