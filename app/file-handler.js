var FileHandler;

(function() {
var fileHandlerIds = 0;

FileHandler = function() {
    this.fileEntry = null;
    this.onWriting = false;
    this.contents = [''];
    this.buffers = {};
    this.id = fileHandlerIds++;
};

FileHandler.prototype.getName = function() {
    return this.fileEntry ? this.fileEntry.name : '<empty>';
};

FileHandler.prototype.getFullPath = function() {
  return this.fileEntry ? this.fileEntry.fullPath : ('<empty>-' + this.id);
};

FileHandler.prototype.empty = function() {
    if (this.contents.length == 0)
        return true;
    if (this.contents.length == 1 && this.contents[0].length == 0)
        return true;
    return false;
};

FileHandler.prototype.addBuffer = function(buffer) {
    this.buffers[buffer.id] = buffer;
};

FileHandler.prototype.detachBuffer = function(buffer) {
    delete this.buffers[buffer.id];
};

FileHandler.prototype.setFileEntry = function(fileEntry) {
    this.fileEntry = fileEntry;
    var fileHandler = this;
    this.fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onerror = function(e) {
            console.log('error');
        };
        reader.onloadend = function(e) {
            if (reader.readyState != FileReader.DONE)
                return;
            fileHandler.contents = reader.result.split('\n');
            if (fileHandler.contents.length == 0)
                fileHandler.contents = [''];
            for (var id in fileHandler.buffers) {
                var buffer = fileHandler.buffers[id];
                buffer.onFileLoaded.bind(buffer)(fileHandler);
            }
        };
        reader.readAsText(file, 'utf-8');
    });
};

FileHandler.prototype.saveToEntry = function(fileEntry, callback) {
    this.fileEntry = fileEntry;
    this.onWriting = false;
    this.save(callback);
};

FileHandler.prototype.save = function(callback) {
    if (!this.fileEntry)
        return;
    if (this.onWriting) {
        callback(false);
        return;
    }

    var fileHandler = this;
    this.fileEntry.createWriter(function(writer) {
        function onTruncateEnd() {
            fileHandler.onWriting = false;
            callback(true);
        }
        fileHandler.onWriting = true;
        writer.onwriteend = function() {
            writer.onwriteend = onTruncateEnd();
            writer.truncate(writer.position);
        };
        writer.onerror = function() {
            console.log('error happens during saving');
            fileHandler.onWriting = false;
            callback(false);
        };

        var contents = [];
        for (var i = 0; i < fileHandler.contents.length; i++) {
            contents.push(fileHandler.contents[i]);
            contents.push('\n');
        }
        writer.write(new Blob(contents, {type: 'text/plain'}));
    });
};

FileHandler.prototype.edit = function(entry) {
    if (entry.type == 'insert') {
        while (this.contents.length <= entry.pos2.line) {
            this.contents.push('');
        }
        var lines = entry.content.split('\n');
        if (lines.length == 1) {
            var line = this.contents[entry.pos.line];
            line = line.slice(0, entry.pos.position) + lines[0] +
                line.slice(entry.pos.position);
            this.contents[entry.pos.line] = line;
        } else {
            var lineNum = entry.pos.line;
            var line = this.contents[lineNum];
            var remaining = line.slice(entry.pos.position);
            this.contents[lineNum] = line.slice(0, entry.pos.position) + lines[0];
            line = this.contents[lineNum + 1];
            this.contents[lineNum + 1] = lines[lines.length - 1] + remaining + line;
            if (line.length > 2) {
                this.contents.splice.apply(
                    this.contents,
                    [lineNum, 0].concat(line.slice(1, line.length - 1)));
            }
        }
    } else {
        var deletedText = '';
        if (entry.pos.line == entry.pos2.line) {
            var line = this.contents[entry.pos.line];
            deletedText = line.slice(entry.pos.position, entry.pos2.position);
            this.contents[entry.pos.line] = line.slice(0, entry.pos.position) +
                line.slice(entry.pos2.position);
        } else {
            var line = this.contents[entry.pos.line];
            deletedText = line.slice(entry.pos.position) + '\n';
            this.contents[entry.pos.line] = line.slice(0, entry.pos.position);
            for (var i = entry.pos.line + 1; i < entry.pos2.line; i++) {
                deletedText += this.contents[i] + '\n';
            }
            line = this.contents[entry.pos2.line];
            deletedText += line.slice(0, entry.pos2.position);
            var lastRemoved = (line.length == entry.pos2.position);
            if (!lastRemoved) {
                this.contents[entry.pos2.line] = line.slice(entry.pos2.position);
            }
            var offset = lastRemoved ? 0 : 1;
            if (entry.pos.line < entry.pos2.line - offset) {
                this.contents.splice(entry.pos.line + 1,
                                     entry.pos2.line - entry.pos.line - offset);
            }
        }
        if (entry.content != deletedText) {
            console.log('mismatched deleted text: ' +
                        entry.content + ' ' + deletedText);
        }
    }
};

})();