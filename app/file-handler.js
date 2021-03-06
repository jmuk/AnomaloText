var FileHandler;

(function() {
var fileHandlerIds = 0;

FileHandler = function() {
    this.fileEntry = null;
    this.onWriting = false;
    this.content = new Content();
    this.content.on('change', this.onContentChanged, this);
    this.id = fileHandlerIds++;

    this.edited = false;
    this.editId = 0;
    this.lastEdited = 0;
    _.extend(this, Backbone.Events);
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
            fileHandler.editId++;
            fileHandler.trigger('fileLoad');
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
        function onSaved() {
            fileHandler.onWriting = false;
            fileHandler.editId++;
            callback(true);
        }
        fileHandler.onWriting = true;
        writer.onwriteend = function() {
            writer.onwriteend = onSaved();
            fileHandler.content.getFullText(function(text) {
                writer.write(new Blob([text], {type: 'text/plain'})); });
        };
        writer.onerror = function() {
            console.log('error happens during saving');
            fileHandler.onWriting = false;
            callback(false);
        };

        writer.truncate(0);
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
        this.trigger('change');
    }).bind(this));
};

FileHandler.prototype.onContentChanged = function() {
    var lastEdited = (new Date()).getTime();
    this.lastEdited = lastEdited;
    this.edited = true;
    this.trigger('change');
    window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                      500 /* msec */);
};

})();