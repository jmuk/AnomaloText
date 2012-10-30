// nothing.
(function() {
function $(id) { return document.getElementById(id); }

function loadFile(filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filename, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState != XMLHttpRequest.DONE)
            return;
        callback(xhr.responseText);
    };
    xhr.send();
}

function parseText(contents) {
    var result = [];
    while (contents.length > 0) {
        var token = Token.getToken(contents);
        if (token[0]) {
            result.push(token[0]);
            contents = token[1];
        } else {
            result.push(new Token(contents[0]));
            contents = contents.substring(1);
        }
    }
    return result;
}

function onFileLoaded(contents) {
    var contentArea = $('content-area');
    while (contentArea.firstChild)
        contentArea.removeChild(contentArea.firstChild);
    var tokens = parseText(contents);
    for (var i = 0; i < tokens.length; i++) {
        contentArea.appendChild(tokens[i].element);
    }
    createEventReceiver(tokens);
}

var caret = {
    tokens: null,
    offsetInToken: null,
    eventReceiverContainer: null,
    caretIndicator: null
};

function insertTokenInto(token) {
    var contentArea = caret.tokens.current().element.parentNode;
    var current = caret.tokens.current();
    if (caret.offsetInToken == 0) {
        contentArea.insertBefore(token.element, current.element);
        caret.tokens.insert(token);
    } else if (caret.offsetInToken == caret.tokens.current().length) {
        if (contentArea.lastChild == current.element) {
            contentArea.appendChild(token.element);
        } else {
            contentArea.insertBefore(token.element, current.element.nextSibling);
        }
        caret.tokens.forward();
        caret.tokens.insert(token);
        caret.tokens.backward();
        caret.offsetInToken = token.length;
    } else {
        var tokenText = current.text;
        var tokenBefore = new Token(tokenText.substring(0, caret.offsetInToken));
        var tokenAfter = new Token(tokenText.substring(caret.offsetInToken));
        contentArea.insertBefore(tokenBefore.element, current.element);
        contentArea.insertBefore(token.element, current.element);
        contentArea.insertBefore(tokenAfter.element, current.element);
        contentArea.removeChild(current.element);
        caret.tokens.remove();
        caret.tokens.insert(tokenBefore);
        caret.tokens.insert(token);
        caret.tokens.insert(tokenAfter);
        caret.tokens.backward();
        caret.offsetInToken = 0;
    }
}

function insertText(token, text) {
    var tokens = [];
    while (text.length > 0) {
        var result = Token.getToken(text);
        tokens.push(result[0]);
        text = result[1];
    }
    console.log(tokens);

    if (token.type != 'control' && token.type != 'space' &&
        tokens.length == 1 && tokens[0].type == token.type) {
        text = tokens[0].text;
        var curr = token.text;
        var newText = curr.substring(0, caret.offsetInToken) + text +
            curr.substring(caret.offsetInToken);
        token.element.textContent = newText;
        token.setText(newText);
        caret.offsetInToken += text.length;
    } else {
        for (var i = 0; i < tokens.length; i++) {
            insertTokenInto(tokens[i]);
        }
    }
}

function updateCaretIndicator() {
    var token = caret.tokens.current();
    var indicator = caret.caretIndicator;
    if (token.type == 'control') {
        var i = caret.tokens.front.length - 1;
        if (caret.tokens.front[i].type != 'control') {
            caret.tokens.backward();
            caret.offsetInToken = caret.tokens.current().length;
        } else {
            while (caret.tokens.front[i].type == 'control')
                i--;
            indicator.style.left = '0';
            var count = caret.tokens.front.length -1 -  i;
            var top = caret.tokens.front[i].element.offsetTop;
            top += caret.tokens.front[i].element.offsetHeight * count;
            indicator.style.top = top + 'px';
        }
    } else {
        var element = token.element;
        indicator.style.top = element.offsetTop + 'px';
        var left = element.offsetLeft;
        if (token.length > 0)
            left += element.offsetWidth * caret.offsetInToken / token.length;
        indicator.style.left = left + 'px';
    }
    var receiver = caret.eventReceiverContainer;
    receiver.style.top = indicator.style.top;
    receiver.style.left = indicator.style.left;
    receiver.style.width =
        indicator.offsetParent.offsetWidth - indicator.offsetLeft + 'px';
    receiver.style.width =
        indicator.offsetParent.offsetWidth - indicator.offsetLeft + 'px';
}

function onKeyDown(receiver, ev) {
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

    var key = (ev.shiftKey) ?
        (shiftKeyMap[ev.keyCode] || keyMap[ev.keyCode]) : keyMap[ev.keyCode];
    if (ev.shiftKey && key && key.length == 1)
        key = key.toUpperCase();

    var consumed = false;
    var current = caret.tokens.current();
    if (key != null) {
        switch (key) {
        case ' ':
            insertTokenInto(new Token(' '));
            break;
        case 'Backspace':
        case 'Delete':
            consumed = true;
            if (caret.offsetInToken == 0) {
                if (!caret.tokens.backward())
                    break;
                
                current = caret.tokens.current();
                caret.offsetInToken = current.length;
            }
            if (current.length <= 1) {
                current.element.parentNode.removeChild(current.element);
                caret.tokens.remove();
                if (caret.tokens.backward()) {
                    caret.offsetInToken = caret.tokens.current().length;
                } else {
                    caret.offsetInToken = 0;
                }
            } else {
                var text = current.text.substring(0, caret.offsetInToken - 1) +
                    current.text.substring(caret.offsetInToken);
                current.element.textContent = text;
                current.setText(text);
                caret.offsetInToken -= 1;
            }
            consumed = true;
            break;
        case 'Left':
            if (current.type != 'control' && caret.offsetInToken > 0) {
                caret.offsetInToken -= 1;
            } else if (caret.tokens.backward()) {
                if (caret.tokens.current().type == 'control' &&
                    caret.tokens.previous().type != 'control') {
                    caret.tokens.backward();
                    caret.offsetInToken = caret.tokens.current().length;
                } else {
                    caret.offsetInToken = caret.tokens.current().length - 1;
                    if (caret.offsetInToken < 0)
                        caret.offsetInToken = 0;
                }
            }
            consumed = true;
            break;
        case 'Right':
            if (caret.offsetInToken < current.length) {
                caret.offsetInToken += 1;
            } else if (caret.tokens.forward()) {
                if (current.type == 'control') {
                    caret.offsetInToken = 0;
                } else if (caret.tokens.current().type == 'control') {
                    caret.tokens.forward();
                    caret.offsetInToken = 0;
                } else {
                    caret.offsetInToken = 1;
                }
            }
            consumed = true;
            break;
        case 'Up':
            var left = caret.caretIndicator.offsetLeft;
            for (var i = caret.tokens.front.length - 1; i >= 0; i--) {
                if (caret.tokens.front[i].isReturn()) {
                    break;
                }
            }
            i--;
            if (caret.tokens.front[i].isReturn()) {
                caret.tokens.jumpTo(i + 1);
                caret.offsetInToken = 0;
            } else {
                for (; i >= 0 && !caret.tokens.front[i].isReturn(); i--) {
                    var token = caret.tokens.front[i];
                    var element = token.element;
                    if ((element.offsetLeft <= left)) {
                        caret.tokens.jumpTo(i);
                        caret.offsetInToken = Math.min(
                            token.length,
                            Math.floor(token.length * (left - element.offsetLeft) /
                                       element.offsetWidth));
                        break;
                    }
                }
            }
            consumed = true;
            break;
        case 'Down':
            var left = caret.caretIndicator.offsetLeft;
            for (var i = caret.tokens.back.length - 1; i >= 0; i--) {
                if (caret.tokens.back[i].isReturn()) {
                    break;
                }
            }
            i--;
            var newPosition = caret.tokens.front.length +
                caret.tokens.back.length - i - 1;
            if (caret.tokens.back[i].isReturn()) {
                caret.tokens.jumpTo(newPosition);
                caret.offsetInToken = 0;
            } else {
                for (; i >= 0 && !caret.tokens.back[i].isReturn(); i--, newPosition++) {
                    var token = caret.tokens.back[i];
                    var element = token.element;
                    if ((element.offsetLeft <= left)) {
                        caret.tokens.jumpTo(newPosition);
                        caret.offsetInToken = Math.min(
                            token.length,
                            Math.floor(token.length * (left - element.offsetLeft) /
                                       element.offsetWidth));
                        break;
                    }
                }
            }
            consumed = true;
            break;
        case 'Enter':
            insertTokenInto(new Token('\n'));
            break;
        default:
            if (key.length == 1 && !ev.ctrlKey && !ev.altKey)
                insertText(current, key);
            consumed = true;
            break;
        }
    }
    receiver.textContent = '';
    updateCaretIndicator();
    return consumed;
}

/**
 * Creates an invisible div which receives the key events and passes
 * it to the model.
 */
function createEventReceiver(tokens) {
    var receiverContainer = document.createElement('div');
    receiverContainer.style.position = 'absolute';
    receiverContainer.style.zIndex = '-1';
    receiverContainer.style.top = '0';
    receiverContainer.style.left = '0';
    var receiver = document.createElement('span');
    receiver.style.outline = '0';
    receiver.style.backgroundColor = 'white';
    receiver.contentEditable = true;
    receiver.onkeydown = function(ev) {
        if (!receiver.incomposition && onKeyDown(receiver, ev)) {
            ev.preventDefault();
            return false;
        }
        return true;
    };
    receiver.addEventListener('compositionstart', function(ev) {
        receiver.incomposition = true;
        receiverContainer.style.zIndex = '2';
    });
    receiver.addEventListener('compositionend', function(ev) {
        // TODO: re-implement this.
        receiverContainer.style.zIndex = '-1';
        insertText(caret.tokens.current(), ev.data);
        receiver.textContent = '';
        receiver.incomposition = false;
    });
    receiver.onblur = function() { receiver.focus(); };
    receiverContainer.appendChild(receiver);
    $('editor').appendChild(receiverContainer);
    receiver.focus();

    var indicator = document.createElement('div');
    indicator.style.border = 'solid 1px';
    indicator.style.width = '0';
    indicator.style.height = $('content-area').firstChild.offsetHeight;
    indicator.style.top = 0;
    indicator.style.left = 0;
    indicator.style.position = 'absolute';
    indicator.style.zIndex = '3';
    $('editor').appendChild(indicator);

    caret.tokens = new Zipper(tokens);
    caret.offsetInToken = 0;
    caret.eventReceiverContainer = receiverContainer;
    caret.caretIndicator = indicator;
}

function windowOnLoad() {
    loadFile('/editor/main.py', onFileLoaded);
}

window.addEventListener('load', windowOnLoad);
})();