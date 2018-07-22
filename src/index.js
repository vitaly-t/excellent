(function (window) {
    'use strict';

    /**
     * Registered entities.
     */
    var reg = {
        controllers: {},
        modules: {},
        services: {}
    };

    /**
     * Inner modules cache.
     */
    var modules;

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
         * Namespace of all registered and initialized services.
         */
        services: {},

        /**
         * Adds/Registers a new controller.
         *
         * If controller with such name already exists, it will be overridden.
         */
        addController: function (name, cb) {
            addEntity(name, cb, 'controller', reg.controllers);
        },

        /**
         * Adds/Registers a new service.
         *
         * If service with such name already exists, it will be overridden.
         */
        addService: function (name, cb) {
            addEntity(name, cb, 'service', reg.services);
        },

        /**
         * Creates and registers a new module.
         *
         * If module with such name already exists, it will be overridden.
         */
        addModule: function (name, cb) {
            addEntity(name, cb, 'module', reg.modules);
        }
    };

    function addEntity(name, cb, entity, obj) {
        if (typeof name === 'function') {
            cb = name;
            name = cb.name;
        }
        if (!name || typeof name !== 'string') {
            throw new TypeError('Invalid ' + entity + ' name specified. A non-empty string is required.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Missing function for controller ' + name + '.');
        }
        obj[name] = cb;
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
        root.services = {};
        for (var a in reg.services) {
            root.services[a] = reg.services[a]();
        }
    }

    function initModules() {
        modules = {};
        for (var a in reg.modules) {
            modules[a] = reg.modules[a]();
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
            if (name in reg.controllers) {
                var cb = reg.controllers[name];
                cb(new EController(e));
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

    function EController(node) {

        /**
         * Source DOM element that uses this controller.
         */
        this.node = node;

        this.children = {
            find: function (criteria) {

            },
            findOne: function (criteria) {

            }
        };
    }

    /**
     * Searches for all matching elements that have controllers,
     * and returns the list of controllers.
     *
     * @param {String} criteria
     *
     * @returns {Array<EController>}
     */
    EController.prototype.find = function (criteria) {

    };

    /**
     * Searches for exactly a single matching element that has a controller,
     * and returns it.
     *
     * If no matching element found, or more than one found, it throws an error.
     *
     * @param {String} criteria
     *
     * @returns {EController}
     */
    EController.prototype.findOne = function (criteria) {

    };

    /**
     * Synchronously sends data into method onReceive and returns the response,
     * if the method exists. If onReceive handler does not exist, the method
     * will do nothing, and return `undefined`.
     *
     * @param {} data
     * Any type of data.
     *
     * @returns {}
     * Whatever method onReceive returns.
     */
    EController.prototype.send = function (data) {
        if (typeof this.onReceive === 'function') {
            return this.onReceive(data, this);
        }
    };

    /**
     * Asynchronously sends data into method onReceive, and if the callback specified
     * - calls it with the response.
     *
     * @param data
     * @param {Function} [cb]
     * Optional callback to receive the response from method onReceive.
     */
    EController.prototype.post = function (data, cb) {
        var self = this;
        setTimeout(function () {
            if (typeof self.onReceive === 'function') {
                var response = self.onReceive(data, self);
                if (typeof cb === 'function') {
                    cb(response);
                }
            }
        });
    };

    initRoot();

})(this);
