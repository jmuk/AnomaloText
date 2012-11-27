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
    div.style.zIndex = '2';
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

    var container = document.getElementById('editor');
    if (target) {
        this.parens.push(
            borderedToken(origin, 'highlighted', container),
            borderedToken(target, 'highlighted', container));
    } else {
        this.parens.push(
            borderedToken(origin, 'highlighted-warning', container));
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
    'Enter': 'newLine',
    'Backspace': 'deletePreviousChar',
    'Delete': 'deleteNextChar'
};

EditorView.prototype.onKeyDown = function(ev) {
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
    var shiftKeyMap = {
        192:"~", 48:")", 49:"!", 50:"@", 51:"#", 52:"$", 53:"%", 54:"^", 55:"&",
        56:"*", 57:"(", 109:"_", 61:"+", 219:"{", 221:"}", 220:"|", 59:":",
        222:"\"", 187:"+", 188:"<", 189:"_", 190:">", 191:"?", 192: '~'
    };

    if (this.receiver.incomposition)
        return true;

    var key = (ev.shiftKey) ?
        (shiftKeyMap[ev.keyCode] || keyMap[ev.keyCode]) : keyMap[ev.keyCode];
    var shiftKey = ev.shiftKey;
    if (ev.shiftKey && key && key.length == 1) {
        key = key.toUpperCase();
        shiftKey = false;
    }

    var consumed = false;
    if (key != null) {
        var commandText = key;
        if (shiftKey)
            commandText = 'S-' + commandText;
        if (ev.altKey)
            commandText = 'M-' + commandText;
        if (ev.ctrlKey)
            commandText = 'C-' + commandText;

        if (commandText in this.commands) {
            var method = this.model[this.commands[commandText]];
            if (method) {
                method.bind(this.model)();
                consumed = true;
            } else {
                console.warning(
                    'cannot find method for ' + this.commands[commandText]);
            }
        } else if (commandText.length == 1) {
            this.model.insertText(commandText);
            consumed = true;
        }
    }
    this.receiver.textContent = '';
    this.updateCaretIndicator();
    if (consumed)
        ev.preventDefault();
    return !consumed;
};

/**
 * Creates an invisible div which receives the key events and passes
 * it to the model.
 */
EditorView.prototype.createEventReceiver = function() {
    var receiverContainer = document.createElement('div');
    receiverContainer.style.position = 'absolute';
    receiverContainer.style.zIndex = '-1';
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
    receiver.onkeydown = this.onKeyDown.bind(this);
    receiver.addEventListener('compositionstart', (function(ev) {
        this.receiver.incomposition = true;
        this.receiverContainer.style.zIndex = '2';
        this.caretIndicator.style.visibility = 'hidden';
    }).bind(this));
    receiver.addEventListener('compositionend', (function(ev) {
        this.receiverContainer.style.zIndex = '-1';
        this.model.insertText(ev.data);
        this.receiver.textContent = '';
        this.receiver.incomposition = false;
        this.caretIndicator.style.visibility = 'visible';
        this.updateCaretIndicator();
    }).bind(this));
    window.onmouseup = (function(ev) {
        this.receiver.focus();
        var caretRange = document.createRange();
        caretRange.setStart(this.receiver, 0);
        caretRange.setEnd(this.receiver, 0);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(caretRange);

        var lines = Math.floor(ev.pageY / this.lineHeight);
        this.model.moveToPosition(ev.pageX, lines);
        this.updateCaretIndicator();
    }).bind(this);
    
    receiverContainer.appendChild(receiver);
    var editor = document.getElementById('editor');
    editor.appendChild(receiverContainer);
    receiver.focus();

    var indicator = document.createElement('div');
    indicator.style.border = 'solid 1px';
    indicator.style.width = '0';
    indicator.style.top = 0;
    indicator.style.left = 0;
    indicator.style.position = 'absolute';
    indicator.style.zIndex = '3';
    editor.appendChild(indicator);

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
