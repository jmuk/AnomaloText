function EditingHistoryEntry(type, content, pos, pos2) {
    this.type = type;
    this.content = content;
    this.pos = pos;
    this.pos2 = pos2;
    this.timestampStart = (new Date()).getTime();
    this.timestampEnd = this.timestampStart;
}

EditingHistoryEntry.prototype.maybeMerge = function(other) {
    if (this.type != other.type ||
	Math.abs(other.timestampStart - this.timestampEnd) >= 1000) {
	return false;
    }

    // Do not merge multi-line operation.
    if (this.pos.line != this.pos2.line ||
	other.pos.line != other.pos2.line) {
	return false;
    }
    // Do not merge operations on different lines.
    if (this.pos.line != other.pos.line)
	return false;

    if (this.type == "insert") {
	if (this.pos2.position == other.pos.position) {
	    this.content += other.content;
	    this.pos2.position = other.pos2.position;
	    this.timestampEnd = other.timestampEnd;
	    return true;
	} else if (other.pos2.position  == this.pos.position) {
	    this.content = other.content + this.content;
	    this.pos.position = other.pos.position;
	    this.timestampEnd = other.timestampEnd;
	    return true;
	}
    } else {
	if (this.pos.position == other.pos.position) {
	    // Another delete happens on the same position.
	    // Should be concatenated. From the original point of view,
	    // the end-position has to be extending to two.
	    var other_length = other.pos2.position - other.pos.position;
	    this.pos2.position += other_length;
	    this.content += other.content;
	    this.timestampEnd = other.timestampEnd;
	    return true;
	} else if (this.pos.position == other.pos2.position) {
	    this.pos.position = other.pos.position;
	    this.content = other.content + this.content;
	    this.timestampEnd = other.timestampEnd;
	    return true;
	}
    }
    return false;
};

EditingHistoryEntry.prototype.inversed = function() {
    var inversedType = (this.type == 'insert') ? 'delete' : 'insert';
    return new EditingHistoryEntry(inversedType, this.content, this.pos, this.pos2);
};

function EditingHistory(backend) {
    this.backend = backend;
    this.entries = new Zipper([]);
}

EditingHistory.prototype.push = function(newEntry) {
    // the backend doesn't care the merge of history entry.
    this.backend.addHistory(newEntry);

    var previous = this.entries.previous();
    this.entries.back = [];
    if (previous) {
	if (previous.maybeMerge(newEntry))
	    return;
    }
    this.entries.insert(newEntry);
};

EditingHistory.prototype.undo = function() {
    if (!this.entries.backward())
	return null;
    var result = this.entries.current().inversed();
    this.backend.addHistory(result);
    return result;
};

EditingHistory.prototype.redo = function() {
    var current = this.entries.current();
    if (!this.entries.forward(true))
	return null;
    this.backend.addHistory(current);
    return current;
};
