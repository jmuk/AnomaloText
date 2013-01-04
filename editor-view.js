function EditorView(contents) {
    this.Init(contents);
}

EditorView.prototype.Init = function(contents) {
    var lines = contents.split('\n');
    this.lines = [];
    for (var i = 0; i < lines.length; i++) {
        this.lines.push(new EditorLineView(lines[i]));
    }
};

EditorView.prototype.applyHighlight = function(ranges) {
    var offset = 0;
    for (var i = 0; i < this.lines.length; i++) {
        var lineRanges = [];
        var line = this.lines[i];
        for (var j = 0; j < ranges.length; j++) {
            if (ranges[j].end >= offset + line.length + 1)
                break;
            lineRanges.push(
                {start:ranges[j].start - offset,
                 end: ranges[j].end - offset,
                 type: ranges[j].type});
        }
        ranges = ranges.slice(j);
        line.applyHighlight(lineRanges);
        if (ranges.length == 0)
            break;
        // +1 to count the linebreak.
        offset += line.length + 1;
    }
};

EditorView.prototype.addElementsToContents = function(container) {
    for (var i = 0; i < this.lines.length; i++) {
        this.lines[i].addElementsToContents(container);
    }
};

EditorView.prototype.getPosition = function(loc) {
  return this.lines[loc.line].getPosition(loc.offset);
};

EditorView.prototype.getOffset = function(loc) {
    return this.lines[loc.line].getOffset(loc.position);
};

EditorView.prototype.getCaretPosition = function(loc) {
    var line = this.lines[loc.line];
    return {leftOffset: line.getOffset(loc.position),
            lines: loc.line};
};

EditorView.prototype.getElement = function(loc) {
    return this.lines[loc.line].getElementAt(loc.position);
};

EditorView.prototype.deleteRange = function(start, end) {
    if (start.line == end.line) {
	this.lines[start.line].deleteCharsIn(
	    start.position, end.position);
    } else {
	this.lines[start.line].deleteCharsIn(
	    start.position, this.lines[start.line].length);
	for (var i = start.line + 1; i < end.line; i++) {
	    this.lines[i].deleteAllChars();
	}
	this.lines[end.line].deleteCharsIn(0, end.position);
	this.lines[start.line].concat(this.lines[end.line]);
	this.lines = this.lines.slice(0, start.line + 1).concat(
	    this.lines.slice(end.line + 1));
    }
};

EditorView.prototype.insertText = function(text, loc) {
    var lines = text.split("\n");
    if (lines.length > 1) {
        var newLines = this.lines[loc.line].splitAt(
            loc.position);
        newLines[0].insertTextAt(lines[0], newLines[0].length);
	var newLinesMiddle = [];
        for (var i = 1; i < lines.length - 1; i++) {
            var newLine = new EditorLineView(lines[i]);
            newLine.addElementsBefore(this.lines[loc.line + 1]);
            newLinesMiddle.push(newLine);
        }
        newLines[1].insertTextAt(lines[lines.length - 1], 0);
	this.lines = this.lines.slice(0, loc.line).concat(
	    [newLines[0]], newLinesMiddle, [newLines[1]]).concat(
	    this.lines.slice(loc.line + 1));
    } else {
        this.lines[loc.line].insertTextAt(text, loc.position);
    }
};
