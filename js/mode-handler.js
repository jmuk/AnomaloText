function Mode(worker) {
    this.worker = worker;
    if (this.worker) {
        this.worker.addEventListener('message', this.messageHandler.bind(this));
        this.worker.postMessage({command:'metadata'});
    }
    this.shortname = '';
    this.longname = 'default mode';
    this.pattern = /[a-zA-Z_0-9]+/;
    this.parens = "({[]})";
    this.callbacks = {};
    this.callback_id = 0;
}

Mode.prototype.messageHandler = function(e) {
    if (e.data.command == 'metadata') {
        this.shortname = e.data.shortname;
        this.longname = e.data.longname;
        this.pattern = e.data.pattern;
        this.parens = e.data.parens;
        if (window.onModeLoaded)
            window.onModeLoaded(this);
    } else if (e.data.command == 'highlight') {
        var callback = this.callbacks[e.data.callback_id];
        if (callback)
            callback(e.data.id, e.data.range);
    } else if (e.data.command == 'indent') {
        var callback = this.callbacks[e.data.callback_id];
        if (callback)
            callback(e.data.id, e.data.indents);
    }
};

Mode.prototype.postMessage = function(message, callback) {
    if (!this.worker)
        return;

    this.callbacks[this.callback_id] = callback;
    message.callback_id = this.callback_id;
    this.worker.postMessage(message);
    this.callback_id++;
};

Mode.prototype.askHighlight = function(contents, request_id, callback) {
    this.postMessage(
        {command:'highlight', id: request_id, contents: contents}, callback);
};

Mode.prototype.indentFor = function(lines, start, end, request_id, callback) {
    this.postMessage(
        {command:'indent', id: request_id, lines: lines, start: start, end: end},
        callback);
};

function ModeHandler(basePath) {
    this.modes = [];
    this.basePath = basePath;
    this.defaultMode = new Mode(null);
}

ModeHandler.prototype.modeRules = [
  {pattern: /\.py$/, mode: 'python-mode.js'}
];

ModeHandler.prototype.getMode = function(filename) {
    for (var i = 0; i < this.modes.length; i++) {
        if (this.modes[i].pattern.test(filename))
            return this.modes[i].mode;
    }

    for (var i = 0; i < this.modeRules.length; i++) {
        if (this.modeRules[i].pattern.test(filename)) {
            var mode = new Mode(
                new Worker(this.basePath + this.modeRules[i].mode));
            this.modes.push({pattern: this.modeRules[i].pattern,
                             mode: mode});
            return mode;
        }
    }

    return this.defaultMode;
};