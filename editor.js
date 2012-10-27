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
    var linebreakRE = /^[\n\r]/;
    var spaceRE = /^\s/;
    var otherRE = /^\S+/;
    var res = [linebreakRE, spaceRE, otherRE];
    while (contents.length > 0) {
        var noMatch = true;
        for (var j = 0; j < res.length; j++) {
            var matched = res[j].exec(contents);
            if (matched) {
                result.push(matched[0]);
                contents = contents.substring(matched[0].length);
                noMatch = false;
                break;
            }
        }
        if (noMatch) {
            result.push(contents[0]);
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
        var token = tokens[i];
        var tokenElement;
        if (token == '\n') {
            tokenElement = document.createElement('br');
        } else if (token == ' ') {
            tokenElement = document.createElement('span');
            tokenElement.textContent = String.fromCharCode(0xA0);
        } else {
            tokenElement = document.createElement('span');
            tokenElement.textContent = token;
        }
        contentArea.appendChild(tokenElement);
    }
    createEventReceiver();
}

var caret = {
    position: null,
    targetToken: null,
    offsetInToken: null,
    eventReceiver: null,
    caretIndicator: null
};

function insertTokenInto(element) {
    if (caret.offsetInToken == 0) {
        $('content-area').insertBefore(element, caret.targetToken);
    } else if (caret.offsetInToken == caret.targetToken.textContent.length){
        $('content-area').insertAfter(element, caret.targetToken);
        caret.targetToken = element.nextSibling;
        caret.offsetInToken = 0;
    } else {
        var tokenText = caret.targetToken.textContent;
        var tokenBefore = document.createElement('span');
        var tokenAfter = document.createElement('span');
        tokenBefore.textContent = tokenText.substring(0, caret.offsetInToken);
        tokenAfter.textContent = tokenText.substring(caret.offsetInToken);
        var insertPoint = caret.targetToken.nextSibling;
        $('content-area').removeChild(caret.targetToken);
        if (insertPoint != null) {
            $('content-area').insertBefore(tokenBefore, insertPoint);
            $('content-area').insertBefore(element, insertPoint);
            $('content-area').insertBefore(tokenAfter, insertPoint);
        } else {
            $('content-area').appendChild(tokenBefore);
            $('content-area').appendChild(element);
            $('content-area').appendChild(tokenAfter);
        }
        caret.targetToken = tokenAfter;
        caret.offsetInToken = 0;
    }
}

function updateCaretIndicator() {
    var token = caret.targetToken;
    var indicator = caret.caretIndicator;
    indicator.style.height = token.offsetHeight + 'px';
    indicator.style.top = token.offsetTop + 'px';
    var left = token.offsetLeft;
    if (token.tagName == 'SPAN')
        left += token.offsetWidth * caret.offsetInToken / token.textContent.length;
    indicator.style.left = left + 'px';
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
    if (key != null) {
        switch (key) {
        case ' ':
            var space = document.createElement('span');
            space.textContent = String.fromCharCode(0xA0);
            insertTokenInto(space);
            caret.position += 1;
            break;
        case 'Backspace':
        case 'Delete':
            function removeToken(elem) {
                caret.targetToken = elem.previousSibling;
                if (caret.targetToken == null) {
                    caret.targetToken = $('content-area').firstChild;
                    caret.offsetInToken = 0;
                } else {
                    caret.offsetInToken = caret.targetToken.textContent.length;
                }
                $('content-area').removeChild(elem);
            }
            if (caret.offsetInToken == 0) {
                if (caret.targetToken == $('content-area').firstChild)
                    break;
                caret.targetToken = caret.targetToken.previousSibling;
                if (caret.targetToken.tagName == 'BR') {
                    removeToken(caret.targetToken);
                    break;
                } else {
                    caret.offsetInToken = caret.targetToken.textContent.length;
                }
            }
            var text = caret.targetToken.textContent;
            if (text.length == 1) {
                removeToken(caret.targetToken);
                caret.offsetInToken = caret.targetToken.textContent.length;
            } else {
                text = text.substring(0, caret.offsetInToken - 1) + text.substring(caret.offsetInToken);
                caret.targetToken.textContent = text;
                caret.offsetInToken -= 1;
            }
            caret.position -= 1;
            consumed = true;
            break;
        case 'Left':
            if (caret.offsetInToken > 0) {
                caret.offsetInToken -= 1;
                caret.position -= 1;
            } else if (caret.targetToken.previousSibling) {
                caret.targetToken = caret.targetToken.previousSibling;
                caret.offsetInToken = caret.targetToken.textContent.length - 1;
                caret.position -= 1;
            }
            consumed = true;
            break;
        case 'Right':
            if (caret.offsetInToken < caret.targetToken.textContent.length) {
                caret.offsetInToken += 1;
                caret.position += 1;
            } else {
                var next = caret.targetToken.nextSibling;
                var newOffset = 1;
                if (next && next.tagName == 'BR') {
                    next = next.nextSibling;
                    newOffset = 0;
                }
                if (next) {
                    caret.targetToken = next;
                    caret.offsetInToken = newOffset;
                    caret.position += 1;
                }
            }
            consumed = true;
            break;
        case 'Enter':
            insertTokenInto(document.createElement('br'));
            caret.position += 1;
            break;
        default:
            if (key.length == 1 && !ev.ctrlKey && !ev.altKey) {
                if (caret.targetToken.tagName == 'BR' || caret.targetToken.textContent == '\xA0') {
                    var span = document.createElement('span');
                    span.textContent = key;
                    $('content-area').insertBefore(span, caret.targetToken);
                    caret.position += 1;
                    caret.targetToken = span;
                    caret.offsetInToken = 1;
                } else {
                    var text = caret.targetToken.textContent;
                    var newText = text.substring(0, caret.offsetInToken) + key + text.substring(caret.offsetInToken);
                    caret.targetToken.textContent = newText;
                    caret.position += 1;
                    caret.offsetInToken += 1;
                }
            }
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
function createEventReceiver() {
    var receiver = document.createElement('div');
    receiver.style.position = 'absolute';
    receiver.style.outline = '0';
    receiver.style.zIndex = '-100';
    receiver.style.top = '0';
    receiver.style.left = '0';
    receiver.contentEditable = true;
    receiver.style.backgroundColor = 'white';
    receiver.onkeydown = function(ev) {
        if (!receiver.incomposition && onKeyDown(receiver, ev)) {
            ev.preventDefault();
            return false;
        }
        return true;
    };
    receiver.addEventListener('compositionstart', function(ev) {
        console.log('compositionstart');
        receiver.incomposition = true;
        receiver.style.zIndex = '2';
    });
    receiver.addEventListener('compositionend', function(ev) {
        // TODO: re-implement this.
        receiver.style.zIndex = '-1';
        console.log(ev.data);
        receiver.textContent = '';
        receiver.incomposition = false;
    });
    receiver.onblur = function() { receiver.focus(); };
    $('editor').appendChild(receiver);
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

    caret.position = 0;
    caret.targetToken = $('content-area').firstChild;
    caret.offsetInToken = 0;
    caret.eventReceiver = receiver;
    caret.caretIndicator = indicator;
}

function windowOnLoad() {
    loadFile('/editor/main.py', onFileLoaded);
}

window.addEventListener('load', windowOnLoad);
})();