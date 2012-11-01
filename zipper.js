function Zipper(lst) {
    this.front = [];
    this.back = lst.reverse();
    this.length = lst.length;
}

Zipper.prototype.current = function() {
    if (this.back.length == 0)
	return null;

    return this.back[this.back.length - 1];
};

Zipper.prototype.previous = function() {
    if (this.front.length == 0)
	return null;
    return this.front[this.front.length - 1];
};

Zipper.prototype.next = function() {
    if (this.back.length < 2)
	return null;
    return this.back[this.back.length - 2];
}

Zipper.prototype.forward = function() {
    if (this.back.length == 0)
	return false;
    this.front.push(this.back.pop());
    return true;
};

Zipper.prototype.backward = function() {
    if (this.front.length == 0)
	return false;
    this.back.push(this.front.pop());
    return true;
};

Zipper.prototype.jumpTo = function(i) {
    if (this.front.length > i) {
	i = Math.max(0, i);
	while (this.front.length > i)
	    this.backward();
    } else {
	i = i - this.front.length;
	for (; i > 0 && this.back.length > 0; i--) {
	    this.forward();
	}
    }
};

Zipper.prototype.insert = function(element) {
    this.front.push(element);
};

Zipper.prototype.remove = function() {
    if (this.back.length == 0)
	return this.front.pop();
    else
	return this.back.pop();
}

Zipper.prototype.at = function(index) {
    if (index < this.front.length)
	return this.front[index];

    index -= this.front.length;
    if (index < this.back.length)
	return this.back[this.back.length - index - 1];

    return null;
};

Zipper.prototype.toList = function() {
    return this.front + this.back.reverse();
};