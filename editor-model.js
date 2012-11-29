function EditorModel(contents) {
    this.Init(contents);
    this.caretPosition = 0;
    this.idealCaretOffset = null;
    this.selection = null;
    // TODO: this has to be merged into the system clipboard.
    this.killring = [];
}

EditorModel.prototype.Init = function(contents) {
    var lines = contents.split('\n');
    var lineData = [];
    for (var i = 0; i < lines.length; i++) {
        lineData.push(new EditorLineModel(lines[i]));
    }
    this.lines = new Zipper(lineData);
};

EditorModel.prototype.addElementsToContents = function(content) {
    for (var i = 0; i < this.lines.length; i++) {
        this.lines.at(i).addElementsToContents(content);
    }
};

EditorModel.prototype.getCaretPosition = function() {
    var line = this.lines.current();
    return {leftOffset: line.getOffset(this.caretPosition),
            lines: this.lines.currentIndex()};
    if (line.tokens.length != 0) {
        result.top = this.tokens[0].element.offsetTop;
    } else {
        // Simply assumes every line has the same height.
        var lineHeight = 0;
        var container = line.linebreak.parentNode;
        for (var i = 0; i < container.childNodes.length; i++) {
            var element = container.childNodes[i];
            if (element.tagName == 'SPAN') {
                lineHeight = element.offsetHeight;
                break;
            }
        }
        result.top = lineHeight * this.lines.currentIndex();
    }
    return result;
};

EditorModel.prototype.getCurrentElement = function() {
    return this.lines.current().getElementAt(
        this.caretPosition);
};

EditorModel.prototype.getSelection = function() {
    if (!this.selection)
        return null;

    var e1 = this.selection;
    var e2 = {
        line: this.lines.currentIndex(),
        position: this.caretPosition
    };
    if (e2.line < e1.line || (e2.line == e1.line &&
                              e2.position < e1.position)) {
        var tmp = e2;
        e2 = e1;
        e1 = tmp;
    }

    e1.offset = this.lines.at(e1.line).getOffset(e1.position);
    e2.offset = this.lines.at(e2.line).getOffset(e2.position);
    return {start: e1, end: e2};
};

EditorModel.prototype.getLineCount = function() {
    return this.lines.length;  
};

EditorModel.prototype.moveCaret = function(newPosition) {
    this.caretPosition = newPosition;
    this.idealCaretOffset = null;
};

EditorModel.prototype.moveToPosition = function(leftOffset, lines) {
    this.lines.jumpTo(lines);
    this.moveCaret(this.lines.current().getPosition(leftOffset));
};

EditorModel.prototype.moveBackward = function() {
    var line = this.lines.current();
    if (this.caretPosition == 0) {
        if (this.lines.backward())
            this.moveCaret(this.lines.current().length);
    } else {
        this.moveCaret(this.caretPosition - 1);
    }
};

EditorModel.prototype.movePreviousWord = function() {
    if (this.caretPosition == 0) {
        if (!this.lines.backward())
            return;
        this.caretPosition = this.lines.current().length;
    }

    var newPosition =
        this.lines.current().getPreviousWord(this.caretPosition);
    while (newPosition == null) {
        if (!this.lines.backward()) {
            this.caretPosition = 0;
            return;
        }
        newPosition = this.lines.current().getPreviousWord(
            this.lines.current().length);
    }
    if (newPosition != null)
        this.caretPosition = newPosition;
};

EditorModel.prototype.moveNextWord = function() {
    if (this.caretPosition == this.lines.current().length) {
        if (!this.lines.forward())
            return;
        this.caretPosition = 0;
    }
    var newPosition =
        this.lines.current().getNextWord(this.caretPosition);
    while (newPosition == null) {
        if (!this.lines.forward()) {
            this.caretPosition = this.lines.current().length;
            return;
        }
        newPosition = this.lines.current().getNextWord(0);
    }
    if (newPosition != null)
        this.caretPosition = newPosition;
};

EditorModel.prototype.moveForward = function() {
    var line = this.lines.current();
    if (this.caretPosition == line.length) {
        if (this.lines.forward())
            this.moveCaret(0);
    } else {
        this.moveCaret(this.caretPosition + 1);
    }
};

EditorModel.prototype.movePreviousLine = function() {
    if (this.idealCaretOffset == null) {
        this.idealCaretOffset =
            this.lines.current().getOffset(this.caretPosition);
    }
    if (this.lines.backward()) {
        this.caretPosition =
            this.lines.current().getPosition(this.idealCaretOffset);
    }
};

EditorModel.prototype.moveNextLine = function() {
    if (this.idealCaretOffset == null) {
        this.idealCaretOffset =
            this.lines.current().getOffset(this.caretPosition);
    }
    if (this.lines.forward()) {
        this.caretPosition =
            this.lines.current().getPosition(this.idealCaretOffset);
    }
};

EditorModel.prototype.moveToStartOfLine = function() {
    this.moveCaret(0);
};

EditorModel.prototype.moveToEndOfLine = function() {
    this.moveCaret(this.lines.current().length);
};

EditorModel.prototype.prepareSelection = function() {
    if (!this.selection) {
        this.selection = {
            line: this.lines.currentIndex(),
            position: this.caretPosition
        };
    }
};

EditorModel.prototype.copyToClipboard = function() {
    var selection = this.getSelection();
    if (selection.start.line == selection.end.line) {
        this.killring.unshift(this.lines.current().contents.slice(
            selection.start.position, selection.end.position));
    } else {
        var selectedText = this.lines.at(
            selection.start.line).contents.slice(selection.start.position);
        selectedText += '\n';
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            selectedText += this.lines.at(i).contents;
            selectedText += '\n';
        }
        if (selection.end.position > 0) {
            selectedText += this.lines.at(
                selection.end.line).contents.slice(0, selection.end.position);
        }
        console.log(selectedText);
        this.killring.unshift(selectedText);
    }
};

EditorModel.prototype.pasteFromClipboard = function() {
    if (this.killring.length == 0)
        return;

    this.insertText(this.killring[0]);
};

EditorModel.prototype.deleteSelection = function() {
    var selection = this.getSelection();
    if (selection.start.line == selection.end.line) {
        this.lines.current().deleteCharsIn(
            selection.start.position, selection.end.position);
        this.caretPosition = selection.start.position;
    } else {
        this.lines.jumpTo(selection.start.line);
        if (selection.start.position == 0) {
            this.lines.current().deleteAllChars();
            this.lines.remove();
        } else {
            this.lines.current().deleteCharsIn(
                selection.start.position,
                this.lines.current().length);
            this.lines.forward();
        }
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            this.lines.current().deleteAllChars();
            this.lines.remove();
        }
        if (selection.end.position > 0) {
            if (selection.end.position == this.lines.current().length) {
                this.lines.current().deleteAllChars();
                this.lines.remove();
            } else {
                this.lines.current().deleteCharsIn(
                    0, selection.end.position);
            }
        }
        this.lines.backward();
        this.caretPosition = this.lines.current().length;
        if (selection.end.position > 0) {
            this.lines.current().concat(this.lines.next());
            this.lines.forward();
            this.lines.remove();
            this.lines.backward();
        } else {
            this.lines.forward();
        }
    }
    this.selection = null;
};

EditorModel.prototype.deletePreviousChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var line = this.lines.current();
    if (this.caretPosition == 0) {
        if (this.lines.previous()) {
            this.lines.remove();
            this.lines.backward();
            var curLine = this.lines.current();
            this.moveCaret(curLine.length);
            curLine.concat(line);
        }
    } else {
        line.deleteCharAt(this.caretPosition - 1);
        this.moveCaret(this.caretPosition - 1);
    }
};

EditorModel.prototype.deleteNextChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var line = this.lines.current();
    if (line.length == this.caretPosition) {
        if (this.lines.next()) {
            this.lines.forward();
            var nextLine = this.lines.current();
            this.lines.remove();
            this.lines.backward();
            line.concat(nextLine);
        }
    } else {
        line.deleteCharAt(this.caretPosition);
    }
};

EditorModel.prototype.newLine = function() {
    this.insertText('\n');
};

EditorModel.prototype.insertText = function(text) {
    if (this.selection)
        this.deleteSelection();

    var lines = text.split("\n");
    if (lines.length > 1) {
        var newLines = this.lines.current().splitAt(
            this.caretPosition);
        this.lines.remove();
        newLines[0].insertTextAt(lines[0], newLines[0].length);
        this.lines.insert(newLines[0]);
        for (var i = 1; i < lines.length - 1; i++) {
            this.lines.insert(new EditorLineModel(lines[i]));
        }
        newLines[1].insertTextAt(lines[lines.length - 1], 0);
        this.lines.insert(newLines[1]);
        this.lines.backward();
        this.moveCaret(lines[lines.length - 1].length);
    } else {
        this.lines.current().insertTextAt(text, this.caretPosition);
        this.moveCaret(this.caretPosition + text.length);
    }
};


function EditorLineModel(line) {
    this.contents = line;
    this.length = line.length;
    var data = this.parseLine(line);
    this.tokens = data[0];
    this.words = data[1];
    this.linebreak = document.createElement('br');
}

EditorLineModel.prototype.addElementsToContents = function(contents) {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (!token.element)
            token.createElement();
        contents.appendChild(this.tokens[i].element);
    }
    contents.appendChild(this.linebreak);
};

// TODO: this has to respect the current mode.  That's why it's a
// method rather than a function.
EditorLineModel.prototype.parseLine = function(line) {
    function BuildUnionRegexp(words) {
        escaped_words = [];
        for (var i = 0; i < words.length; i++) {
            escaped_words.push(
                words[i].replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"));
        }
        return new RegExp('^(' + escaped_words.join('|') + ')\\b');
    }
    var tokens = [];
    var word_segments = [];
    var keywords = BuildUnionRegexp([
        'and', 'del', 'for', 'is', 'raise',
        'assert', 'elif', 'from', 'lambda', 'return',
        'break', 'else', 'global', 'not', 'try',
        'class', 'except', 'if', 'or', 'while',
        'continue', 'exec', 'import', 'pass', 'yield',
        'def', 'finally', 'in', 'print', 'True', 'False'
    ]);
    var words = [
        {re: keywords, type:'reserved'},
        {re: /^#.*/, type: 'comment'},
        {re: /^@[a-zA-Z_0-9]+/, type: 'keyword'},
        {re: /^('(\\'|.)*?'|"(\\\"|.)*?")/, type: 'string'},
        {re:/^[a-zA-Z_0-9]+/, type:null}
    ];
    
    var index = 0;
    while (line.length > 0) {
        var length = 1;
        var tokenType = null;
        for (var i = 0; i < words.length; i++) {
            var m = line.match(words[i].re);
            if (m) {
                length = m[0].length;
                tokenType = words[i].type;
                word_segments.push(
                    {start: index, end: index + length});
                break;
            }
        }
        if (!tokenType && isParen(line[0])) {
            tokenType = 'paren';
        }
        tokens.push.apply(
            tokens, Token.getTokens(line.slice(0, length), tokenType));
        line = line.slice(length);
        index += length;
    }
    return [tokens, word_segments];
};

EditorLineModel.prototype.getOffset = function(position) {
    var offset = 0;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (position < token.length) {
            offset += token.element.offsetWidth /
                token.length * position;
            break;
        } else {
            offset += token.element.offsetWidth;
        }
        position -= token.length;
    }
    return offset;
};

EditorLineModel.prototype.getPosition = function(offset) {
    var position = 0;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (offset <= token.element.offsetWidth) {
            position += Math.floor(
                offset / token.element.offsetWidth * token.length);
            break;
        } else {
            position += token.length;
        }
        offset -= token.element.offsetWidth;
    }
    return position;
};

EditorLineModel.prototype.getElementAt = function(position) {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (position < token.length) {
            return token.element;
        }
        position -= token.length;
    }
    return null;
};

EditorLineModel.prototype.getPreviousWord = function(position) {
    if (this.words.length > 0) {
        if (position <= this.words[0].start)
            return null;
        if (this.words[this.words.length - 1].end <= position)
            return this.words[this.words.length - 1].start;
    }

    for (var i = 0; i < this.words.length; i++) {
        var segment = this.words[i];
        if (i > 0 && position <= segment.start) {
            return this.words[i - 1].start;
        } else if (segment.start < position &&
                   position <= segment.end) {
            return segment.start;
        }
    }
    return null;
};

EditorLineModel.prototype.getNextWord = function(position) {
    for (var i = 0; i < this.words.length; i++) {
        var segment = this.words[i];
        if (segment.start <= position &&
            position < segment.end) {
            return segment.end;
        } else if (position < segment.start) {
            return segment.end;
        }
    }
    return null;
};

EditorLineModel.prototype.deleteAllChars = function() {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (token.element)
            token.element.parentNode.removeChild(token.element);
    }
    if (this.linebreak.parentNode) {
        this.linebreak.parentNode.removeChild(this.linebreak);
    }
    this.tokens = [];
    this.contents = '';
    this.length = 0;
};

EditorLineModel.prototype.deleteCharsIn = function(start, end) {
    var newContents = this.contents.slice(0, start) +
        this.contents.slice(end);
    this.updateContents(newContents);
};

EditorLineModel.prototype.deleteCharAt = function(position) {
    this.deleteCharsIn(position, position + 1);
};

EditorLineModel.prototype.insertTextAt = function(chunk, position) {
    if (chunk.length == 0)
        return;

    var newContents = this.contents.slice(0, position) +
        chunk + this.contents.slice(position);
    this.updateContents(newContents);
};

EditorLineModel.prototype.concat = function(another) {
    this.linebreak.parentNode.removeChild(this.linebreak);
    this.linebreak = another.linebreak;
    this.tokens = this.tokens.concat(another.tokens);
    this.length += another.length;
    this.contents += another.contents;
};

EditorLineModel.prototype.splitAt = function(position) {
    if (position == 0) {
        var newLine = new EditorLineModel('');
        var nextElement = (this.tokens.length == 0) ?
            this.linebreak : this.tokens[0].element;
        nextElement.parentNode.insertBefore(
            newLine.linebreak, nextElement);
        return [newLine, this];
    } else if (position == this.length) {
        var newLine = new EditorLineModel('');
        var container = this.linebreak.parentNode;
        var nextElement = (container.lastChild == this.linebreak) ?
            null : this.linebreak.nextSibling;
        if (nextElement)
            container.insertBefore(newLine.linebreak, nextElement);
        else
            container.appendChild(newLine.linebreak);
        return [this, newLine];
    }

    var prevContents = this.contents.slice(0, position);
    var nextContents = this.contents.slice(position);
    var i = 0;
    var remaining = position;
    for (; i < this.tokens.length; i++) {
        if (remaining < this.tokens[i].length) {
            break;
        }
        remaining -= this.tokens[i].length;
    }
    var newLine = new EditorLineModel('');
    if (remaining == 0) {
        // this is easy, split the tokens into two.
        newLine.tokens = this.tokens.slice(i);
        this.tokens = this.tokens.slice(0, i);
    } else {
        // We need to split a token in the middle.
        var prev = this.tokens.slice(0, i);
        var next = this.tokens.slice(i + 1);
        var token = this.tokens[i];
        var newToken1 = new Token(
            token.text.slice(0, remaining), token.type);
        var newToken2 = new Token(
            token.text.slice(remaining), token.type);
        var container = this.linebreak.parentNode;
        var nextElement = (next.length != 0) ?
            next[0].element : this.linebreak;
        replaceElements([token], [newToken1, newToken2],
                        container, nextElement);
        prev.push(newToken1);
        next.unshift(newToken2);
        this.tokens = prev;
        newLine.tokens = next;
    }
    this.contents = prevContents;
    this.length = prevContents.length;
    newLine.contents = nextContents;
    newLine.length = nextContents.length;
    newLine.linebreak = this.linebreak;
    this.linebreak = document.createElement('br');
    var container = newLine.tokens[0].element.parentNode;
    container.insertBefore(this.linebreak, newLine.tokens[0].element);
    return [this, newLine];
};

function replaceElements(olds, news, container, nextElement) {
    var i;
    for (i = 0; i < olds.length; i++) {
        container.removeChild(olds[i].element);
    }
    for (i = 0; i < news.length; i++) {
        news[i].createElement();
        container.insertBefore(news[i].element, nextElement);
    }
};

EditorLineModel.prototype.updateContents = function(newContents) {
    var parseData = this.parseLine(newContents);
    var newTokens = parseData[0];
    var old_s = 0, new_s = 0;
    var old_e = this.tokens.length - 1, new_e = newTokens.length - 1;
    for (; old_e >= 0 && new_e >= 0; old_e--, new_e--) {
       if (!this.tokens[old_e].equalsTo(newTokens[new_e]))
           break;
    }
    for (; old_s <= old_e && new_s <= new_e; old_s++, new_s++) {
        if (!this.tokens[old_s].equalsTo(newTokens[new_s]))
            break;
    }

    if (old_s == old_e && new_s == new_e &&
        // Edit happens only in a token.  Simply replace the contents.
        this.tokens[old_e].type == newTokens[new_e].type) {
        this.tokens[old_e].setText(newTokens[new_e].text);
        this.tokens[old_e].setClass(newTokens[new_e].tokenClass);
    } else {
        // Otherwise, replacing elements.
        var container = this.linebreak.parentNode;
        var nextElement = (old_e < this.tokens.length - 1) ?
            this.tokens[old_e + 1].element : this.linebreak;
        replaceElements(this.tokens.slice(old_s, old_e + 1),
                        newTokens.slice(new_s, new_e + 1),
                        container, nextElement);
        this.tokens = this.tokens.slice(0, old_s).concat(
            newTokens.slice(new_s, new_e + 1),
            this.tokens.slice(old_e + 1));
    }
    this.contents = newContents;
    this.length = newContents.length;
    this.words = parseData[1];
};
