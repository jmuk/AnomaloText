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
    var tokens = parseText(contents);
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token == '\n') {
            contentArea.appendChild(document.createElement('br'));
        } else if (token == ' ') {
            var span = document.createElement('span');
            span.textContent = String.fromCharCode(0xA0);
            contentArea.appendChild(span);
        } else {
            var span = document.createElement('span');
            span.textContent = token;
            contentArea.appendChild(span);
        }
    }
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
    if (ev.shiftKey && key.length == 1)
        key = key.toUpperCase();

    var consumed = false;
    if (key != null) {
        var dataArea = $('data-area');
        if (!dataArea) {
            dataArea = document.createElement('span');
            dataArea.id = 'data-area';
            var content = $('content-area');
            content.insertBefore(dataArea, content.firstChild);
        }
        switch (key) {
        case 'Backspace':
        case 'Delete':
            if (dataArea.textContent.length > 0)
                dataArea.textContent = dataArea.textContent.substring(0, dataArea.textContent.length - 1);
            consumed = true;
            break;
        default:
            if (key.length == 1 && !ev.ctrlKey && !ev.altKey)
                dataArea.textContent += key;
            consumed = true;
            break;
        }
    }
    receiver.textContent = '';
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
    receiver.style.zIndex = '-1';
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
        receiver.style.zIndex = '-1';
        var dataArea = $('data-area');
        if (!dataArea) {
            dataArea = document.createElement('span');
            dataArea.id = 'data-area';
            var content = $('content-area');
            content.insertBefore(dataArea, content.firstChild);
        }
        dataArea.textContent += ev.data;
        receiver.textContent = '';
        receiver.incomposition = false;
    });
    receiver.onblur = function() { receiver.focus(); };
    $('content-area').insertBefore(receiver, $('content-area').firstChild);
    receiver.focus();
}

function windowOnLoad() {
    createEventReceiver();
    loadFile('/editor/main.py', onFileLoaded);
}

window.addEventListener('load', windowOnLoad);
})();