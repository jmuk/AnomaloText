function EditorLineModel(line) {
    this.contents = line;
    this.length = line.length;
    var data = this.parseLine(line);
    this.tokens = data.tokens;
    this.words = data.words;
    this.indentLength = data.indentLength;
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
    var result = {};
    result.tokens = [];
    result.words = [];
    result.indentLength = /^\s*/.exec(line)[0].length;
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
                result.words.push(
                    {start: index, end: index + length});
                break;
            }
        }
        if (!tokenType && isParen(line[0])) {
            tokenType = 'paren';
        }
        result.tokens.push.apply(
            result.tokens, Token.getTokens(line.slice(0, length), tokenType));
        line = line.slice(length);
        index += length;
    }
    return result;
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

EditorLineModel.prototype.fixIndent = function(length) {
    if (this.indentLength == length)
	return;
    if (this.indentLength > length) {
	var removeLength = this.indentLength - length;
	this.length -= removeLength;
	this.indentLength -= removeLength;
	while (removeLength > 0 && this.tokens.length > 0) {
	    var token = this.tokens[0];
	    removeLength -= token.length;
	    token.element.parentNode.removeChild(token.element);
	    this.tokens.shift();
	}
    } else {
	var fillLength = length - this.indentLength;
	var element =
	    (this.tokens.length > 0) ? this.tokens[0].element : this.linebreak;
	for (var i = 0; i < fillLength; i++) {
	    var token = new Token(' ', 'space', '');
	    token.createElement();
	    element.parentNode.insertBefore(token.element, element);
	    this.tokens.unshift(token);
	}
	this.contents = (new Array(fillLength + 1)).join(" ") + this.contents;
	this.length += fillLength;
	this.indentLength += fillLength;
    }
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
    var newTokens = parseData.tokens;
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
    this.words = parseData.words;
    this.indentLength = parseData.indentLength;
};
