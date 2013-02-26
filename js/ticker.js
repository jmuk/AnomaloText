function TickerController(element) {
    this.element = element;
    this.elementSize = {width: 0, height: 0};
    this.visibility = {mouse: true, caret: true};
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
};

TickerController.prototype.setText = function(newText) {
    this.element.textContent = newText;
    this.updateSize();
    this.updateVisibility();
    this.updateSize();
};

TickerController.prototype.updateSize = function() {
    if (this.element.hidden)
        return;
    this.elementSize = {width: this.element.offsetWidth,
                        height: this.element.offsetHeight};
};

TickerController.prototype.updateVisibility = function() {
    // Do not show the element when the contents is empty.
    if (this.element.textContent.length == 0) {
        this.element.hidden = true;
        return;
    }
    var visible = true;
    for (var k in this.visibility)
        visible = visible && this.visibility[k];
    this.element.hidden = !visible;
    if (visible)
        this.updateSize();
};

TickerController.prototype.checkVisibility = function(pos) {
    var left = window.innerWidth - this.elementSize.width;
    var top = window.innerHeight - this.elementSize.height;
    var buffer = 20; /* px */
    return (pos.left < left - buffer || pos.top < top - buffer);
};

// It just closes the ticker element when mouse closes to the element.
TickerController.prototype.onMouseMove = function(ev) {
    this.visibility.mouse = this.checkVisibility({left: ev.pageX, top: ev.pageY});
    this.updateVisibility();
};

TickerController.prototype.onCaretMove = function(loc, pos) {
    this.setText(loc.line + "," + loc.position);
    this.visibility.caret = this.checkVisibility(pos);
    this.updateVisibility();
};