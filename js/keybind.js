function Keybind() {
    this.commands = {};
}

Keybind.prototype.execInternal = function(method_name, args) {
    console.log(method_name);
    console.log(args);
    return true;
};

Keybind.prototype.executeCommand = function(commandText) {
    if (!(commandText in this.commands))
        return false;

    var command;
    var consumed = false;
    if (typeof(this.commands[commandText]) == 'string') {
        command = [this.commands[commandText]];
    } else {
        command = this.commands[commandText];
    }
    for (var i = 0; i < command.length; i++) {
        var method_name = command[i];
        var args = [];
        if (method_name.indexOf(' ') > 0) {
            var names = method_name.split(' ');
            method_name = names[0];
            args = names.slice(1);
        }
        if (this.execInternal(method_name, args))
            consumed = true;
    }
    return consumed;
};

function DefaultKeybind(model) {
    this.model = model;
};

DefaultKeybind.prototype = Object.create(Keybind.prototype);

DefaultKeybind.prototype.execInternal = function(method_name, args) {
    var method = this.model[method_name];
    if (!method) {
        console.warn('cannot find method for ' + method_name);
        return false;
    }
    method.apply(this.model, args);
    return true;
};

DefaultKeybind.prototype.commands = {
    'Left': 'moveBackward',
    'Right': 'moveForward',
    'Up': 'movePreviousLine',
    'Down': 'moveNextLine',
    'C-a': 'moveToStartOfLine',
    'C-e': 'moveToEndOfLine',
    'C-x': ['copyToClipboard', 'deleteSelection'],
    'C-c': 'copyToClipboard',
    'C-v': 'pasteFromClipboard',
    'C-z': 'undo',
    'C-y': 'redo',
    'M-f': 'moveNextWord',
    'M-b': 'movePreviousWord',
    'Enter': 'newLine',
    'PageUp': 'movePreviousPage',
    'PageDown': 'moveNextPage',
    'S-PageUp': 'movePreviousPage true',
    'S-PageDown': 'moveNextPage true',
    'Backspace': 'deletePreviousChar',
    'Delete': 'deleteNextChar',
    'S-Left': 'moveBackward true',
    'S-Right': 'moveForward true',
    'S-Up': 'movePreviousLine true',
    'S-Down': 'moveNextLine true',
    'M-S-f': 'moveNextWord true',
    'M-S-b': 'movePreviousWord true',
    'Tab': 'incrementIndent',
    'S-Tab': 'decrementIndent'
};
