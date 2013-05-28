function EditorLineView(line) {
    this.length = line.length;
    this.tokens = Token.getTokens(line, null);
    this.container = document.createElement('div');
    this.linebreak = document.createElement('br');
    this.addElementsToContents();
}

EditorLineView.prototype.addElementsToContents = function() {
    this.container.innerHTML = '';
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (!token.element)
            token.createElement();
        this.container.appendChild(this.tokens[i].element);
    }
    this.container.appendChild(this.linebreak);
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
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];
        if (position < token.length) {
            return token.element.offsetLeft + token.element.offsetWidth /
                token.length * position;
        }
        position -= token.length;
    }
    if (this.tokens.length > 0) {
        var lastToken = this.tokens[this.tokens.length - 1];
        return lastToken.element.offsetLeft + lastToken.element.offsetWidth;
    }

    return 0;
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
            this.container.removeChild(token.element);
    }
    this.container.removeChild(this.linebreak);
    if (this.container.parentNode)
        this.container.parentNode.removeChild(this.container);
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
            this.container.removeChild(token.element);
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
        this.container.removeChild(token.element);
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
        for (var i = 0; i < this.tokens.length; i++) {
            var token = this.tokens[i];
            token.createElement();
            this.container.insertBefore(token.element, this.linebreak);
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
                this.container.removeChild(token.element);
                for (var j = 0; j < newTokens.length; j++) {
                    var newToken = newTokens[j];
                    newToken.createElement();
                    this.container.insertBefore(newToken.element, nextElement);
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
    var newTokens = Token.getTokens(chunk, null);
    for (var i = 0; i < newTokens.length; i++) {
        newTokens[i].createElement();
        this.container.insertBefore(newTokens[i].element, this.linebreak);
    }
    this.tokens = this.tokens.concat(newTokens);
};

EditorLineView.prototype.concat = function(another) {
    for (var i = 0; i < another.tokens.length; i++) {
        var token = another.tokens[i];
        if (token.element) {
            another.container.removeChild(token.element);
            this.container.insertBefore(token.element, this.linebreak);
        }
    }
    another.container.parentNode.removeChild(another.container);
    this.tokens = this.tokens.concat(another.tokens);
    this.length += another.length;
};

EditorLineView.prototype.splitAt = function(position) {
    if (position == 0) {
        var newLine = new EditorLineView('');
        this.container.parentNode.insertBefore(
            newLine.container, this.container);
        return [newLine, this];
    } else if (position == this.length) {
        var newLine = new EditorLineView('');
        var container = this.container.parentNode;
        if (container.lastChild == this.container)
            container.appendChild(newLine.container);
        else
            container.insertBefore(newLine.container, this.container.nextSibling);
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
        var nextElement = (next.length != 0) ?
            next[0].element : this.linebreak;
        replaceElements([token], [newToken1, newToken2],
                        this.container, nextElement);
        prev.push(newToken1);
        next.unshift(newToken2);
        this.tokens = prev;
        newLine.tokens = next;
    }

    for (var i = 0; i < newLine.tokens.length; i++) {
        var token = newLine.tokens[i];
        if (token.element) {
            token.element.parentNode.removeChild(token.element);
            newLine.container.insertBefore(token.element, newLine.linebreak);
        }
    }
    newLine.length = this.length - position;
    this.length = position;
    var container = this.container.parentNode;
    if (container.lastChild == this.container) {
        container.appendChild(newLine.container);
    } else {
        container.insertBefore(newLine.container, this.container.nextSibling);
    }
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