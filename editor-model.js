function EditorModel(contents) {
    this.Init(contents);
    this.caretPosition = 0;
    this.idealCaretOffset = null;
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

EditorModel.prototype.deletePreviousChar = function() {
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
    this.tokens = this.parseLine(line);
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
    var tokens = [];
    var words = /^[a-zA-Z_0-9]+/;
    while (line.length > 0) {
        var m = line.match(words);
        var length = 1;
        var tokenType = 'other';
        if (m) {
            length = m[0].length;
            tokenType = 'words';
        } else if (isParen(line[0])) {
            tokenType = 'paren';
        }
        tokens.push.apply(
            tokens, Token.getTokens(line.slice(0, length), tokenType));
        line = line.slice(length);
    }
    return tokens;
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

EditorLineModel.prototype.deleteCharAt = function(position) {
    var newContents = this.contents.slice(0, position) +
        this.contents.slice(position + 1);
    this.updateContents(newContents);
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
    this.tokens += another.tokens;
    this.length += another.length;
    this.contents += another.contents;
};

EditorLineModel.prototype.splitAt = function(position) {
    if (position == 0) {
        var newLine = new EditorLineModel('');
        var nextElement = (this.tokens.length == 0) ?
            this.linebreak : this.tokens[0];
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
    var newTokens = this.parseLine(newContents);
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
};
