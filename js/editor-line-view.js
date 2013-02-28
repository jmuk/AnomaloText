function EditorLineView(line) {
    this.length = line.length;
    this.tokens = Token.getTokens(line, null);
    this.linebreak = document.createElement('br');
}

EditorLineView.prototype.addElementsToContents = function(container) {
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (!token.element)
            token.createElement();
        container.appendChild(this.tokens[i].element);
    }
    container.appendChild(this.linebreak);
};

EditorLineView.prototype.addElementsBefore = function(nextline) {
    if (this.linebreak.parentNode)
        return;

    var nextElement = (nextline.tokens.length == 0) ? nextline.linebreak : nextline.tokens[0].element;
    var parent = nextElement.parentNode;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (!token.element)
            token.createElement();
        parent.insertBefore(token.element, nextElement);
    }
    parent.insertBefore(this.linebreak, nextElement);
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

EditorLineView.prototype.highlightParen = function(position, additionalName) {
    var remaining = position;
    var token = null;
    for (var i = 0; i < this.tokens.length; i++) {
        if (remaining < this.tokens[i].length) {
            token = this.tokens[i];
            break;
        }
        remaining -= this.tokens[i].length;
    }
    if (!token)
        return null;

    var className = 'highlighted';
    if (additionalName)
        className += '-' + additionalName;
    var element = token.element;
    var width = element.offsetWidth / token.length;
    var div = document.createElement('div');
    div.className = className;
    div.style.width = width - 2 + 'px';
    div.style.height = element.offsetHeight - 2 + 'px';
    div.style.left = element.offsetLeft + remaining * width + 'px';
    div.style.top = element.offsetTop + 'px';
    div.style.position = 'absolute';
    div.style.zIndex = EditorZIndice.HIGHLIGHT;
    return div;
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
    this.length = 0;
};

EditorLineView.prototype.deleteCharsIn = function(start, end) {
    if (start == end)
        return;
    this.length -= Math.max(0, end - start);
    var offset = 0;
    var startIndex;
    var endIndex;
    var startOffset;
    var endOffset;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (offset <= start && offset + token.length >= start) {
            startIndex = i;
            startOffset = start - offset;
        }
        if (offset <= end && offset + token.length >= end) {
            endIndex = i;
            endOffset = end - offset;
        }
        if (endToken)
            break;
        offset += token.length;
    }
    if (startIndex == endIndex) {
        var token = this.tokens[startIndex];
        var newText = token.text.slice(0, startOffset) + token.text.slice(endOffset);
        if (newText == "") {
            token.element.parentNode.removeChild(token.element);
            this.tokens = this.tokens.slice(0, startIndex).concat(
                this.tokens.slice(endIndex + 1));
        } else {
            token.setText(newText);
        }
        return;
    }

    var removeStart;
    var removeEnd;
    var startToken = this.tokens[startIndex];
    if (startOffset == 0) {
        removeStart = startIndex;
    } else {
        startToken.setText(startToken.text.slice(0, startOffset));
        removeStart = startIndex + 1;
    }
    var endToken = this.tokens[endIndex];
    if (endOffset == endToken.length) {
        removeEnd = endIndex;
    } else {
        endToken.setText(endToken.text.slice(endOffset));
        removeEnd = endIndex - 1;
    }
    for (var i = removeStart; i <= removeEnd; i++) {
        var token = this.tokens[i];
        token.element.parentNode.removeChild(token.element);
    }
    this.tokens = this.tokens.slice(0, removeStart).concat(this.tokens.slice(removeEnd + 1));
};

EditorLineView.prototype.deleteCharAt = function(position) {
    this.deleteCharsIn(position, position + 1);
};

EditorLineView.prototype.insertTextAt = function(chunk, position) {
    if (chunk.length == 0)
        return;
    if (this.tokens.length == 0) {
        this.length = chunk.length;
        this.tokens = Token.getTokens(chunk, null);
        var parent = this.linebreak.parentNode;
        for (var i = 0; i < this.tokens.length; i++) {
            var token = this.tokens[i];
            token.createElement();
            parent.insertBefore(token.element, this.linebreak);
        }
        return;
    }

    this.length += chunk.length;
    var p = 0;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (p <= position && p + token.length > position) {
            // in-token editing.
            var newText = token.text.slice(0, position - p) + chunk +
                token.text.slice(position - p);
            var newTokens = Token.getTokens(newText, null);
            if (newTokens.length == 1 && newTokens[0].type == token.type) {
                token.setText(newText);
            } else {
                var nextElement = (i < this.tokens.length - 1) ?
                    this.tokens[i + 1].element : this.linebreak;
                var parent = nextElement.parentNode;
                parent.removeChild(token.element);
                for (var j = 0; j < newTokens.length; j++) {
                    var newToken = newTokens[j];
                    newToken.createElement();
                    parent.insertBefore(newToken.element, nextElement);
                }
                this.tokens = this.tokens.slice(0, i).concat(newTokens, this.tokens.slice(i + 1));
            }
            return;
        } else if (p + token.length == position){
            var previousToken = token;
            var newText = previousToken.text + chunk;
            var newTokens = Token.getTokens(newText, null);
            if (newTokens.length == 1 && previousToken.type == newTokens[0].type) {
                previousToken.setText(newText);
                return;
            }
        }
        p += token.length;
    }
};

EditorLineView.prototype.concat = function(another) {
    this.linebreak.parentNode.removeChild(this.linebreak);
    this.linebreak = another.linebreak;
    this.tokens = this.tokens.concat(another.tokens);
    this.length += another.length;
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
    newLine.length = this.length - position;
    newLine.linebreak = this.linebreak;
    this.length = position;
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