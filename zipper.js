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
	return front[index];

    index -= this.front.length;
    if (index < this.back.length)
	return this.back[this.back.length - index];

    return null;
};

Zipper.prototype.toList = function() {
    return this.front + this.back.reverse();
}