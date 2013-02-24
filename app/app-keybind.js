function AppKeybind(fileHandler, editor) {
    function openNewWindow(bgPage) {
        if (fileHandler.empty()) {
            chrome.fileSystem.chooseEntry(
                {type: 'openWritableFile'},
                function(entry){
                    fileHandler.setFileEntry(entry);
                });
        } else {
            bgPage.openWindow();
        }
    }
    function saveFile(bgPage) {
        if (!fileHandler.fileEntry) {
            chrome.fileSystem.chooseEntry(
                {type: 'saveFile'},
                function(entry) {
                    fileHandler.saveToEntry(entry, function() {});
                });
        }
    }
    function openNewFileAndWindow(bgPage) {
        chrome.fileSystem.chooseEntry(
            {type: 'openWritableFile'},
            function(entry){
                bgPage.openNewFileAndWindow(entry);
            });
    }
    this.executor = {
        'openNewWindow': openNewWindow,
        'saveFile': saveFile,
        'openNewFileAndWindow': openNewFileAndWindow
    };
};

AppKeybind.prototype = Object.create(Keybind.prototype);

AppKeybind.prototype.execInternal = function(method_name, args) {
    var executor = this.executor;
    if (method_name in executor) {
        chrome.runtime.getBackgroundPage(function(bgPage) {
            executor[method_name](bgPage, args);
        });
    }
};

AppKeybind.prototype.commands = {
    'C-o': 'openNewWindow',
    'C-s': 'saveFile',
    'C-S-o': 'openNewFileAndWindow'
};