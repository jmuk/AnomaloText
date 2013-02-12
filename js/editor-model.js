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

function EditorModel(contents, mode) {
    this.caretPosition = 0;
    this.idealCaretOffset = null;
    this.selection = null;
    this.mode = mode;
    this.editingCount = 0;
    this.lines = new Zipper(contents.split('\n'));
    this.askHighlight();
    // TODO: this has to be merged into the system clipboard.
    this.killring = [];
    this.editHistory = new EditingHistory();
}

EditorModel.prototype.setView = function(view) {
    this.view = view;
    var lines = [];
    for (var i = 0; i < this.lines.length; i++){
	lines.push(this.lines.at(i));
    }
    this.view.Init(lines.join('\n') + '\n');
};

EditorModel.prototype.onHighlighted = function(editingCount, range) {
    if (!this.view)
	return;
    if (this.editingCount != editingCount)
	return;

    this.view.applyHighlight(range);
}

EditorModel.prototype.askHighlight = function() {
    this.editingCount++;
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
        lines.push(this.lines.at(i));
    }
    this.mode.askHighlight(lines.join('\n') + '\n', this.editingCount,
			   this.onHighlighted.bind(this));
};

EditorModel.prototype.getCaretLocation = function() {
    return {line: this.lines.currentIndex(), position: this.caretPosition};
};

EditorModel.prototype.getCurrentElement = function() {
    return this.view.getElement({line: this.lines.currentIndex(),
                                position: this.caretPosition});
};

EditorModel.prototype.getLines = function() {
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
        lines.push(this.lines.at(i));
    }
    return lines;
};

EditorModel.prototype.getSelection = function() {
    if (!this.selection)
        return null;

    var e1 = this.selection.origin;
    var e2 = this.selection.current;
    if (e2.line < e1.line || (e2.line == e1.line &&
                              e2.position < e1.position)) {
        var tmp = e2;
        e2 = e1;
        e1 = tmp;
    }

    e1.offset = this.view.getOffset({line: e1.line, position: e1.position});
    e2.offset = this.view.getOffset({line: e2.line, position: e2.position});
    return {start: e1, end: e2};
};

EditorModel.prototype.getLineCount = function() {
    return this.lines.length;  
};

EditorModel.prototype.maybeHighlightParens = function() {
    this.view.clearParenHighlight();
    var line = this.lines.current();
    var origin = {line: this.lines.currentIndex(),
                  position: this.caretPosition - 1};
    var paren = isParen(line.charAt(this.caretPosition - 1));
    if (paren == null) {
        paren = isParen(line.charAt(this.caretPosition));
        if (paren == null)
            return;
        origin.position = this.caretPosition;
    }

    var orientation = (paren == ParenType.PAREN_OPEN) ? +1 : -1;
    var target = {line: origin.line, position: origin.position};
    var counter = 1;
    while (true) {
        target.position += orientation;
        if (target.position < 0) {
            target.line--;
            line = this.lines.at(target.line);
            if (line == null)
                break;
            target.position = line.length - 1;
        } else if (target.position >= line.length) {
            target.line++;
            line = this.lines.at(target.line);
            if (line == null)
                break;
            target.position = 0;
        }
        var targetParen = isParen(line.charAt(target.position));
        if (targetParen != null) {
            if (paren == targetParen)
                counter++;
            else
                counter--;
        }
        if (counter == 0) {
            this.view.highlightParen(origin);
            this.view.highlightParen(target);
            return;
        }
    }
    this.view.highlightParen(origin, 'warning');
};

EditorModel.prototype.moveCaret = function(newPosition) {
    this.caretPosition = newPosition;
    this.idealCaretOffset = null;
};

EditorModel.prototype.startMouseSelection = function(leftOffset, lines) {
    if (lines > this.lines.length)
	return;

    this.selection = {};
    this.selection.origin = {
        line: lines,
        position: this.view.getPosition({line: lines, offset: leftOffset})
    };
    this.selection.current = {
        line: lines,
        position: this.view.getPosition({line: lines, offset: leftOffset})
    };
};

EditorModel.prototype.updateMouseSelection = function(leftOffset, lines) {
    if (!this.selection)
        return;
    lines = Math.min(Math.max(lines, 0), this.lines.length);
    this.selection.current = {
        line: lines,
        position: this.view.getPosition({line: lines, offset: leftOffset})
    };
};

EditorModel.prototype.moveToPosition = function(leftOffset, lines) {
    if (lines > this.lines.length)
	return;
    this.lines.jumpTo(lines);
    this.moveCaret(this.view.getPosition({line: lines, offset: leftOffset}));
};

EditorModel.prototype.moveBackward = function(select) {
    if (!select && this.selection) {
        var s = this.getSelection();
        this.lines.jumpTo(s.start.line);
        this.caretPosition = s.start.position;
        this.selection = null;
        return;
    }

    if (select)
        this.prepareSelection();

    var line = this.lines.current();
    if (this.caretPosition == 0) {
        if (this.lines.backward())
            this.moveCaret(this.lines.current().length);
    } else {
        this.moveCaret(this.caretPosition - 1);
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveForward = function(select) {
    if (!select && this.selection) {
        var s = this.getSelection();
        this.lines.jumpTo(s.end.line);
        this.caretPosition = s.end.position;
        this.selection = null;
        return;
    }

    if (select)
        this.prepareSelection();

    var line = this.lines.current();
    if (this.caretPosition == line.length) {
        if (this.lines.forward())
            this.moveCaret(0);
    } else {
        this.moveCaret(this.caretPosition + 1);
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.movePreviousWord = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var content = this.lines.current().slice(0, this.caretPosition);
    while (true) {
        var non_words = content.split(this.mode.pattern);
        if (non_words.length > 1) {
            content = content.slice(0, content.length - non_words[non_words.length - 1].length);
            break;
        }
        if (!this.lines.backward()) {
            this.moveCaret(0);
            if (select)
                this.postProcessSelection();
            return;
        }

        this.caretPosition = this.lines.current().length;
        content = this.lines.current();
    }

    var pattern_str = this.mode.pattern.toString();
    var lastMatcher = RegExp(pattern_str.slice(1, pattern_str.length - 1) + "$");
    var m = lastMatcher.exec(content);
    if (m)
	this.moveCaret(content.length - m[0].length);

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveNextWord = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    var content = this.lines.current().slice(this.caretPosition);
    while (true) {
        var m = this.mode.pattern.exec(content);
        if (m) {
            this.moveCaret(this.caretPosition + m.index + m[0].length);
            break;
        } else {
            if (this.lines.forward()) {
                content = this.lines.current();
                this.caretPosition = 0;
            } else {
                this.moveCaret(this.lines.current().length);
                break;
            }
        }
    }
    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.movePreviousLine = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    if (this.idealCaretOffset == null) {
        this.idealCaretOffset =
            this.view.getOffset({line: this.lines.currentIndex(),
                                 position: this.caretPosition});
    }
    if (this.lines.backward()) {
        this.caretPosition =
            this.view.getPosition({line: this.lines.currentIndex(),
                                   offset: this.idealCaretOffset});
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
        this.idealCaretOffset =
            this.view.getOffset({line: this.lines.currentIndex(),
                                 position: this.caretPosition});
    }
    if (this.lines.forward()) {
        this.caretPosition =
            this.view.getPosition({line: this.lines.currentIndex(),
                                   offset: this.idealCaretOffset});
    }

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveToStartOfLine = function() {
    this.moveCaret(0);
};

EditorModel.prototype.moveToEndOfLine = function() {
    this.moveCaret(this.lines.current().length);
};

EditorModel.prototype.prepareSelection = function() {
    if (!this.selection) {
        this.selection = {
            origin: {
                line: this.lines.currentIndex(),
                position: this.caretPosition
            }
        };
    }
};

EditorModel.prototype.postProcessSelection = function() {
    if (!this.selection)
        return null;
    this.selection.current = {
        line: this.lines.currentIndex(),
        position: this.caretPosition
    };
};

EditorModel.prototype.copyToClipboard = function() {
    var selection = this.getSelection();
    if (selection.start.line == selection.end.line) {
        this.killring.unshift(this.lines.current().slice(
            selection.start.position, selection.end.position));
    } else {
        var selectedText = this.lines.at(
            selection.start.line).slice(selection.start.position);
        selectedText += '\n';
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            selectedText += this.lines.at(i);
            selectedText += '\n';
        }
        if (selection.end.position > 0) {
            selectedText += this.lines.at(
                selection.end.line).slice(0, selection.end.position);
        }
        this.killring.unshift(selectedText);
    }
};

EditorModel.prototype.pasteFromClipboard = function() {
    if (this.killring.length == 0)
        return;

    this.insertText(this.killring[0]);
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

    var deletedText;
    this.lines.jumpTo(start.line);
    if (start.line == end.line) {
        var line = this.lines.current();
	deletedText = line.slice(start.position, end.position);
        this.lines.replace(line.slice(0, start.position) +
			   line.slice(end.position));
        this.caretPosition = start.position;
    } else {
	var deletedLines = [];
	deletedLines.push(this.lines.current().slice(start.position));
        if (start.position == 0) {
            this.lines.remove();
        } else {
            this.lines.replace(
		this.lines.current().slice(0, start.position));
            this.lines.forward();
        }
        for (var i = start.line + 1; i < end.line; i++) {
	    deletedLines.push(this.lines.current());
            this.lines.remove();
        }
	deletedLines.push(
	    this.lines.current().slice(0, end.position));
	deletedText = deletedLines.join("\n");
        if (end.position > 0) {
            if (end.position == this.lines.current().length) {
                this.lines.remove();
            } else {
                this.lines.replace(
                    this.lines.current().slice(end.position));
            }
        }
        this.lines.backward();
        this.caretPosition = this.lines.current().length;
        if (end.position > 0) {
            this.lines.replace(this.lines.current() + this.lines.next());
            this.lines.forward();
            this.lines.remove();
            this.lines.backward();
        } else {
            this.lines.forward();
        }
    }
    this.askHighlight();
    return deletedText;
};

EditorModel.prototype.deletePreviousChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var currentLoc = {
        line: this.lines.currentIndex(),
        position: this.caretPosition
    };
    var previousLoc = {
        line: currentLoc.line,
        position: currentLoc.position - 1
    };
    var line = this.lines.current();
    var deletedChar;
    if (this.caretPosition == 0) {
        if (this.lines.previous()) {
            previousLoc.line--;
            previousLoc.position = this.lines.previous().length;
            this.lines.remove();
            this.lines.backward();
            var curLine = this.lines.current();
            this.moveCaret(curLine.length);
            this.lines.replace(curLine + line);
	    deletedChar = "\n";
        } else {
            return;
        }
    } else {
	deletedChar = this.lines.current().charAt(
	    this.caretPosition - 1);
        this.lines.replace(line.slice(0, this.caretPosition - 1) +
                           line.slice(this.caretPosition));
        this.moveCaret(this.caretPosition - 1);
    }
    this.editHistory.push(
	new EditingHistoryEntry(
	    'delete', deletedChar, previousLoc, currentLoc));
    this.view.deleteRange(previousLoc, currentLoc);
    this.askHighlight();
};

EditorModel.prototype.deleteNextChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var currentLoc = {
        line: this.lines.currentIndex(),
        position: this.caretPosition
    };
    var nextLoc = {
        line: currentLoc.line,
        position: currentLoc.position + 1
    };
    var line = this.lines.current();
    var deletedChar;
    if (line.length == this.caretPosition) {
        if (this.lines.next()) {
            nextLoc.line++;
            nextLoc.position = 0;
            this.lines.forward();
            var nextLine = this.lines.current();
            this.lines.remove();
            this.lines.backward();
            this.lines.replace(line + nextLine);
	    deletedChar = "\n";
        } else {
            return;
        }
    } else {
	deletedChar = this.lines.current().charAt(this.caretPosition);
        this.lines.replace(line.slice(0, this.caretPosition) +
                           line.slice(this.caretPosition + 1));
    }
    this.editHistory.push(
	new EditingHistoryEntry(
	    'delete', deletedChar, currentLoc, nextLoc));
    this.view.deleteRange(currentLoc, nextLoc);
    this.askHighlight();
};

EditorModel.prototype.newLine = function() {
    this.insertText('\n');
};

EditorModel.prototype.incrementIndent = function() {
    var newIndent = (new Array(this.tabWidth + 1)).join(" ");
    this.lines.replace(newIndent + this.lines.current());
    this.view.insertText(newIndent, {line: this.lines.currentIndex(), position: 0});
    var tabWidth = /^\s*/.exec(this.lines.current())[0].length;
    this.moveCaret(tabWidth);
};

EditorModel.prototype.decrementIndent = function() {
    var currentLine = this.lines.current();
    var tabWidth = /^\s*/.exec(currentLine)[0].length;
    if (tabWidth == 0) {
	return;
    } else {
	var pos1, pos2;
	var slicePoint;
	if (tabWidth < this.tabWidth) {
	    pos1 = {line: this.lines.currentIndex(), position: 0};
	    pos2 = {line: this.lines.currentIndex(), position: tabWidth};
	    slicePoint = tabWidth;
	    tabWidth = 0;
	} else {
	    pos1 = {line: this.lines.currentIndex(), position: 0};
	    pos2 = {line: this.lines.currentIndex(), position: this.tabWidth};
	    slicePoint = this.tabWidth;
	    tabWidth -= this.tabWidth;
	}
	this.lines.replace(
            this.lines.current().slice(slicePoint));
        this.view.deleteRange(pos1, pos2);
	var deleted = (new Array(pos2 - pos1 + 1).join(" "));
	this.editHistory.push(
	    new EditingHistoryEntry('delete', deleted, pos1, pos2));
    }
    this.moveCaret(tabWidth);
};

EditorModel.prototype.insertText = function(text) {
    if (this.selection)
        this.deleteSelection();

    var loc = {line: this.lines.currentIndex(),
               position: this.caretPosition};

    this.insertTextInternal(text);

    var loc2 = {line: this.lines.currentIndex(),
		position: this.caretPosition};
    this.editHistory.push(
	new EditingHistoryEntry('insert', text, loc, loc2));
};

EditorModel.prototype.insertTextInternal = function(text) {
    var loc = {line: this.lines.currentIndex(),
               position: this.caretPosition};
    this.view.insertText(text, loc);

    var lines = text.split("\n");
    if (lines.length > 1) {
        var trailing = this.lines.current().slice(this.caretPosition);
        this.lines.replace(this.lines.current().slice(0, this.caretPosition) +
                           lines[0]);
        this.lines.forward();
        var newLineIndex = this.lines.currentIndex();
        for (var i = 1; i < lines.length - 1; i++) {
            this.lines.insert(lines[i]);
        }
        this.lines.insert(lines[lines.length - 1] + trailing);
        this.lines.backward();
        var currentIndex = this.lines.currentIndex();

        // Set the default indent.
        var lastIndent = 0;
        for (var i = 0; i < lines.length - 1; i++) {
            var index = newLineIndex + i;
            // set the default indent.
            lastIndent = GetIndentAt(this.getLines(), index);
            var line = this.lines.at(index);
            var indent = /\s*/.exec(line)[0].length;
            if (indent < lastIndent) {
                this.lines.jumpTo(index);
                var newIndent = (new Array(lastIndent - indent + 1)).join(" ");
                this.lines.replace(newIndent + this.lines.current());
                this.view.insertText(newIndent, {line: index, position: 0});
            }
        }

        this.lines.jumpTo(currentIndex);
        this.moveCaret(lines[lines.length - 1].length + lastIndent);
    } else {
        var line = this.lines.current();
        this.lines.replace(
            line.slice(0, this.caretPosition) + text + line.slice(this.caretPosition));
        this.moveCaret(this.caretPosition + text.length);
    }

    this.askHighlight();
};

EditorModel.prototype.undo = function() {
    var historyEntry = this.editHistory.undo();
    if (!historyEntry)
	return;

    this.selection = null;
    this.lines.jumpTo(historyEntry.pos.line);
    this.moveCaret(historyEntry.pos.position);
    if (historyEntry.type == 'delete') {
	this.insertText(historyEntry.content);
    } else {
	this.deleteRange(historyEntry.pos, historyEntry.pos2);
    }
};

EditorModel.prototype.redo = function() {
    var historyEntry = this.editHistory.redo();
    if (!historyEntry)
	return;

    this.selection = null;
    this.lines.jumpTo(historyEntry.pos.line);
    this.moveCaret(historyEntry.pos.position);
    if (historyEntry.type == 'insert') {
	this.insertText(historyEntry.content);
    } else {
	this.deleteRange(historyEntry.pos, historyEntry.pos2);
    }
};

EditorModel.prototype.tabWidth = 2;

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
