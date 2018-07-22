(function (window) {
    'use strict';

    var controllers = {}, modules = {}, services = {};

    /**
     * Library's root object.
     */
    var root = {
        /**
         * Library name.
         */
        name: 'Excellent.js',

        /**
         * Library version
         */
        version: '0.0.1',

        /**
         * Registered services namespace
         */
        services: {},

        /**
         * Creates and registers a new controller.
         */
        addController: function (name, cb) {
            if (typeof name === 'function') {
                cb = name;
                name = cb.name;
            }
            controllers[name] = cb;
        },

        /**
         * Creates and registers a new service.
         */
        addService: function (name, cb) {
            if (typeof name === 'function') {
                cb = name;
                name = cb.name;
            }
            services[name] = cb;
        },

        /**
         * Creates and registers a new module.
         */
        addModule: function (name, cb) {
            if (typeof name === 'function') {
                cb = name;
                name = cb.name;
            }
            modules[name] = cb;
        }
    };

    function EController() {
        /* for later, to be used only when finding one  */
    }

    window.excellent = root;

    document.addEventListener('DOMContentLoaded', function () {
        initServices();
        initModules();
        initControllers();
    });

    // Abbreviated functions;
    var find = document.querySelectorAll.bind(document);

    function initServices() {
        for (var a in services) {
            root.services[a] = services[a]();
        }
    }

    function initModules() {
        for (var a in modules) {
            modules[a] = modules[a](); // overriding, for now
        }
    }

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
            if (name in controllers) {
                var cb = controllers[name];
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

        // A module is like a library, so its controllers are like directives/components
        // The problem is, components need to be parameterizable, which the container could,
        // in the background.
        // So, a controller must be able to parametrize its child controllers.

        // Eureka! Simple Send/onReceive protocol, plus an easy `find(search)` method for each controller,
        // where `search` would be the standard DOMSearch filter.
    }

    initRoot();

})(this);
