// content holds the file data and bridges EditorModel to the view.
// Apps will inherit this class to handle saves and loads.

function Content(text) {
    text = text || '';
    this.lines = text.split('\n');
    this.observers = new Observers();
};

Content.prototype.notifyChange = function() {
    this.observers.notify('onContentChanged', [this]);
};

//////////////////////////////////////////////////////////////////
// Get the text.

Content.prototype.getFullText = function(callback) {
    callback(this.lines.join('\n') + '\n');
};

Content.prototype.getLine = function(location) {
    var line = location.line;
    if (line < 0 || line > this.lines.length)
        return null;

    return this.lines[line];
};

Content.prototype.getCharAt = function(location) {
  return this.getLine(location)[location.position] || '';
};

Content.prototype.getTextInRange = function(start, end) {
  if (start.sameLine(end)) {
      return this.getLine(start).slice(start.position, end.position);
  } else {
      var text = this.getLine(start).slice(start.position);
      text += '\n';
      for (var i = start.line + 1; i < end.line; i++) {
          text += this.lines[i] + '\n';
      }
      if (end.position > 0)
          text += this.lines[end.line].slice(0, end.position);
      return text;
  }
};

//////////////////////////////////////////////////////////////////
// Get the metadata for lines.

Content.prototype.getLines = function() {
    return this.lines.length;
};

Content.prototype.getCharsInLine = function(line) {
    if (line < 0 || line >= this.lines.length)
        return 0;
    return this.lines[line].length;
};

Content.prototype.atEnd = function(location) {
    return (location.line >= this.lines.length) ||
        (location.line == this.lines.length - 1 &&
         location.position >= this.getCharsInLine(location.line));
};

Content.prototype.getParenPairs = function(location, isParen) {
    var paren = this.getCharAt(location);
    var result = {start: null, end: null};
    if (isParen(paren) == ParenType.PAREN_OPEN) {
        var current = location.copy();
        var count = 1;
        result.start = location.copy();
        current.moveChars(1);
        while (!this.atEnd(current)) {
            var currentIsParen = isParen(this.getCharAt(current));
            if (currentIsParen == ParenType.PAREN_OPEN) {
                count++;
            } else if (currentIsParen == ParenType.PAREN_CLOSE) {
                count--;
                if (count == 0) {
                    result.end = current.copy();
                    break;
                }
            }
            current.moveChars(1);
        }
    } else if (location.position > 0) {
        var current = location.copy();
        current.moveChars(-1);
        paren = this.getCharAt(current);
        if (isParen(paren) == ParenType.PAREN_CLOSE) {
            var count = 1;
            result.start = current.copy();
            current.moveChars(-1);
            while (current.line > 0 || current.position > 0) {
                var currentIsParen = isParen(this.getCharAt(current));
                if (currentIsParen == ParenType.PAREN_CLOSE) {
                    count++;
                } else if (currentIsParen == ParenType.PAREN_OPEN) {
                    count--;
                    if (count == 0) {
                        result.end = current.copy();
                        break;
                    }
                }
                current.moveChars(-1);
            }
        }
    }
    return result;
};

//////////////////////////////////////////////////////////////////
// Get the metadata for lines.

Content.prototype.deleteRange = function(start, end) {
    var deletedText = null;
    if (start.sameLine(end)) {
        var line = this.getLine(start);
        deletedText = line.slice(start.position, end.position);
        this.lines[start.line] = line.slice(0, start.position) + line.slice(end.position);
    } else {
        var line = this.getLine(start);
        deletedText = line.slice(start.position) + '\n';
        this.lines[start.line] = line.slice(0, start.position);
        var endLine = this.getLine(end);
        this.lines[start.line] += endLine.slice(end.position);
        endLine = endLine.slice(0, end.position);
        var removeCount = end.line - start.line;
        var deletedLines = this.lines.splice(start.line + 1, removeCount);
        deletedLines.pop();
        deletedText += deletedLines.join('\n') + '\n' + endLine;
    }
    this.notifyChange();
    return deletedText;
};

Content.prototype.insertText = function(text, location) {
    var inputLines = text.split("\n");
    if (inputLines.length > 1) {
        var line = this.getLine(location);
        var trailing = line.slice(location.position);
        this.lines[location.line] = line.slice(0, location.position) + inputLines[0];
        if (location.line < this.getLines() - 1) {
            var endLine = this.lines[location.line + 1];
            inputLines[inputLines.length - 1] = trailing + inputLines[inputLines.length - 1];
            this.lines.splice.apply(
                this.lines, [location.line + 1, 0].concat(inputLines.slice(1, inputLines.length)));
        } else {
            this.lines.push.apply(this.lines, inputLines.slice(1));
        }
    } else {
        var line = this.getLine(location);
        this.lines[location.line] =
            line.slice(0, location.position) + text + line.slice(location.position);
    }
    this.notifyChange();
};