function AppKeybind(editor) {
    function openNewFile(bgPage) {
        chrome.fileSystem.chooseEntry(
            {type: 'openWritableFile'},
            function(entry){
                editor.openFile(entry);
            });
    }
    function saveFile(bgPage) {
        chrome.fileSystem.chooseEntry(
            {type: 'saveFile'},
            function(entry) {
                fileHandler.saveToEntry(entry, function() {});
            });
    }
    this.executor = {
        'openNewFile': openNewFile,
        'saveFile': saveFile,
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
    'C-o': 'openNewFile',
    'C-s': 'saveFile'
};