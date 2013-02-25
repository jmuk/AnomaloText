function MenuHandler(editor) {
    this.editor = editor;
    this.registerListeners();
    window.fileListUpdated = this.updateFileList.bind(this);
};

MenuHandler.prototype.openWindow = function() {
    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.openWindow();
    });
};

MenuHandler.prototype.saveFile = function() {
    var editor = this.editor;
    chrome.fileSystem.chooseEntry(
        {type: 'saveFile'},
        function(entry) {
            editor.saveFile(entry);
        }
    );
};

MenuHandler.prototype.openFile = function() {
    var editor = this.editor;
    chrome.fileSystem.chooseEntry(
        {type: 'openWritableFile'},
        function(entry) {
            editor.openFile(entry);
        }
    );
};

MenuHandler.prototype.mainCommands = {
    'menu-open-window': MenuHandler.prototype.openWindow,
    'menu-save-file': MenuHandler.prototype.saveFile,
    'menu-open-file': MenuHandler.prototype.openFile
};

MenuHandler.prototype.registerListeners = function() {
    var menu = document.getElementById('filelist-menu').getElementsByTagName('LI');
    for (var i = 0; i < menu.length; i++) {
        var li = menu[i];
        var anchor = li.getElementsByTagName('A')[0];
        anchor.addEventListener('click', this.onClicked.bind(this));
    }
};

MenuHandler.prototype.updateFileList = function(fileList) {
    var menu = document.getElementById('filelist-menu');
    var menuItems = menu.childNodes;
    var dividerIndex = -1;
    for (var i = 0; i < menuItems.length; i++) {
        var menuItem = menuItems[i];
        if (menuItem.nodeType == document.ELEMENT_NODE &&
            menuItem.classList.contains('divider')) {
            dividerIndex = i;
            break;
        }
    }
    if (dividerIndex >= 0) {
        while (menu.childNodes.length >= dividerIndex)
            menu.removeChild(menu.lastChild);
    }

    if (fileList.length > 1) {
        var divider = document.createElement('li');
        divider.className = 'divider';
        menu.appendChild(divider);
        for (var i = 0; i < fileList.length; i++) {
            var file = fileList[i];
            var li = document.createElement('li');
            li.role = 'presentation';
            var anchor = document.createElement('a');
            anchor.href = '#';
            anchor.role = 'menuitem';
            anchor.tabindex = '-1';
            anchor.id = 'menu-filehandler-' + file.id;
            anchor.textContent = file.getName();
            anchor.addEventListener('click', this.onClicked.bind(this));
            li.appendChild(anchor);
            menu.appendChild(li);
        }
    }
};

MenuHandler.prototype.onClicked = function(ev) {
    var id = ev.target.id;
    var fileMatch = /menu-filehandler-(.*)/.exec(id);
    if (fileMatch) {
        var editor = this.editor;
        chrome.runtime.getBackgroundPage(function(bgPage) {
            bgPage.switchBufferTo(editor, fileMatch[1]);
        });
    } else {
        if (id in this.mainCommands)
            this.mainCommands[id].bind(this)();
        else
            console.log('unkown command: ' + id);
    }
};

