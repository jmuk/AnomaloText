function Observers() {
    this.observers = [];
};

Observers.prototype.push = function(obs) {
    this.observers.push(obs);
};

Observers.prototype.remove = function(obs) {
    var index = this.observers.indexOf(obs);
    if (index >= 0)
        this.observers.splice(index, 1);
};

Observers.prototype.notify = function(method, args) {
    for (var i = 0; i < this.observers.length; ++i) {
        var obs = this.observers[i];
        var m = obs[method];
        if (m)
            m.apply(obs, args);
    }
};
