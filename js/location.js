// Location holds a Location in an editing text, which means 'line' and 'position'.

function Location(content, line, position) {
    _.extend(this, Backbone.Events);
    this.content = content;
    this.setLine(line);
    this.setPosition(position);
};

Location.prototype.equals = function(other) {
    return this.line == other.line && this.position == other.position;
};

Location.prototype.sameLine = function(other) {
  return this.line == other.line;  
};

Location.prototype.lessThan = function(other) {
    return this.line < other.line ||
        (this.line == other.line && this.position < other.position);
};

Location.prototype.setLocation = function(newLocation) {
    this.content = newLocation.content;
    this.line = newLocation.line;
    this.setPosition(newLocation.position);
};

Location.prototype.setLine = function(line) {
    var newLine = Math.max(Math.min(line, this.content.getLines()), 0);
    this.line = newLine;
    this.trigger('move', this);
};

Location.prototype.setPosition = function(position) {
    var maxPosition = this.content.getCharsInLine(this.line);
    var newPosition = Math.max(Math.min(position, maxPosition), 0);
    this.position = newPosition;
    this.trigger('move', this);
};

Location.prototype.copy = function() {
    return new Location(this.content, this.line, this.position);
};

Location.prototype.moveChars = function(chars) {
    this.position += chars;
    if (this.position < 0) {
        if (this.line > 0) {
            this.line--;
            this.position = this.content.getCharsInLine(this.line) + this.position + 1;
        } else {
            this.position = 0;
        }
    } else if (this.position > this.content.getCharsInLine(this.line)) {
        if (this.line < this.content.getLines() - 1) {
            this.position -= (this.content.getCharsInLine(this.line) + 1);
            this.line++;
        } else {
            this.position = this.content.getCharsInLine(this.line);
        }
    }
    this.trigger('move', this);
};