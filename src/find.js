excellent.find = function (options) {
    document.querySelectorAll('*').forEach(function (node) {
        // Do whatever you want with the node object.
        var attributes = [];
        for (var i = 0; i < node.attributes.length; i++) {
            var a = node.attributes[i];
            attributes.push({name: a.name, value: a.value});
        }
        console.log(node.tagName, attributes);
    });
};
