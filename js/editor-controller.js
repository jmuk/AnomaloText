function EditorController(model) {
    this.editor = document.getElementById('editor');
    this.editor.innerHTML = '';
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'content-area';
    this.editor.appendChild(this.contentArea);
    this.ticker = new TickerController(document.getElementById('ticker'));

    this.model = model;
    this.view = new EditorView(this.contentArea);
    this.model.view = this.view;
    this.createEventReceiver();
    this.lineHeight = 0;
    this.lineMargin = 0;
    this.updateHeight();
    this.openParen = null;
    this.closeParen = null;

    this.keybinds = [new DefaultKeybind(model)];
}

EditorController.prototype.registerKeybind = function(keybind) {
  this.keybinds.push(keybind);
};

EditorController.prototype.onFileLoaded = function(fileHandler) {
    this.model.setContents(fileHandler.contents);
};

EditorController.prototype.updateHeight = function() {
    this.lineHeight =
        Math.floor(this.contentArea.offsetHeight / this.model.getLineCount());
    this.view.updateHeight();
};

EditorController.prototype.updateCaretIndicator = function() {
    var selection = this.model.getSelection();
    var loc = this.model.getCaretLocation();
    var caretPosition = this.view.getCaretPosition(loc);
    this.ticker.onCaretMove(loc, caretPosition);
    if (selection) {
        this.view.hideCaretIndicator();
    } else {
        this.view.showCaretIndicator();
        this.view.updateCaretIndicator(loc);
        this.receiverContainer.style.top = caretPosition.top + 'px';
        this.receiverSpacer.style.width = caretPosition.left + 'px';
    }
    this.view.updateSelection(selection);
    this.model.maybeHighlightParens();
};

// TODO: the command list has to be customizable.
EditorController.prototype.executeCommand = function(commandText) {
    for (var i = 0; i < this.keybinds.length; i++) {
        if (this.keybinds[i].executeCommand(commandText))
            return true;
    }
    return false;
};

EditorController.prototype.keypress = function(ev) {
    if (this.receiver.incomposition)
        return false;

    ev.preventDefault();
    if (ev.ctrlKey || ev.altKey)
        return false;

    // Ignore control codes.
    if (ev.charCode < 0x20)
        return false;

    this.model.insertText(String.fromCharCode(ev.charCode));
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
    receiver.addEventListener('keypress', this.keypress.bind(this));
    receiver.addEventListener('compositionstart', (function(ev) {
        this.receiver.innerHTML = '';
        this.receiver.incomposition = true;
        this.receiverContainer.style.zIndex = 
            EditorZIndice.COMPOSITION;
        this.view.hideCaretIndicator();
    }).bind(this));
    receiver.addEventListener('compositionend', (function(ev) {
        this.receiverContainer.style.zIndex =
            EditorZIndice.HIDDEN;
        this.receiver.incomposition = false;
        this.receiver.innerHTML = '';
        this.view.showCaretIndicator();
        this.model.insertText(ev.data);
        this.updateCaretIndicator();
    }).bind(this));
    window.addEventListener('mousedown', (function(ev) {
        this.enforceFocus();
        ev.preventDefault();
        this.mouseSelection = true;
        var loc = this.getLocationInContentArea(ev);
        this.model.startMouseSelection(loc.x, loc.lines);
        this.updateCaretIndicator();
    }).bind(this));
    window.addEventListener('mousemove', (function(ev) {
        if (!this.mouseSelection)
            return true;

        // something wrong happened, editor thinks drag is
        // ongoing although no mouse buttons are pressed.
        if (ev.buttons == 0) {
            this.model.endMouseSelection();
            return true;
        }
        this.enforceFocus();
        ev.preventDefault();
        var loc = this.getLocationInContentArea(ev);
        this.model.updateMouseSelection(loc.x, loc.lines);
        this.updateCaretIndicator();
        return false;
    }).bind(this));
    window.addEventListener('mouseup', (function(ev) {
        this.enforceFocus();
        this.mouseSelection = false;
        this.model.endMouseSelection();

        var loc = this.getLocationInContentArea(ev);
        this.model.moveToPosition(loc.x, loc.lines);
        this.updateCaretIndicator();
    }).bind(this));
    window.addEventListener('resize', (function(ev) {
        this.view.refreshHeight();
    }).bind(this));
    this.editor.onscroll = (function(ev) {
        this.model.ensureCaretVisible(
            this.view.getVisibleLines());
        this.updateCaretIndicator();
    }).bind(this);
    window.addEventListener('focus', this.enforceFocus.bind(this));
    
    receiverContainer.appendChild(receiver);
    this.editor.appendChild(receiverContainer);
    receiver.focus();
    this.receiverContainer = receiverContainer;
    this.receiverSpacer = receiverSpacer;
    this.receiver = receiver;
    this.updateCaretIndicator();
};
