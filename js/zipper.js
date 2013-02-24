function Zipper(lst) {
    this.front = [];
    if (lst) {
        this.back = lst.reverse();
        this.length = lst.length;
    } else {
        this.back = [];
        this.length = 0;
    }
}

Zipper.prototype.current = function() {
    if (this.back.length == 0)
	return null;

    return this.back[this.back.length - 1];
};

Zipper.prototype.currentIndex = function() {
    return this.front.length;
};

Zipper.prototype.replace = function(newElem) {
    if (this.back.length == 0)
	return;
    this.back[this.back.length - 1] = newElem;
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
};

Zipper.prototype.forward = function(force) {
    var minimum = force ? 0 : 1;
    if (this.back.length <= minimum)
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
    this.length++;
};

Zipper.prototype.remove = function() {
    if (this.length > 0)
	this.length--;
    if (this.back.length == 0)
	return this.front.pop();
    else
	return this.back.pop();
};

Zipper.prototype.at = function(index) {
    if (index < this.front.length)
	return this.front[index];

    index -= this.front.length;
    if (index < this.back.length)
	return this.back[this.back.length - index - 1];

    return null;
};
