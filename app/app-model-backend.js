// The model backend which connects the editor to the file entry.
function AppModelBackend(fileEntry, contents) {
    this.fileEntry = fileEntry;
    this.contents = contents.split('\n');
    this.onWriting = false;
    this.edited = false;
    this.lastEdited = 0;
    this.updateIndicator();
};

AppModelBackend.prototype.maybeSave = function(lastEdited) {
    if (this.lastEdited != lastEdited) {
        return;
    }
    if (this.onWriting) {
        window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                          500 /* msec */);
        return;
    }

    var modelBackend = this;
    this.fileEntry.createWriter(function(writer) {
        modelBackend.onWriting = true;
        writer.onwriteend = function() {
            modelBackend.onWriting = false;
            modelBackend.edited = false;
            modelBackend.updateIndicator();
        };
        writer.onerror = function() {
            console.log('error happens during saving');
            modelBackend.onWriting = false;
        };

        var contents = [];
        for (var i = 0; i < modelBackend.contents.length; i++) {
            contents.push(modelBackend.contents[i]);
            contents.push('\n');
        }
        writer.write(new Blob(contents, {type: 'text/plain'}));
    });
};

AppModelBackend.prototype.updateIndicator = function() {
    var content = this.fileEntry.name;
    if (this.edited) {
        content += '*';
    }
    document.getElementById('indicator').textContent = content;
};

AppModelBackend.prototype.addHistory = function(entry) {
    if (entry.type == 'insert') {
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
            console.err('mismatched deleted text: ' +
                        entry.content + ' ' + deletedText);
        }
    }
    var lastEdited = (new Date()).getTime();
    this.lastEdited = lastEdited;
    this.edited = true;
    this.updateIndicator();
    window.setTimeout((function() { this.maybeSave(lastEdited); }).bind(this),
                      500 /* msec */);
};