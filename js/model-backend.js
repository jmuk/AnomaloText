// ModelBackend creates a mock of backend. The actual backend should handle
// everything -- like storing file data.
function ModelBackend() {
    // nothing
};

// An editing history happened.
ModelBackend.prototype.addHistory = function(history) {
    // nothing
};

// TBD.
// The backend should have some internal things, like modes or key-bindings.
// Then they'll be shared among files/buffers.