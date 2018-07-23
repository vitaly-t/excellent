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
     * Initialized modules.
     */
    var modules;

    /**
     * Inner name-to-function cache.
     */
    var controllers = {};

    /**
     * All elements with controllers.
     */
    var elements = [];

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
        name = typeof name === 'string' && trim(name); // TODO: Should parse it, not trim
        if (!name) {
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

    function find(selectors) {
        var f = document.querySelectorAll(selectors);
        var res = [];
        for (var i = 0; i < f.length; i++) {
            res.push(f[i]);
        }
        return res;
    }

    function initServices() {
        root.services = {};
        for (var a in reg.services) {
            root.services[a] = reg.services[a]();
        }
    }

    function initModules() {
        modules = {};
        for (var a in reg.modules) {
            var m = reg.modules[a]();
            modules[a] = (m && typeof m === 'object') ? m : {};
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
            if (!validCtrlName(name)) {
                throw new Error('Invalid controller name ' + JSON.stringify(name));
            }
            getCtrlFunc(name)(new EController(e));
        });
    }

    /**
     * Searches for controller function, based on the controller's full name.
     * For that it uses cache of names, plus modules.
     *
     * @param name
     *
     * @returns {function}
     * Either controller function or throws.
     *
     */
    function getCtrlFunc(name) {
        if (name in controllers) {
            return controllers[name]; // use the cache
        }
        if (name.indexOf('.') === -1) {
            // it is a simple controller name;
            var f = reg.controllers[name]; // the function
            if (!f) {
                throw new Error('Controller ' + JSON.stringify(name) + ' not found.');
            }
            controllers[name] = f; // updating cache
            return f;
        } else {
            // the controller is from a module
            var names = name.split('.');
            var moduleName = names[0];
            if (moduleName in modules) {
                var obj = modules[moduleName];
                for (var i = 1; i < names.length; i++) {
                    var n = names[i];
                    if (n in obj) {
                        obj = obj[n];
                    } else {
                        obj = null;
                        break;
                    }
                }
                if (typeof obj === 'function') {
                    controllers[name] = obj;
                    return obj;
                }
                throw new Error('Controller ' + JSON.stringify(name) + ' not found.');
            }
            throw new Error('Module ' + JSON.stringify(moduleName) + ' not found.');
        }
    }

    function trim(txt) {
        return txt.replace(/^[\s]*|[\s]*$/g, '');
    }

    function validCtrlName(name) {
        var m = name.match(/([a-z$_][a-z$_0-9]*.?)*[^.]/i);
        return m && m[0] === name;
    }

    function findAllController(selectors) {

    }

    function findOneController(selectors) {

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
