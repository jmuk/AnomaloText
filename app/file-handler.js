var FileHandler;

(function() {
var fileHandlerIds = 0;

FileHandler = function(initialBuffer) {
    this.fileEntry = null;
    this.onWriting = false;
    this.contents = [];
    this.buffers = [];
    if (initialBuffer)
        this.buffers.push(initialBuffer);
    this.id = fileHandlerIds++;
};

FileHandler.prototype.getName = function() {
    return this.fileEntry ? this.fileEntry.name : '<empty>';
};

FileHandler.prototype.empty = function() {
    return this.contents.length == 0;  
};

FileHandler.prototype.addBuffer = function(buffer) {
    this.buffers.push(buffer);
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
            for (var i = 0; i < fileHandler.buffers.length; i++) {
                var buffer = fileHandler.buffers[i];
                buffer.onFileLoaded.bind(buffer)(fileHandler);
            }
        };
        reader.readAsText(file, 'utf-8');
    });
};

FileHandler.prototype.saveToEntry = function(fileEntry, callback) {
    if (this.fileEntry)
        console.log('handler already has the fileEntry');
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
        fileHandler.onWriting = true;
        writer.onwriteend = function() {
            fileHandler.onWriting = false;
            callback(true);
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
            this.contents[entry.pos2.position] = line.slice(entry.pos2.position);
            if (entry.pos.line < entry.pos2.line - 1) {
                this.contents.splice(entry.pos.line + 1,
                                     entry.pos2.line - entry.pos.line - 1);
            }
        }
        if (entry.content != deletedText) {
            console.log('mismatched deleted text: ' +
                        entry.content + ' ' + deletedText);
        }
    }
};

})();