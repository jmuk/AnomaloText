function EditorView() {
}

EditorView.prototype.Init = function(contents) {
    var lines = contents.split('\n');
    this.lines = [];
    for (var i = 0; i < lines.length; i++) {
        this.lines.push(new EditorLineView(lines[i]));
    }
    this.selection = null;

    // Creating caret indicator.
    this.editor = document.getElementById('editor');
    var menu = document.getElementById('menu');
    var menuHeight = menu.offsetHeight + menu.offsetTop;
    this.editor.style.height = window.innerHeight - menuHeight + 'px';
    var indicator = document.createElement('div');
    indicator.style.border = 'solid 1px';
    indicator.style.width = '0';
    indicator.style.top = 0;
    indicator.style.left = 0;
    indicator.style.position = 'absolute';
    indicator.style.zIndex = EditorZIndice.HIGHLIGHT;
    this.editor.appendChild(indicator);
    this.caretIndicator = indicator;
    this.caretPosition = null;

    this.parens = [];
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
    this.contentArea = container;
    this.updateHeight();
};

EditorView.prototype.updateHeight = function() {
    this.lineHeight = Math.floor(this.contentArea.offsetHeight / this.lines.length);
    this.caretIndicator.style.height = this.lineHeight;
};

EditorView.prototype.getPosition = function(loc) {
  return this.lines[loc.line].getPosition(loc.offset);
};

EditorView.prototype.getOffset = function(loc) {
    return this.lines[loc.line].getOffset(loc.position);
};

EditorView.prototype.getCaretPosition = function(loc) {
    var line = this.lines[loc.line];
    return {top: loc.line * this.lineHeight,
            left: line.getOffset(loc.position)};
};

EditorView.prototype.getElement = function(loc) {
    return this.lines[loc.line].getElementAt(loc.position);
};

EditorView.prototype.getVisibleLines = function() {
    var top = this.editor.scrollTop;
    var bottom = top + this.editor.offsetHeight;
    return {
        start: Math.ceil(top / this.lineHeight),
        end: Math.floor(bottom / this.lineHeight) - 1
    };
};

EditorView.prototype.hideCaretIndicator = function() {
    this.caretIndicator.style.visibility = 'hidden';
};

EditorView.prototype.showCaretIndicator = function() {
    this.caretIndicator.style.visibility = 'visible';
};

EditorView.prototype.updateCaretIndicator = function(loc) {
    var top = loc.line * this.lineHeight;
    var left = this.getOffset(loc);
    var bottom = top + this.lineHeight;
    var screenBottom =
        this.editor.scrollTop + this.editor.clientHeight;
    if (top < this.editor.scrollTop)
        this.editor.scrollTop = top;
    if (bottom > screenBottom)
        this.editor.scrollTop += (bottom - screenBottom);

    var screenLeft =
        this.editor.scrollLeft;
    var screenRight = screenLeft + this.editor.clientWidth;
    if (left < screenLeft)
        this.editor.scrollLeft = left;
    if (left > screenRight)
        this.editor.scrollLeft += (left - screenRight);
    this.caretPosition = {left: top, left: left};
    this.caretIndicator.style.left = left + 'px';
    this.caretIndicator.style.top = top + 'px';
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

EditorView.prototype.createSelectionDiv = function(left, top, width) {
    var div = document.createElement('div');
    div.style.left = left + 'px';
    div.style.top = top + 'px';
    div.style.width = width + 'px';
    div.style.height = this.lineHeight + 'px';
    div.style.zIndex = EditorZIndice.SELECTION;
    div.style.position = 'absolute';
    div.className = 'selection';
    this.contentArea.appendChild(div);
    this.selection.push(div);
};

EditorView.prototype.updateSelection = function(selection) {
    if (this.selection) {
        for (var i = 0; i < this.selection.length; ++i) {
            var s = this.selection[i];
            s.parentNode.removeChild(s);
        }
        this.selection = null;
    }

    if (!selection)
        return;

    this.selection = [];
    if (selection.start.line == selection.end.line) {
        this.createSelectionDiv(
            selection.start.offset,
            selection.start.line * this.lineHeight,
            selection.end.offset - selection.start.offset);
    } else {
        this.createSelectionDiv(
            selection.start.offset,
            selection.start.line * this.lineHeight,
            this.contentArea.offsetWidth - selection.start.offset);
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            this.createSelectionDiv(
                0, i * this.lineHeight,
                this.contentArea.offsetWidth);
        }
        this.createSelectionDiv(
            0, selection.end.line * this.lineHeight,
            selection.end.offset);
    }
};

EditorView.prototype.clearParenHighlight = function(loc, additionalName) {
    for (var i = 0; i < this.parens.length; i++) {
        var p = this.parens[i];
        p.parentNode.removeChild(p);
    }
    this.parens = [];
};

EditorView.prototype.highlightParen = function(loc, additionalName) {
    var element = this.lines[loc.line].highlightParen(loc.position, additionalName);
    if (!element)
        return;

    this.editor.appendChild(element);
    this.parens.push(element);
};

EditorView.prototype.pageUp = function(lines) {
    var height = lines * this.lineHeight;
    this.editor.scrollTop = Math.max(this.editor.scrollTop - height, 0);
};

EditorView.prototype.pageDown = function(lines) {
    var height = lines * this.lineHeight;
    this.editor.scrollTop =
	Math.min(this.editor.scrollTop + height,
		 this.editor.scrollHeight - this.editor.offsetHeight);
};