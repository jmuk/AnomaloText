function EditorController(model, view) {
    this.model = model;
    this.view = view;
    this.model.setView(view);
    this.contentArea = document.getElementById('content-area');
    while (this.contentArea.firstChild)
        this.contentArea.removeChild(this.contentArea.firstChild);
    this.model.addElementsToContents(this.contentArea);
    this.createEventReceiver();
    this.lineHeight = 0;
    this.lineMargin = 0;
    this.updateHeight();
    this.openParen = null;
    this.closeParen = null;
}

EditorController.prototype.updateHeight = function() {
    this.lineHeight = this.contentArea.offsetHeight / this.model.getLineCount();
    this.view.updateHeight();
};

EditorController.prototype.updateCaretIndicator = function() {
    this.view.updateCaretIndicator(this.model.getCaretLocation());
    var caretPosition = this.view.getCaretPosition();
    this.receiverContainer.style.top = caretPosition.top + 'px';
    this.receiverSpacer.style.width = caretPosition.left + 'px';
    this.model.maybeHighlightParens();
    this.view.updateSelection(this.model.getSelection());
};

// TODO: the command list has to be customizable.
EditorController.prototype.commands = {
    'Left': 'moveBackward',
    'Right': 'moveForward',
    'Up': 'movePreviousLine',
    'Down': 'moveNextLine',
    'C-a': 'moveToStartOfLine',
    'C-e': 'moveToEndOfLine',
    'C-x': ['copyToClipboard', 'deleteSelection'],
    'C-c': 'copyToClipboard',
    'C-v': 'pasteFromClipboard',
    'M-f': 'moveNextWord',
    'M-b': 'movePreviousWord',
    'Enter': 'newLine',
    'Backspace': 'deletePreviousChar',
    'Delete': 'deleteNextChar',
    'S-Left': 'moveBackward true',
    'S-Right': 'moveForward true',
    'S-Up': 'movePreviousLine true',
    'S-Down': 'moveNextLine true',
    'M-S-f': 'moveNextWord true',
    'M-S-b': 'movePreviousWord true',
    'Tab': 'incrementIndent',
    'S-Tab': 'decrementIndent'
};

EditorController.prototype.executeCommand = function(commandText) {
    if (!(commandText in this.commands))
        return false;

    var consumed = false;
    // Assumes commandText is a string or an array.
    var command;
    if (typeof(this.commands[commandText]) == 'string') {
        command = [this.commands[commandText]];
    } else {
        command = this.commands[commandText];
    }
    for (var i = 0; i < command.length; i++) {
        var method_name = command[i];
        var args = [];
        if (method_name.indexOf(' ') > 0) {
            var names = method_name.split(' ');
            method_name = names[0];
            args = names.slice(1);
        }
        var method = this.model[method_name];
        if (method) {
            method.apply(this.model, args);
            consumed = true;
        } else {
            console.warn(
                'cannot find method for ' + this.commands[commandText]);
        }
    }
    return consumed;
};

EditorController.prototype.input = function(ev) {
    if (this.receiver.incomposition)
        return false;

    this.model.insertText(this.receiver.textContent);
    ev.preventDefault();
    this.receiver.textContent = '';
    this.updateCaretIndicator();
    return false;
};

EditorController.prototype.keydown = function(ev) {
    // see: https://github.com/jmuk/chrome-skk/blob/master/testpage/mock.js
    var keyMap = {
        8:"Backspace", 9:"Tab", 13:"Enter", 27:"Esc", 32:" ", 33:"PageUp",
        34:"PageDown", 35:"End", 36:"Home", 37:"Left", 38:"Up", 39:"Right",
        40:"Down", 43:"+", 46:"Delete", 48:"0", 49:"1", 50:"2", 51:"3", 52:"4",
        53:"5", 54:"6", 55:"7", 56:"8", 57:"9", 59:";", 61:"=", 65:"a", 66:"b",
        67:"c", 68:"d", 69:"e", 70:"f", 71:"g", 72:"h", 73:"i", 74:"j", 75:"k",
        76:"l", 77:"m", 78:"n", 79:"o", 80:"p", 81:"q", 82:"r", 83:"s", 84:"t",
        85:"u", 86:"v", 87:"w", 88:"x", 89:"y", 90:"z", 96:"0", 97:"1", 98:"2",
        99:"3", 100:"4", 101:"5", 102:"6", 103:"7", 104:"8", 105:"9", 106: "*",
        107:"+", 109:"-", 110:".", 111: "/", 112:"HistoryBack", 113:"HistoryForward",
        114:"BrowserRefresh", 115:"ChromeOSFullscreen", 116:"ChromeOSSwitchWindow",
        117:"BrightnessDown", 118:"BrightnessUp", 119:"AudioVolumeMute",
        120:"AudioVolumeDown", 121:"AudioVolumeUp", 186:";", 187:"=", 188:",",
        189:"-", 190:".", 191:"/", 192:"`", 219:"[",  220:"\\", 221:"]", 222:"'"
    };

    if (this.receiver.incomposition)
        return true;

    function isNormalKey(keyCode) {
        return (keyCode == 32 || keyCode == 43 ||
                (keyCode >= 48 && keyCode <= 111) ||
                (keyCode >= 186 && keyCode <= 192) ||
                (keyCode >= 219 && keyCode <= 222));
    }

    if (isNormalKey(ev.keyCode) && !ev.ctrlKey && !ev.altKey)
        return true;

    var key = keyMap[ev.keyCode];
    if (!key)
        return true;

    var commandText = key;
    if (ev.shiftKey)
        commandText = 'S-' + commandText;
    if (ev.altKey)
        commandText = 'M-' + commandText;
    if (ev.ctrlKey)
        commandText = 'C-' + commandText;

    var consumed = this.executeCommand(commandText);
    this.updateCaretIndicator();
    if (consumed)
        ev.preventDefault();
    return !consumed;
};

// Clear status of focus and enforce it to the edit field.
EditorController.prototype.enforceFocus = function() {
    this.receiver.focus();
    var caretRange = document.createRange();
    caretRange.setStart(this.receiver, 0);
    caretRange.setEnd(this.receiver, 0);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(caretRange);
};

EditorController.prototype.getLocationInContentArea = function(ev) {
    var result = {
        x: ev.pageX - this.editor.offsetLeft + this.editor.scrollLeft,
        y: ev.pageY - this.editor.offsetTop + this.editor.scrollTop
    };
    result.lines = Math.floor(result.y / this.lineHeight);
    return result;
};

/**
 * Creates an invisible div which receives the key events and passes
 * it to the model.
 */
EditorController.prototype.createEventReceiver = function() {
    var receiverContainer = document.createElement('div');
    receiverContainer.style.position = 'absolute';
    receiverContainer.style.zIndex = EditorZIndice.HIDDEN;
    receiverContainer.style.top = '0';
    receiverContainer.style.left = '0';
    receiverContainer.style.width = '100%';
    var receiverSpacer = document.createElement('div');
    receiverSpacer.style.display = 'inline-block';
    receiverSpacer.style.left = '0';
    receiverSpacer.style.top = '0';
    receiverContainer.appendChild(receiverSpacer);
    var receiver = document.createElement('span');
    receiver.style.outline = '0';
    receiver.style.backgroundColor = 'white';
    receiver.contentEditable = true;
    receiver.addEventListener('keydown', this.keydown.bind(this));
    receiver.addEventListener('input', this.input.bind(this));
    receiver.addEventListener('compositionstart', (function(ev) {
        this.receiver.incomposition = true;
        this.receiverContainer.style.zIndex = 
            EditorZIndice.COMPOSITION;
        this.view.hideCaretIndicator();
    }).bind(this));
    receiver.addEventListener('compositionend', (function(ev) {
        this.receiverContainer.style.zIndex =
            EditorZIndice.HIDDEN;
        this.receiver.incomposition = false;
        this.updateCaretIndicator();
    }).bind(this));
    window.onmousedown = (function(ev) {
        this.enforceFocus();
        ev.preventDefault();
        this.mouseSelection = true;
        var loc = this.getLocationInContentArea(ev);
        this.model.startMouseSelection(loc.x, loc.lines);
        this.updateCaretIndicator();
    }).bind(this);
    window.onmousemove = (function(ev) {
        if (!this.mouseSelection)
            return true;

        this.enforceFocus();
        ev.preventDefault();
        var loc = this.getLocationInContentArea(ev);
        this.model.updateMouseSelection(loc.x, loc.lines);
        this.updateCaretIndicator();
        return false;
    }).bind(this);
    window.onmouseup = (function(ev) {
        this.enforceFocus();
        this.mouseSelection = false;

        var loc = this.getLocationInContentArea(ev);
        this.model.moveToPosition(loc.x, loc.lines);
        this.updateCaretIndicator();
    }).bind(this);
    
    receiverContainer.appendChild(receiver);
    this.editor = document.getElementById('editor');
    this.editor.appendChild(receiverContainer);
    receiver.focus();
    this.receiverContainer = receiverContainer;
    this.receiverSpacer = receiverSpacer;
    this.receiver = receiver;
};
