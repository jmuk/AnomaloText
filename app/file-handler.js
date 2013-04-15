var FileHandler;

(function() {
var fileHandlerIds = 0;

FileHandler = function() {
    this.fileEntry = null;
    this.onWriting = false;
    this.content = new Content();
    this.buffers = {};
    this.id = fileHandlerIds++;

    this.edited = false;
    this.lastEdited = 0;
    this.updateIndicator();
};

FileHandler.prototype.getName = function() {
    return this.fileEntry ? this.fileEntry.name : '<empty>';
};

FileHandler.prototype.getFullPath = function() {
  return this.fileEntry ? this.fileEntry.fullPath : ('<empty>-' + this.id);
};

FileHandler.prototype.empty = function() {
    if (this.content.getLines() == 0)
        return true;
    if (this.content.getLines() == 1 && this.content.lines[0].length == 0)
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
            fileHandler.content.lines = reader.result.split('\n');
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

        fileHandler.content.getFullText(function(text) {
            writer.write(new Blob(text, {type: 'text/plain'})); });
    });
};

FileHandler.prototype.maybeSave = function(lastEdited) {
    if (this.lastEdited != lastEdited)
        return;

    if (this.onWriting) {
        window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                          500 /* msec */);
        return;
    }

    this.save((function(succeeded) {
        this.edited = false;
        this.updateIndicator();
    }).bind(this));
};

FileHandler.prototype.updateIndicator = function() {
    var fileName = this.fileHandler.getName();
    if (this.edited)
        fileName += '*';
    document.getElementById('indicator').textContent = fileName;
};

FileHandler.prototype.onContentChanged = function(content) {
    var lastEdited = (new Date()).getTime();
    this.lastEdited = lastEdited;
    this.edited = true;
    this.updateIndicator();
    window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                      500 /* msec */);
};

})();