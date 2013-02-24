var defaultParams = {
    minWidth: 640,
    minHeight: 400
};

var fileHandlers = [];

var buffers = {};

var lastOpenedAppWindow;
var newId = 0;

function onLaunched() {
    openWindow();
}

function getFileNames() {
    var names = [];
    for (var i = 0; i < fileEntries.length; i++) {
        names.push(fileEntries[i].name);
    }
    names.sort();
    return names;
};

function switchBufferTo(fileId, callback) {
    // TBD
};

function createEmptyFileBuffer(callback) {
    var fileHandler = new FileHandler();
    fileHandlers.push(fileHandler);
    callback(fileHandler);
}
function openWindow(callback) {
    if (!callback)
        callback = createEmptyFileBuffer;

    function onCreated(appWindow) {
        newId++;
        lastOpenedAppWindow = appWindow;
        buffers[newId] = appWindow;
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
        fileHandlers.push(fileHandler);
        callback(fileHandler);
        fileHandler.setFileEntry(fileEntry);
    }
    openWindow(newFileAndWindowCallback);
};

function registerWindow(w, callback) {
    if (lastOpenedAppWindow &&
        lastOpenedAppWindow.contentWindow == w) {
        lastOpenedAppWindow.onRegistered(callback);
        return;
    };
  for (var id in buffers) {
      var appWindow = buffers[id];
      if (appWindow.contentWindow == w) {
          appWindow.onRegistered(callback);
          return;
      }
  }
};

function onWindowClosed(windowId) {
    var buffer = buffers[windowId];
    buffers[windowId] = null;
    // TODO: reset all resources if |buffers| is empty.
};

chrome.app.runtime.onLaunched.addListener(onLaunched);
