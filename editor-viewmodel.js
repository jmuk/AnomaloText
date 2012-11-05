function EditorViewModel(contents, contentArea) {
    this.Init(contents, contentArea);
    this.offsetInToken = 0;

    this.height = 0;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens.at(i);
        if (token.element.tagName == 'SPAN') {
            this.height = token.element.offsetHeight;
            break;
        }
    }
}

EditorViewModel.prototype.Init = function(contents, contentArea) {
    var tokens = [];
    while (contents.length > 0) {
        var token = Token.getToken(contents);
        if (token[0]) {
            tokens.push(token[0]);
            contents = token[1];
        } else {
            tokens.push(new Token(contents[0]));
            contents = contents.substring(1);
        }
    }

    while (contentArea.firstChild)
        contentArea.removeChild(contentArea.firstChild);
    for (var i = 0; i < tokens.length; i++) {
        contentArea.appendChild(tokens[i].element);
    }
    this.tokens = new Zipper(tokens);
};

EditorViewModel.prototype.getCaretPosition = function() {
    var token = this.tokens.current();
    var left = 0;
    var top = 0; 
    if (token.type == 'control') {
        var i = this.tokens.front.length - 1;
        if (this.tokens.front[i].type != 'control') {
            this.tokens.backward();
            this.offsetInToken = this.tokens.current().length;
        } else {
            while (this.tokens.front[i].type == 'control')
                i--;
	    left = 0;
            var count = this.tokens.front.length -1 -  i;
            top = this.tokens.front[i].element.offsetTop;
            top += this.tokens.front[i].element.offsetHeight * count;
        }
    } else {
        var element = token.element;
	top = element.offsetTop;
        left = element.offsetLeft;
        if (token.length > 0)
            left += element.offsetWidth * this.offsetInToken / token.length;
    }
    return {left: left, top: top};
};

EditorViewModel.prototype.moveBackward = function() {
    if (this.tokens.current().type != 'control' && this.offsetInToken > 0) {
        this.offsetInToken -= 1;
    } else if (this.tokens.backward()) {
        if (this.tokens.current().type == 'control' &&
            this.tokens.previous().type != 'control') {
            this.tokens.backward();
            this.offsetInToken = this.tokens.current().length;
        } else {
            this.offsetInToken =
		Math.max(this.tokens.current().length - 1, 0);
        }
    }
};

EditorViewModel.prototype.moveForward = function() {
    if (this.offsetInToken < this.tokens.current().length) {
        this.offsetInToken += 1;
    } else if (this.tokens.forward()) {
	if (this.tokens.previous().type == 'control') {
	    this.offsetInToken = 0;
	} else if (this.tokens.current().type == 'control') {
	    this.tokens.forward();
            this.offsetInToken = 0;
        } else {
            this.offsetInToken = 1;
        }
    }
};

EditorViewModel.prototype.movePreviousLine = function() {
    var i = this.tokens.currentIndex() - 1;
    for (; i >= 0; i--) {
	if (this.tokens.at(i).isReturn())
	    break;
    }
    i--;
    if (i < 0) {
	this.tokens.jumpTo(0);
	this.offsetInToken = 0;
	return;
    } else if (this.tokens.at(i).isReturn()) {
	this.tokens.jumpTo(i + 1);
	this.offsetInToken = 0;
	return;
    }

    var left = this.getCaretPosition().left;
    for (; i >= 0 && !this.tokens.at(i).isReturn(); i--) {
	var element = this.tokens.at(i).element;
	if (element.offsetLeft < left)
	    break;
    }
    if (i < 0 || this.tokens.at(i).isReturn())
	i = Math.max(0, i + 1);
    this.tokens.jumpTo(i);
    var token = this.tokens.current();
    var element = token.element;
    this.offsetInToken =
	Math.floor((left - element.offsetLeft) / element.offsetWidth * token.length);
};

EditorViewModel.prototype.moveNextLine = function() {
    if (this.tokens.current().isReturn()) {
	this.tokens.forward();
	this.offsetInToken = 0;
	return;
    }

    var i = this.tokens.currentIndex();
    for (; i < this.tokens.length; i++) {
	if (this.tokens.at(i).isReturn())
	    break;
    }
    i++;
    if (i >= this.tokens.length) {
	this.tokens.jumpTo(this.tokens.length - 1);
	if (this.tokens.current().isReturn())
	    this.tokens.backward();
	this.offsetInToken = Math.max(this.tokens.current().length - 1, 0);
	return;
    } else if (this.tokens.at(i).isReturn()) {
	this.tokens.jumpTo(i);
	this.offsetInToken = 0;
	return;
    }

    var left = this.getCaretPosition().left;
    for (; i < this.tokens.length && !this.tokens.at(i).isReturn(); i++) {
	var element = this.tokens.at(i).element;
	if (element.offsetLeft + element.offsetWidth >= left)
	    break;
    }
    if (i > this.tokens.length || this.tokens.at(i).isReturn())
	i--;
    this.tokens.jumpTo(i);
    var token = this.tokens.current();
    var element = token.element;
    this.offsetInToken =
	Math.floor((left - element.offsetLeft) / element.offsetWidth * token.length);
};

EditorViewModel.prototype.moveToStartOfLine = function() {
    if (this.tokens.current().isReturn())
	return;

    for (var i = this.tokens.currentIndex(); i > 0; i--) {
	if (this.tokens.at(i).isReturn())
	    break;
    }
    i++;
    this.tokens.jumpTo(i);
    this.offsetInToken = 0;
};

EditorViewModel.prototype.moveToEndOfLine = function() {
    if (this.tokens.current().isReturn())
	return;

    for (var i = this.tokens.currentIndex(); i < this.tokens.length; i++) {
	if (this.tokens.at(i).isReturn())
	    break;
    }
    i--;
    this.tokens.jumpTo(i);
    this.offsetInToken = this.tokens.current().length;
};

EditorViewModel.prototype.moveToPosition = function(x, y) {
    this.height = 0;
    for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens.at(i);
        if (token.element.tagName == 'SPAN') {
            this.height = token.element.offsetHeight;
            break;
        }
    }

    if (this.height <= 0)
        return;

    var numLines = Math.floor(y / this.height);
    var i = 0;
    for (; i < this.tokens.length && numLines > 0; i++) {
        var token = this.tokens.at(i);
        if (token.isReturn()) {
            numLines--;
	}
    }
    for (; i < this.tokens.length; i++) {
	var token = this.tokens.at(i);
	if (token.isReturn())
	    break;

	var element = token.element;
	if (element.offsetLeft + element.offsetWidth > x) {
	    var offset = x - element.offsetLeft;
	    this.tokens.jumpTo(i);
            this.offsetInToken =
                Math.floor(offset * token.length / token.element.offsetWidth);
	    return;
	}
    }

    i--;
    this.tokens.jumpTo(i);
    this.offsetInToken = this.tokens.current().length;
};

EditorViewModel.prototype.deletePreviousChar = function() {
    var current = this.tokens.current();
    if (this.offsetInToken == 0) {
        if (!this.tokens.backward())
            return;

        current = this.tokens.current();
        this.offsetInToken = this.tokens.current().length;
    }

    if (current.length <= 1) {
        current.element.parentNode.removeChild(current.element);
        this.tokens.remove();
	if (this.tokens.backward()) {
	    if (this.tokens.current().type == 'control') {
		this.tokens.forward();
		this.offsetInToken = 0;
	    } else {
		this.tokens.offsetInToken = this.tokens.current().length;
	    }
	} else {
	    this.offsetInToken = 0;    
	}
    } else {
        var text = current.text.substring(0, this.offsetInToken - 1) +
            current.text.substring(this.offsetInToken);
        current.setText(text);
        this.offsetInToken -= 1;
    }
};

EditorViewModel.prototype.insertTokenInto = function(token) {
    var contentArea = this.tokens.current().element.parentNode;
    var current = this.tokens.current();
    if (this.offsetInToken == 0) {
        contentArea.insertBefore(token.element, current.element);
        this.tokens.insert(token);
	this.tokens.backward();
	this.offsetInToken = token.length;
    } else if (this.offsetInToken == this.tokens.current().length) {
        if (contentArea.lastChild == current.element) {
            contentArea.appendChild(token.element);
        } else {
            contentArea.insertBefore(token.element, current.element.nextSibling);
        }
        this.tokens.forward();
        this.tokens.insert(token);
        this.tokens.backward();
        this.offsetInToken = token.length;
    } else {
        var tokenText = current.text;
        var tokenBefore = new Token(tokenText.substring(0, this.offsetInToken));
        var tokenAfter = new Token(tokenText.substring(this.offsetInToken));
        contentArea.insertBefore(tokenBefore.element, current.element);
        contentArea.insertBefore(token.element, current.element);
        contentArea.insertBefore(tokenAfter.element, current.element);
        contentArea.removeChild(current.element);
        this.tokens.remove();
        this.tokens.insert(tokenBefore);
        this.tokens.insert(token);
        this.tokens.insert(tokenAfter);
        this.tokens.backward();
        this.offsetInToken = 0;
    }
};

EditorViewModel.prototype.insertText = function(text) {
    var tokens = [];
    while (text.length > 0) {
        var result = Token.getToken(text);
        tokens.push(result[0]);
        text = result[1];
    }

    var token = this.tokens.current();
    if (token.type != 'control' && token.type != 'space' &&
        tokens.length == 1 && tokens[0].type == token.type) {
        text = tokens[0].text;
        var curr = token.text;
        var newText = curr.substring(0, this.offsetInToken) + text +
            curr.substring(this.offsetInToken);
        token.setText(newText);
        this.offsetInToken += text.length;
    } else {
        for (var i = 0; i < tokens.length; i++) {
            this.insertTokenInto(tokens[i]);
        }
    }
};

EditorViewModel.prototype.newLine = function() {
    var token = Token.getToken('\n');
    if (token[0]) {
	this.insertTokenInto(token[0]);
	this.tokens.forward();
	this.offsetInToken = 0;
    }
};