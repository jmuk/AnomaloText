// The model backend which connects the editor to the file entry.
function AppModelBackend(fileHandler) {
    this.fileHandler = fileHandler;
    this.edited = false;
    this.lastEdited = 0;
    this.updateIndicator();
};

AppModelBackend.prototype.maybeSave = function(lastEdited) {
    if (this.lastEdited != lastEdited)
        return;

    if (this.fileHandler.onWriting) {
        window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                          500 /* msec */);
        return;
    }

    this.fileHandler.save((function(succeeded) {
        this.edited = false;
        this.updateIndicator();
    }).bind(this));
};

AppModelBackend.prototype.updateFileHandler = function(fileHandler) {
    if (this.fileHandler.id != fileHandler)
        this.fileHandler = fileHandler;
    this.edited = false;
    this.updateIndicator();
};

AppModelBackend.prototype.updateIndicator = function() {
    var fileName = this.fileHandler.getName();
    if (this.edited)
        fileName += '*';
    document.getElementById('indicator').textContent = fileName;
};

AppModelBackend.prototype.addHistory = function(entry) {
    this.fileHandler.edit(entry);
    var lastEdited = (new Date()).getTime();
    this.lastEdited = lastEdited;
    this.edited = true;
    this.updateIndicator();
    window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                      500 /* msec */);
};