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
    var lines = contents.split('\n');
    var result = [];    
    for (var i = 0; i < lines.length; i++) {
        var lineResult = [];
        var line = lines[i];
        var spaceRE = /^\s/;
        var otherRE = /^\S+/;
        var res = [spaceRE, otherRE];
        while (line.length > 0) {
            var noMatch = true;
            for (var j = 0; j < res.length; j++) {
                var matched = res[j].exec(line);
                if (matched) {
                    lineResult.push(matched[0]);
                    line = line.substring(matched[0].length);
                    noMatch = false;
                    break;
                }
            }
            if (noMatch) {
                lineResult.push(line[0]);
                line = line.substring(1);
            }
        }
        console.log(lineResult);
        result.push(lineResult);
    }
    return result;
}

function onFileLoaded(contents) {
    var contentArea = $('content-area');
    var data = parseText(contents);
    for (var i = 0; i < data.length; i++) {
        var lineElement = document.createElement('div');
        var line = data[i];
        for (var j = 0; j < line.length; j++) {
            if (line[j] == ' ')
                lineElement.appendChild(document.createTextNode(String.fromCharCode(0xA0)));
            else
                lineElement.appendChild(document.createTextNode(line[j]));
        }
        // TODO: remove this hack and set the height for each line.
        if (line.length == 0)
            lineElement.appendChild(document.createTextNode(String.fromCharCode(0x200B)));
        contentArea.appendChild(lineElement);
    }
}

window.addEventListener('load', loadFile('/editor/main.py', onFileLoaded));
})();