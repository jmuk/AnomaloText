var EditorZIndice = {
    COMPOSITION: '2',
    HIGHLIGHT: '1',
    TEXT: '0',  // default.  It has to be 0.
    SELECTION: '-1',
    BACKGROUND: '-2',
    HIDDEN: '-3'
};

function EditorView(model) {
    this.model = model;
    this.contentArea = document.getElementById('content-area');
    while (this.contentArea.firstChild)
        this.contentArea.removeChild(this.contentArea.firstChild);
    this.model.addElementsToContents(this.contentArea);
    this.createEventReceiver();
    this.lineHeight = 0;
    this.lineMargin = 0;
    this.updateHeight();
    this.parens = [];
    this.openParen = null;
    this.closeParen = null;
    this.selection = null;
}

EditorView.prototype.updateHeight = function() {
    this.lineHeight = this.contentArea.offsetHeight / this.model.getLineCount();
    this.caretIndicator.style.height = this.lineHeight;
};

EditorView.prototype.updateCaretIndicator = function() {
    var caretPosition = this.model.getCaretPosition();
    this.caretIndicator.style.left = caretPosition.leftOffset + 'px';
    this.caretIndicator.style.top =
        caretPosition.lines * this.lineHeight + 'px';
    this.receiverContainer.style.top = this.caretIndicator.style.top;
    this.receiverSpacer.style.width = this.caretIndicator.style.left;
    this.maybeHighlightParens();
    this.showSelection();
};

function borderedToken(element, className, container) {
    var div = document.createElement('div');
    div.className = className;
    // Assumes the border width is 1px, so reduce width/height by 2.
    div.style.width = element.offsetWidth - 2 + 'px';
    div.style.height = element.offsetHeight - 2 + 'px';
    div.style.top = element.offsetTop + 'px';
    div.style.left = element.offsetLeft + 'px';
    div.style.position = 'absolute';
    div.style.zIndex = EditorZIndice.HIGHLIGHT;
    container.appendChild(div);
    return div;
}

// TODO: move this to View, and use overlay div rather than edit class.
EditorView.prototype.maybeHighlightParens = function() {
    for (var i = 0; i < this.parens.length; i++) {
        var p = this.parens[i];
        p.parentNode.removeChild(p);
    }
    this.parens = [];

    var origin = this.model.getCurrentElement();
    if (!origin)
        return;

    var paren = isParen(origin.textContent);
    if (paren == null)
        return;
    
    var target = (paren == ParenType.PAREN_OPEN) ?
        origin.nextSibling : origin.previousSibling;
    var counter = 1;
    while (target) {
        var data = isParen(target.textContent);
        if (data != null) {
            if (data == paren)
                counter++;
            else
                counter--;
        }
        if (counter == 0) {
            break;
        }
        target = (paren == ParenType.PAREN_OPEN) ?
            target.nextSibling : target.previousSibling;
    }

    if (target) {
        this.parens.push(
            borderedToken(origin, 'highlighted', this.editor),
            borderedToken(target, 'highlighted', this.editor));
    } else {
        this.parens.push(
            borderedToken(origin, 'highlighted-warning', this.editor));
    }
};

EditorView.prototype.createSelectionDiv = function(left, top, width) {
    var div = document.createElement('div');
    div.style.left = left + 'px';
    div.style.top = top + 'px';
    div.style.width = width + 'px';
    div.style.height = this.lineHeight + 'px';
    div.style.zIndex = EditorZIndice.SELECTION;
    div.style.position = 'absolute';
    div.className = 'selection';
    this.contentArea.appendChild(div);
    this.selection.push(div);
};

EditorView.prototype.showSelection = function() {
    if (this.selection) {
        for (var i = 0; i < this.selection.length; ++i) {
            var s = this.selection[i];
            s.parentNode.removeChild(s);
        }
        this.selection = null;
    }

    var selection = this.model.getSelection();
    if (!selection)
        return;

    this.selection = [];
    if (selection.start.line == selection.end.line) {
        this.createSelectionDiv(
            selection.start.offset,
            selection.start.line * this.lineHeight,
            selection.end.offset - selection.start.offset);
    } else {
        this.createSelectionDiv(
            selection.start.offset,
            selection.start.line * this.lineHeight,
            this.contentArea.offsetWidth - selection.start.offset);
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            this.createSelectionDiv(
                0, i * this.lineHeight,
                this.contentArea.offsetWidth);
        }
        this.createSelectionDiv(
            0, selection.end.line * this.lineHeight,
            selection.end.offset);
    }
};

// TODO: the command list has to be customizable.
EditorView.prototype.commands = {
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

EditorView.prototype.executeCommand = function(commandText) {
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
            console.log(names);
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

EditorView.prototype.input = function(ev) {
    if (this.receiver.incomposition)
        return false;

    this.model.insertText(this.receiver.textContent);
    ev.preventDefault();
    this.receiver.textContent = '';
    this.updateCaretIndicator();
    return false;
};

EditorView.prototype.keydown = function(ev) {
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
EditorView.prototype.enforceFocus = function() {
    this.receiver.focus();
    var caretRange = document.createRange();
    caretRange.setStart(this.receiver, 0);
    caretRange.setEnd(this.receiver, 0);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(caretRange);
};

EditorView.prototype.getLocationInContentArea = function(ev) {
    var result = {
        x: ev.pageX - this.editor.offsetLeft,
        y: ev.pageY - this.editor.offsetTop
    };
    result.lines = Math.floor(result.y / this.lineHeight);
    return result;
};

/**
 * Creates an invisible div which receives the key events and passes
 * it to the model.
 */
EditorView.prototype.createEventReceiver = function() {
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
        this.caretIndicator.style.visibility = 'hidden';
    }).bind(this));
    receiver.addEventListener('compositionend', (function(ev) {
        this.receiverContainer.style.zIndex =
            EditorZIndice.HIDDEN;
        this.receiver.incomposition = false;
        this.caretIndicator.style.visibility = 'visible';
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

    var indicator = document.createElement('div');
    indicator.style.border = 'solid 1px';
    indicator.style.width = '0';
    indicator.style.top = 0;
    indicator.style.left = 0;
    indicator.style.position = 'absolute';
    indicator.style.zIndex = EditorZIndice.HIGHLIGHT;
    this.editor.appendChild(indicator);

    this.receiverContainer = receiverContainer;
    this.receiverSpacer = receiverSpacer;
    this.receiver = receiver;
    this.caretIndicator = indicator;
};

// TODO: parens should be defined in the mode.
var ParenType = {
    PAREN_OPEN: 1,
    PAREN_CLOSE: -1
};

function isParen(text) {
    var parens = "({[]})";
    if (text.length != 1)
        return null;

    var i = parens.indexOf(text);

    if (i < 0)
        return null;
    if (i < parens.length / 2)
        return ParenType.PAREN_OPEN;
    else
        return ParenType.PAREN_CLOSE;
}
