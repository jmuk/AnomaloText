function EditorModel(contents) {
    this.caretPosition = 0;
    this.idealCaretOffset = null;
    this.selection = null;
    this.mode = new Worker('python-mode.js');
    this.mode.addEventListener('message', this.modeMessageHandler.bind(this));
    this.mode.postMessage({command:'metadata'});
    this.mode.pattern = /[a-zA-Z_0-9]+/;
    this.editingCount = 0;
    this.lines = new Zipper(contents.split('\n'));
    this.askHighlight();
    // TODO: this has to be merged into the system clipboard.
    this.killring = [];
}

EditorModel.prototype.setView = function(view) {
    this.view = view;
};

EditorModel.prototype.modeMessageHandler = function(e) {
    if (e.data.command == 'metadata') {
        this.mode.pattern = e.data.pattern;
        this.mode.parens = e.data.parens;
        return;
    }

    if (this.editingCount != e.data.id)
        return;

    this.view.applyHighlight(e.data.range);
};

EditorModel.prototype.askHighlight = function() {
    this.editingCount++;
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
        lines.push(this.lines.at(i));
    }
    this.mode.postMessage({command:'highlight',
                           id: this.editingCount,
                           contents: lines.join('\n') + '\n'
                          });
};

EditorModel.prototype.addElementsToContents = function(content) {
    this.view.addElementsToContents(content);
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

EditorModel.prototype.moveCaret = function(newPosition) {
    this.caretPosition = newPosition;
    this.idealCaretOffset = null;
};

EditorModel.prototype.startMouseSelection = function(leftOffset, lines) {
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
    if (!this.selection) {
        console.error('selection is missing during mouse selection?');
        return;
    }
    this.selection.current = {
        line: lines,
        position: this.view.getPosition({line: lines, offset: leftOffset})
    };
};

EditorModel.prototype.moveToPosition = function(leftOffset, lines) {
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
    this.view.deleteRange(selection.start, selection.end);

    if (selection.start.line == selection.end.line) {
        var line = this.lines.current();
        this.lines.replace(line.slice(0, selection.start.position) +
                           line.slice(selection.end.position));
        this.caretPosition = selection.start.position;
    } else {
        this.lines.jumpTo(selection.start.line);
        if (selection.start.position == 0) {
            this.lines.remove();
        } else {
            this.lines.replace(
                this.lines.current().slice(0, selection.start.position));
            this.lines.forward();
        }
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            this.lines.remove();
        }
        if (selection.end.position > 0) {
            if (selection.end.position == this.lines.current().length) {
                this.lines.remove();
            } else {
                this.lines.replace(
                    this.lines.current().slice(selection.end.position));
            }
        }
        this.lines.backward();
        this.caretPosition = this.lines.current().length;
        if (selection.end.position > 0) {
            this.lines.replace(this.lines.current() + this.lines.next());
            this.lines.forward();
            this.lines.remove();
            this.lines.backward();
        } else {
            this.lines.forward();
        }
    }
    this.selection = null;
    this.askHighlight();
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
    if (this.caretPosition == 0) {
        if (this.lines.previous()) {
            previousLoc.line--;
            previousLoc.position = this.lines.previous().length;
            this.lines.remove();
            this.lines.backward();
            var curLine = this.lines.current();
            this.moveCaret(curLine.length);
            this.lines.replace(curLine + line);
        } else {
            return;
        }
    } else {
        this.lines.replace(line.slice(0, this.caretPosition - 1) +
                           line.slice(this.caretPosition));
        this.moveCaret(this.caretPosition - 1);
    }
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
        position: currentLoc.position - 1
    };
    var line = this.lines.current();
    if (line.length == this.caretPosition) {
        if (this.lines.next()) {
            nextLoc.line++;
            nextLoc.position = 0;
            this.lines.forward();
            var nextLine = this.lines.current();
            this.lines.remove();
            this.lines.backward();
            this.lines.replace(line + nextLine);
        } else {
            return;
        }
    } else {
        this.lines.replace(line.slice(0, this.caretPosition) +
                           line.slice(this.caretPosition + 1));
    }
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
    } else if (tabWidth < this.tabWidth) {
	this.lines.replace(
            this.lines.current().slice(tabWidth));
        this.view.deleteRange({line: this.lines.currentIndex(), position: 0},
                              {line: this.lines.currentIndex(), position: tabWidth});
	tabWidth = 0;
    } else {
	this.lines.replace(
            this.lines.current().slice(this.tabWidth));
        this.view.deleteRange({line: this.lines.currentIndex(), position: 0},
                              {line: this.lines.currentIndex(), position: this.tabWidth});
	tabWidth -= this.tabWidth;
    }
    this.moveCaret(tabWidth);
};

EditorModel.prototype.insertText = function(text) {
    if (this.selection)
        this.deleteSelection();

    this.view.insertText(text, {line: this.lines.currentIndex(),
                                position: this.caretPosition});

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
