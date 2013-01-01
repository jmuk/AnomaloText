function EditorLineView(model, line) {
    this.model = model;
    this.contents = line;
    this.length = line.length;
    var data = this.segmentWords(line);
    this.tokens = data.tokens;
    this.words = data.words;
    this.indentLength = data.indentLength;
    this.linebreak = document.createElement('br');
}

EditorLineView.prototype.addElementsToContents = function(contents) {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (!token.element)
            token.createElement();
        contents.appendChild(this.tokens[i].element);
    }
    contents.appendChild(this.linebreak);
};

EditorLineView.prototype.segmentWords = function(line) {
    var pattern = this.model.mode.pattern;
    var result = {};
    var index = 0;
    result.tokens = [];
    result.words = [];
    result.indentLength = /^\s*/.exec(line)[0].length;
    var tokens = Token.getTokens(line, null);
    for (var i = 0; i < tokens.length; i++) {
	var token = tokens[i];
	while (token) {
	    var m = token.text.match(pattern);
	    if (m && m[0].length > 0) {
		if (m.index > 0) {
		    var next = token.splitAt(m.index);
		    result.tokens.push(token);
		    token = next;
		}
		var length = m[0].length;
		var next = token.splitAt(length);
		result.tokens.push(token);
		result.words.push({start: index, end: index + length});
		index += length;
		token = next;
	    } else {
		result.tokens.push(token);
		index += token.length;
		break;
	    }
	}
    }
    return result;
};

EditorLineView.prototype.applyHighlight = function(ranges) {
    var result = [];
    var offset = 0;
    var token_index = 0;
    var range_index = 0;
    while (token_index < this.tokens.length && range_index < ranges.length) {
	var token = this.tokens[token_index];
	var range = ranges[range_index];
	if (offset + token.length <= range.start) {
	    offset += token.length;
	    token.setClass(null);
	    result.push(token);
	    token_index++;
	    continue;
	}
	if (offset > range.start) {
	    range_index++;
	    continue;
	}
	if (offset == range.start) {
	    if (offset + token.length > range.end) {
		var trailing = token.splitAt(range.end - offset);
		token.setClass(range.type);
		this.tokens[token_index] = trailing;
		range_index++;
	    } else {
		token.setClass(range.type);
		token_index++;
		if (offset + token.length == range.end)
		    range_index++;
		else
		    range.start = offset + token.length;
	    }
	} else {
	    var trailing = token.splitAt(range.start - offset);
	    token.setClass(null);
	    this.tokens[token_index] = trailing;
	}
	offset += token.length;
	result.push(token);
    }
    for (; token_index < this.tokens.length; token_index++) {
	this.tokens[token_index].setClass(null);
	result.push(this.tokens[token_index]);
    }
    this.tokens = result;
};

EditorLineView.prototype.getOffset = function(position) {
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

EditorLineView.prototype.getPosition = function(offset) {
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

EditorLineView.prototype.getElementAt = function(position) {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (position < token.length) {
            return token.element;
        }
        position -= token.length;
    }
    return null;
};

EditorLineView.prototype.getPreviousWord = function(position) {
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

EditorLineView.prototype.getNextWord = function(position) {
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

EditorLineView.prototype.deleteAllChars = function() {
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

EditorLineView.prototype.deleteCharsIn = function(start, end) {
    var newContents = this.contents.slice(0, start) +
        this.contents.slice(end);
    this.updateContents(newContents);
};

EditorLineView.prototype.deleteCharAt = function(position) {
    this.deleteCharsIn(position, position + 1);
};

EditorLineView.prototype.fixIndent = function(length) {
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

EditorLineView.prototype.insertTextAt = function(chunk, position) {
    if (chunk.length == 0)
        return;

    var newContents = this.contents.slice(0, position) +
        chunk + this.contents.slice(position);
    this.updateContents(newContents);
};

EditorLineView.prototype.concat = function(another) {
    this.linebreak.parentNode.removeChild(this.linebreak);
    this.linebreak = another.linebreak;
    this.tokens = this.tokens.concat(another.tokens);
    this.length += another.length;
    this.contents += another.contents;
};

EditorLineView.prototype.splitAt = function(position) {
    if (position == 0) {
        var newLine = new EditorLineView('');
        var nextElement = (this.tokens.length == 0) ?
            this.linebreak : this.tokens[0].element;
        nextElement.parentNode.insertBefore(
            newLine.linebreak, nextElement);
        return [newLine, this];
    } else if (position == this.length) {
        var newLine = new EditorLineView('');
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
    var newLine = new EditorLineView('');
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

EditorLineView.prototype.updateContents = function(newContents) {
    var parseData = this.segmentWords(newContents);
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
