// EditorModel manages the cursor position, selections, and so on.
// TODO: parens should be defined in the mode.
var ParenType = {
    PAREN_OPEN: 1,
    PAREN_CLOSE: -1
};

function isParen(text) {
    var parens = "({[]})";
    if (text.length != 1)
        return null;

    var i = parens.indexOf(text);

    if (i < 0)
        return null;
    if (i < parens.length / 2)
        return ParenType.PAREN_OPEN;
    else
        return ParenType.PAREN_CLOSE;
}

function EditorModel(mode) {
    this.idealCaretOffset = null;
    this.selection = null;
    this.editingId = {count: 0, lineEditCount: 0};
    this.content = new Content();
    this.location = new Location(this.content, 0, 0);
    this.setMode(mode);
    this.askHighlight();
    // TODO: this has to be merged into the system clipboard.
    this.killring = [];
    this.editHistory = new EditingHistory();
}

EditorModel.prototype.setContents = function(content) {
    this.content = content;
    this.location.setLocation(new Location(this.content, 0, 0));
    this.askHighlight();
    if (this.view)
        this.view.Reset(this.content);
};

EditorModel.prototype.setMode = function(mode) {
    if (this.mode == mode)
        return;

    if (this.mode)
        this.mode.off('load', this.askHighlight, this);
    this.mode = mode;
    this.mode.on('load', this.askHighlight, this);
};

EditorModel.prototype.onHighlighted = function(editingId, range) {
    if (!this.view)
        return;
    if (this.editingId.count != editingId.count)
        return;

    this.view.applyHighlight(range);
};

EditorModel.prototype.askHighlight = function() {
    this.editingId.count++;
    this.content.getFullText((function(text) {
        this.mode.askHighlight(text, this.editingId,
                               this.onHighlighted.bind(this));
    }).bind(this));
};

EditorModel.prototype.onIndent = function(editingId, target, indent) {
    if (this.editingId.lineEditCount != editingId.lineEditCount)
        return;

    var line = this.content.getLine({line: target});
    // TODO: think about horizontal tabs
    var currentIndent = line.match(/^\s*/)[0].length;
    if (indent > currentIndent) {
        this.insertTextInternal(Array(indent - currentIndent + 1).join(' '));
    } else if (indent < currentIndent){
        this.deleteRange(
            new Location(this.content, target, 0),
            new Location(this.content, target, currentIndent - indent));
    }
};

EditorModel.prototype.askIndent = function(line) {
    this.mode.indentFor(
        this.content.lines,
        line, this.editingId, this.onIndent.bind(this));
};

EditorModel.prototype.getCurrentElement = function() {
    return this.view.getElement(this.location);
};

EditorModel.prototype.getSelection = function() {
    if (!this.selection)
        return null;

    var e1 = this.selection.origin;
    var e2 = this.selection.current;
    if (e1.equals(e2)) {
        return null;
    } else if (e2.lessThan(e1)) {
        var tmp = e2;
        e2 = e1;
        e1 = tmp;
    }
    return {start: e1, end: e2};
};

EditorModel.prototype.getLineCount = function() {
    return this.content.getLines();
};

EditorModel.prototype.maybeHighlightParens = function() {
    this.view.clearParenHighlight();
    var parenInfo = this.content.getParenPairs(this.location, isParen);
    if (parenInfo.start == null)
        return;

    if (parenInfo.end == null) {
        this.view.highlightParen(parenInfo.start, 'warning');
    } else {
        this.view.highlightParen(parenInfo.start);
        this.view.highlightParen(parenInfo.end);
    }
};

EditorModel.prototype.moveCaret = function(newLocation) {
    this.location.setLocation(newLocation);
    this.idealCaretOffset = null;
};

EditorModel.prototype.startMouseSelection = function(leftOffset, lines) {
    this.selection = {};
    lines = Math.max(Math.min(this.content.getLines() - 1, lines), 0);
    this.selection.origin = new Location(
        this.content,
        lines,
        this.view.getPosition({line: lines, offset: leftOffset})
    );
    this.selection.current = new Location(
        this.content,
        lines,
        this.view.getPosition({line: lines, offset: leftOffset})
    );
};

EditorModel.prototype.updateMouseSelection = function(leftOffset, lines) {
    if (lines < 0 || !this.selection)
        return;
    lines = Math.min(this.content.getLines() - 1, lines);
    this.selection.current.setLine(lines);
    this.selection.current.setPosition(
        this.view.getPosition({line: lines, offset: leftOffset}));
    this.moveCaret(this.selection.current);
};

EditorModel.prototype.endMouseSelection = function() {
    if (!this.selection)
        return;

    if (this.selection.origin.equals(this.selection.current))
        this.selection = null;
};

EditorModel.prototype.moveToPosition = function(leftOffset, lines) {
    lines = Math.max(Math.min(this.content.getLines() - 1, lines), 0);
    this.moveCaret(
        new Location(this.content,
                     lines,
                     this.view.getPosition({line: lines, offset: leftOffset})));
};

EditorModel.prototype.moveBackward = function(select) {
    if (!select && this.selection) {
        this.moveCaret(this.getSelection().start);
        this.selection = null;
        return;
    }

    if (select)
        this.prepareSelection();

    this.location.moveChars(-1);
    this.idealCaretOffset = null;

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveForward = function(select) {
    if (!select && this.getSelection()) {
        var s = this.getSelection();
        this.moveCaret(s.start);
        this.selection = null;
        return;
    }

    if (select)
        this.prepareSelection();

    this.location.moveChars(1);
    this.idealCaretOffset = null;

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.movePreviousWord = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var content = this.content.getLine(this.location).slice(0, this.location.position);
    while (true) {
        var non_words = content.split(this.mode.pattern);
        if (non_words.length > 1) {
            content = content.slice(0, content.length - non_words[non_words.length - 1].length);
            break;
        }
        if (this.location.line == 0) {
            this.location.setPosition(0);
            this.idealCaretOffset = null;
            if (select)
                this.postProcessSelection();
            return;
        }

        this.location.line--;
        this.location.position = this.content.getCharsInLine(this.location.line);
        content = this.content.getLine(this.location);
    }

    var pattern_str = this.mode.pattern.toString();
    var lastMatcher = RegExp(pattern_str.slice(1, pattern_str.length - 1) + "$");
    var m = lastMatcher.exec(content);
    if (m) {
        this.location.setPosition(content.length - m[0].length);
        this.idealCaretOffset = null;
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveNextWord = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var content = this.content.getLine(this.location).slice(this.location.position);
    while (true) {
        var m = this.mode.pattern.exec(content);
        if (m) {
            this.location.moveChars(m.index + m[0].length);
            break;
        }
        if (this.location.line < this.content.getLines() - 1) {
            this.location.line++;
            this.location.position = 0;
            content = this.content.getLine(this.location);
        } else {
            this.setPosition(this.content.getCharsInLine(this.location.line));
            break;
        }
    }

    this.idealCaretOffset = null;
    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.movePreviousLine = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    if (this.idealCaretOffset == null) {
        this.idealCaretOffset = this.view.getOffset(this.location);
    }
    if (this.location.line > 0) {
        this.location.line--;
        this.location.setPosition(this.view.getPosition(
            {line: this.location.line,
             offset: this.idealCaretOffset}));
    } else {
        this.location.position = 0;
        this.idealCaretOffset = null;
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveNextLine = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    if (this.idealCaretOffset == null) {
        this.idealCaretOffset = this.view.getOffset(this.location);
    }
    if (this.location.line < this.content.getLines() - 1) {
        this.location.line++;
        this.location.setPosition(this.view.getPosition(
            {line: this.location.line,
             offset: this.idealCaretOffset}));
    } else {
        this.location.setPosition(this.content.getCharsInLine(this.location.line));
        this.idealCaretOffset = null;
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.movePreviousPage = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var visibleLines = this.view.getVisibleLines();
    var pageLines = visibleLines.end - visibleLines.start;
    var currentLine = this.location.line;
    var newLine = Math.max(currentLine - pageLines + 1, 0);
    if (newLine < currentLine) {
        if (this.idealCaretOffset == null)
            this.idealCaretOffset = this.view.getOffset(this.location);
        this.location.line = newLine;
        this.location.setPosition(this.view.getPosition(
            {line: this.location.line,
             offset: this.idealCaretOffset}));
        this.view.pageUp(pageLines - 1);
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveNextPage = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var visibleLines = this.view.getVisibleLines();
    var pageLines = visibleLines.end - visibleLines.start;
    var currentLine = this.location.line;
    var newLine = Math.min(currentLine + pageLines - 1,
                           this.content.getLines() - pageLines);
    if (newLine > currentLine) {
        if (this.idealCaretOffset == null)
            this.idealCaretOffset = this.view.getOffset(this.location);
        this.location.line = newLine;
        this.location.setPosition(this.view.getPosition(
            {line: this.location.line,
             offset: this.idealCaretOffset}));
        this.view.pageDown(pageLines - 1);
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveToStartOfLine = function() {
    this.location.position = 0;
    this.idealCaretOffset = null;
};

EditorModel.prototype.moveToEndOfLine = function() {
    this.location.setPosition(this.content.getCharsInLine(this.location.line));
    this.idealCaretOffset = null;
};

EditorModel.prototype.ensureCaretVisible = function(lines) {
    // Do not modify the caret position when selecting.
    if (this.selection)
        return;

    var currentOffset = this.view.getOffset(this.location);
    var changed = false;
    var oldLine = this.location.line;
    this.location.line = Math.min(Math.max(this.location.line, lines.start), lines.end);
    if (this.location.line != oldLine) {
        if (this.idealCaretOffset == null)
            this.idealCaretOffset = currentOffset;
        this.location.setPosition(this.view.getPosition(
                                      {line: this.location.line,
                                       offset: this.idealCaretOffset}));
    }
};

EditorModel.prototype.prepareSelection = function() {
    if (!this.selection)
        this.selection = { origin: this.location.copy() };
};

EditorModel.prototype.postProcessSelection = function() {
    if (!this.selection)
        return null;
    this.selection.current = this.location.copy();
};

EditorModel.prototype.copyToClipboard = function() {
    var selection = this.getSelection();
    if (!selection)
        return;

    this.killring.unshift(this.content.getTextInRange(
                              selection.start, selection.end));
};

EditorModel.prototype.pasteFromClipboard = function() {
    if (this.killring.length == 0)
        return;

    this.insertTextInternal(this.killring[0]);
};

EditorModel.prototype.deleteSelection = function() {
    var selection = this.getSelection();
    if (!selection) {
        return;
    }

    var deletedText = this.deleteRange(selection.start, selection.end);
    this.editHistory.push(
        new EditingHistoryEntry(
            'delete', deletedText, selection.start, selection.end));
    this.selection = null;
};

EditorModel.prototype.deleteRange = function(start, end) {
    this.view.deleteRange(start, end);

    var deletedText = this.content.deleteRange(start, end);
    this.location.setLocation(start);
    if (start.line != end.line)
        this.editingId.lineEditCount++; 
    this.askHighlight();
    return deletedText;
};

EditorModel.prototype.deletePreviousChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var current = this.location.copy();
    var previous = current.copy();
    previous.moveChars(-1);
    var deletedChar = this.content.deleteRange(previous, current);
    this.location.setLocation(previous);
    this.editHistory.push(new EditingHistoryEntry('delete', deletedChar, previous, current));
    this.view.deleteRange(previous, current);
    if (current.line != previous.line)
        this.editingId.lineEditCount++; 
    this.askHighlight();
};

EditorModel.prototype.deleteNextChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var current = this.location.copy();
    var next = this.location.copy();
    next.moveChars(1);
    var deletedChar = this.content.deleteRange(current, next);
    this.editHistory.push(new EditingHistoryEntry('delete', deletedChar, current, next));
    this.view.deleteRange(current, next);
    if (current.line != next.line)
        this.editingId.lineEditCount++; 
    this.askHighlight();
};

EditorModel.prototype.newLine = function() {
    this.insertText('\n');
};

EditorModel.prototype.incrementIndent = function() {
    // TODO: move to mode.
    this.insertTextInternal('  ');
    var tabWidth = /^\s*/.exec(this.content.getLine(this.location))[0].length;
    this.location.setPosition(tabWidth);
};

EditorModel.prototype.decrementIndent = function() {
    // TODO: move to mode.
    var currentLine = this.content.getLine(this.location);
    var tabWidth = /^\s*/.exec(currentLine)[0].length;
    if (tabWidth == 0)
        return;
    var location1 = this.location.copy();
    location1.setPostion(tabWidth);
    var location2 = location1.copy();
    location2.setPosition(tabWidth - 2);
    this.deleteRange(location2, location1);
    this.location.setPosition(location2.position);
};

EditorModel.prototype.insertText = function(text) {
    if (this.selection)
        this.deleteSelection();

    var loc = this.location.copy();
    this.insertTextInternal(text);
    var loc2 = this.location.copy();
    this.editHistory.push(
        new EditingHistoryEntry('insert', text, loc, loc2));
    if (text.indexOf("\n") >= 0)
        this.askIndent(this.location.line);
};

EditorModel.prototype.insertTextInternal = function(text) {
    this.view.insertText(text, this.location);
    this.content.insertText(text, this.location);
    this.location.moveChars(text.length);
    if (text.indexOf("\n") >= 0)
        this.editingId.lineEditCount++;
    this.askHighlight();
};

EditorModel.prototype.applyHistory = function(entry) {
    if (!entry)
        return;
    this.selection = null;
    this.location.line = entry.pos.line;
    this.location.setPosition(entry.pos.position);
    this.idealCaretOffset = null;
    if (entry.type == 'insert')
        this.insertTextInternal(entry.content);
    else
        this.deleteRange(entry.pos, entry.pos2);
};

EditorModel.prototype.undo = function() {
    this.applyHistory(this.editHistory.undo());
};

EditorModel.prototype.redo = function() {
    this.applyHistory(this.editHistory.redo());
};

// TODO: GetIndentAt has to be a part of a mode.
function GetIndentAt(lines, target) {
    var counter = 0;
    var index = target - 1;
    while (index > 0) {
        var line = lines[index];
        for (var i = line.length - 1; i >= 0; i--) {
            if ("({[".indexOf(line[i]) >= 0) {
                counter = Math.max(counter - 1, 0);
            } else if (")}]".indexOf(line[i]) >= 0) {
                counter++;
            }
        }
        if (counter == 0)
            break;
        index--;
    }
    if (index < 0)
        return 0;
    var baseLine = lines[index];
    var baseIndent = /^\s*/.exec(baseLine)[0].length;
    var prevLine = lines[target - 1].replace(/\s*$/, "");
    if (prevLine.length > 0 &&
        "({[:".indexOf(prevLine[prevLine.length - 1]) >= 0) {
        return baseIndent + EditorModel.prototype.tabWidth;
    }
    return baseIndent;
};
