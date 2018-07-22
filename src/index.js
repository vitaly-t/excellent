(function (window) {
    'use strict';

    var root = {
            controllers: {}
        },
        ctrl = [],
        find = document.querySelectorAll.bind(document);

    initRoot();

    document.addEventListener('DOMContentLoaded', function () {
        initControllers();
    });

    function initRoot() {
        var e = find('[e-root]');
        if (e.length) {
            if (e.length > 1) {
                throw new Error('Multiple e-root elements are not allowed.');
            }
            var name = e[0].getAttribute('e-root');
            if (name) {
                window[name] = root; // expose the root
            }
        }
    }

    function initControllers() {
        find('[e-controller]').forEach(function (e) {
            var name = e.getAttribute('e-controller');
            if (!name) {
                throw new Error('Controller name is missing.');
            }
            if (name in root.controllers) {
                var cb = root.controllers[name];
                if (typeof cb !== 'function') {
                    throw new Error('Invalid controller ' + JSON.stringify(name) + ' type. Must be a function.');
                }
                cb();
            } else {
                throw new Error('Controller ' + JSON.stringify(name) + ' not found');
            }
        });

        // first, we get all controllers, then for each controller
        // we get all children, and check the hierarchy of controllers;

        // where to search for controllers by default?

        // TODO: Need a concept of modules + `as alias` for modules and controllers.
    }

})(this);
