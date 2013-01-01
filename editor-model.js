function EditorModel(contents) {
    this.caretPosition = 0;
    this.idealCaretOffset = null;
    this.selection = null;
    this.mode = new Worker('python-mode.js');
    this.mode.addEventListener('message', this.modeMessageHandler.bind(this));
    this.mode.postMessage({command:'metadata'});
    this.mode.pattern = /[a-zA-Z_0-9]+/;
    this.editingCount = 0;
    this.Init(contents);
    this.askHighlight();
    // TODO: this has to be merged into the system clipboard.
    this.killring = [];
}

EditorModel.prototype.Init = function(contents) {
    var lines = contents.split('\n');
    var lineData = [];
    for (var i = 0; i < lines.length; i++) {
        lineData.push(new EditorLineView(this, lines[i]));
    }
    this.lines = new Zipper(lineData);
};

EditorModel.prototype.modeMessageHandler = function(e) {
    if (e.data.command == 'metadata') {
        this.mode.pattern = e.data.pattern;
        this.mode.parens = e.data.parens;
        return;
    }

    if (this.editingCount != e.data.id)
        return;

    var ranges = e.data.range;
    var offset = 0;
    for (var i = 0; i < this.lines.length; i++) {
        var lineRanges = [];
        var line = this.lines.at(i);
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

EditorModel.prototype.askHighlight = function() {
    this.editingCount++;
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
        lines.push(this.lines.at(i).contents);
    }
    this.mode.postMessage({command:'highlight',
                           id: this.editingCount,
                           contents: lines.join('\n') + '\n'
                          });
};

EditorModel.prototype.addElementsToContents = function(content) {
    for (var i = 0; i < this.lines.length; i++) {
        this.lines.at(i).addElementsToContents(content);
    }
};

EditorModel.prototype.getCaretPosition = function() {
    var line = this.lines.current();
    return {leftOffset: line.getOffset(this.caretPosition),
            lines: this.lines.currentIndex()};
    if (line.tokens.length != 0) {
        result.top = this.tokens[0].element.offsetTop;
    } else {
        // Simply assumes every line has the same height.
        var lineHeight = 0;
        var container = line.linebreak.parentNode;
        for (var i = 0; i < container.childNodes.length; i++) {
            var element = container.childNodes[i];
            if (element.tagName == 'SPAN') {
                lineHeight = element.offsetHeight;
                break;
            }
        }
        result.top = lineHeight * this.lines.currentIndex();
    }
    return result;
};

EditorModel.prototype.getCurrentElement = function() {
    return this.lines.current().getElementAt(
        this.caretPosition);
};

EditorModel.prototype.getLines = function() {
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
        lines.push(this.lines.at(i).contents);
    }
    return lines;
}

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

    e1.offset = this.lines.at(e1.line).getOffset(e1.position);
    e2.offset = this.lines.at(e2.line).getOffset(e2.position);
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
        position: this.lines.at(lines).getPosition(leftOffset)
    };
    this.selection.current = {
        line: lines,
        position: this.lines.at(lines).getPosition(leftOffset)
    };
};

EditorModel.prototype.updateMouseSelection = function(leftOffset, lines) {
    if (!this.selection) {
        console.error('selection is missing during mouse selection?');
        return;
    }
    this.selection.current = {
        line: lines,
        position: this.lines.at(lines).getPosition(leftOffset)
    };
};

EditorModel.prototype.moveToPosition = function(leftOffset, lines) {
    this.lines.jumpTo(lines);
    this.moveCaret(this.lines.current().getPosition(leftOffset));
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

    if (this.caretPosition == 0) {
        if (!this.lines.backward())
            return;
        this.caretPosition = this.lines.current().length;
    }

    var newPosition =
        this.lines.current().getPreviousWord(this.caretPosition);
    while (newPosition == null) {
        if (!this.lines.backward()) {
            this.caretPosition = 0;
            return;
        }
        newPosition = this.lines.current().getPreviousWord(
            this.lines.current().length);
    }
    if (newPosition != null)
        this.caretPosition = newPosition;

    if (select)
        this.postProcessSelection();
};

EditorModel.prototype.moveNextWord = function(select) {
    if (select)
        this.prepareSelection();
    else
        this.selection = null;

    if (this.caretPosition == this.lines.current().length) {
        if (!this.lines.forward())
            return;
        this.caretPosition = 0;
    }
    var newPosition =
        this.lines.current().getNextWord(this.caretPosition);
    while (newPosition == null) {
        if (!this.lines.forward()) {
            this.caretPosition = this.lines.current().length;
            return;
        }
        newPosition = this.lines.current().getNextWord(0);
    }
    if (newPosition != null)
        this.caretPosition = newPosition;

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
            this.lines.current().getOffset(this.caretPosition);
    }
    if (this.lines.backward()) {
        this.caretPosition =
            this.lines.current().getPosition(this.idealCaretOffset);
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
            this.lines.current().getOffset(this.caretPosition);
    }
    if (this.lines.forward()) {
        this.caretPosition =
            this.lines.current().getPosition(this.idealCaretOffset);
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
        this.killring.unshift(this.lines.current().contents.slice(
            selection.start.position, selection.end.position));
    } else {
        var selectedText = this.lines.at(
            selection.start.line).contents.slice(selection.start.position);
        selectedText += '\n';
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            selectedText += this.lines.at(i).contents;
            selectedText += '\n';
        }
        if (selection.end.position > 0) {
            selectedText += this.lines.at(
                selection.end.line).contents.slice(0, selection.end.position);
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
    if (selection.start.line == selection.end.line) {
        this.lines.current().deleteCharsIn(
            selection.start.position, selection.end.position);
        this.caretPosition = selection.start.position;
    } else {
        this.lines.jumpTo(selection.start.line);
        if (selection.start.position == 0) {
            this.lines.current().deleteAllChars();
            this.lines.remove();
        } else {
            this.lines.current().deleteCharsIn(
                selection.start.position,
                this.lines.current().length);
            this.lines.forward();
        }
        for (var i = selection.start.line + 1;
             i < selection.end.line; i++) {
            this.lines.current().deleteAllChars();
            this.lines.remove();
        }
        if (selection.end.position > 0) {
            if (selection.end.position == this.lines.current().length) {
                this.lines.current().deleteAllChars();
                this.lines.remove();
            } else {
                this.lines.current().deleteCharsIn(
                    0, selection.end.position);
            }
        }
        this.lines.backward();
        this.caretPosition = this.lines.current().length;
        if (selection.end.position > 0) {
            this.lines.current().concat(this.lines.next());
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

    var line = this.lines.current();
    if (this.caretPosition == 0) {
        if (this.lines.previous()) {
            this.lines.remove();
            this.lines.backward();
            var curLine = this.lines.current();
            this.moveCaret(curLine.length);
            curLine.concat(line);
        }
    } else {
        line.deleteCharAt(this.caretPosition - 1);
        this.moveCaret(this.caretPosition - 1);
    }
    this.askHighlight();
};

EditorModel.prototype.deleteNextChar = function() {
    if (this.selection) {
        this.deleteSelection();
        return;
    }

    var line = this.lines.current();
    if (line.length == this.caretPosition) {
        if (this.lines.next()) {
            this.lines.forward();
            var nextLine = this.lines.current();
            this.lines.remove();
            this.lines.backward();
            line.concat(nextLine);
        }
    } else {
        line.deleteCharAt(this.caretPosition);
    }
    this.askHighlight();
};

EditorModel.prototype.newLine = function() {
    this.insertText('\n');
};

EditorModel.prototype.incrementIndent = function() {
    var currentLine = this.lines.current();
    currentLine.fixIndent(currentLine.indentLength + this.tabWidth);
    this.moveCaret(currentLine.indentLength);
};

EditorModel.prototype.decrementIndent = function() {
    var currentLine = this.lines.current();
    var newIndent = Math.max(currentLine.indentLength - this.tabWidth, 0);
    currentLine.fixIndent(newIndent);
    this.moveCaret(currentLine.indentLength);
};

EditorModel.prototype.insertText = function(text) {
    if (this.selection)
        this.deleteSelection();

    var lines = text.split("\n");
    if (lines.length > 1) {
        var newLines = this.lines.current().splitAt(
            this.caretPosition);
        this.lines.remove();
        newLines[0].insertTextAt(lines[0], newLines[0].length);
        this.lines.insert(newLines[0]);
        var newLineIndex = this.lines.currentIndex();
        for (var i = 1; i < lines.length - 1; i++) {
            this.lines.insert(new EditorLineView(this, lines[i]));
        }
        newLines[1].insertTextAt(lines[lines.length - 1], 0);
        this.lines.insert(newLines[1]);
        this.lines.backward();

        var lastIndent = 0;
        for (var i = 0; i < lines.length - 1; i++) {
            var index = newLineIndex + i;
            lastIndent = GetIndentAt(this.getLines(), index);
            this.lines.at(index).fixIndent(lastIndent);
        }

        this.moveCaret(lines[lines.length - 1].length + lastIndent);
    } else {
        this.lines.current().insertTextAt(text, this.caretPosition);
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
