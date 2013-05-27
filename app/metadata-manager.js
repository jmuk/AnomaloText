function MetadataManager(controller, model) {
    this.element = $('#metadata');
    this.element.popover({placement: 'bottom', trigger: 'hover'});
    this.shortname = '';
    this.longname = '';
    this.caretText = '';
    controller.model.location.on('move', this.onCaretMoved, this);
};

MetadataManager.prototype.updateContents = function() {
    this.element.text(this.shortname + ' ' + this.caretText);
    this.element.attr('data-original-title', this.longname);
    this.element.attr('data-content', 'position: ' + this.caretText);
};

MetadataManager.prototype.onCaretMoved = function(pos) {
    this.caretText = pos.line + ',' + pos.position;
    this.updateContents();
};

MetadataManager.prototype.onModeChanged = function(newMode) {
    this.shortname = newMode.shortname;
    this.longname = newMode.longname;
    this.updateContents();
};