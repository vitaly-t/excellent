/*
* So, searching for controllers with selectors becomes more complicated.
*
* What will ctrl.find(selectors) do?
*
* We can only search for elements now, we cannot search for controllers,
* unless we require that controller name is specified also:
* find(selectors, ctrl)
*
* And for each element we can assign `e.controllers`, as a hidden property.
*
* NOTE: https://stackoverflow.com/questions/31773599/can-i-use-an-attribute-selector-for-contains-in-queryselector
* So we can search for an attribute that contains a sub-string.
*
* Controller might include property `siblings` = array if strings - other controllers/names
* on the same element? NO, we would already have `.e.controllers` with that, so I just
* need to put the controller name into the controller, like `name`.
*
* NOTE: I badly want an alternative name to e-controllers, that's too f. long :)
* Possibles: e-bind, e-link, e-control, e-attach, e-mutate, e-directive, e-apply,
* e-embed, e-ctrl, e-connect,
*
* Favourites: e-bind
*
* It is the best, to have only: e-root, e-bind
*
* Alternatively, I can rename Controllers into Components, and use e-attach instead, to attach components,
* or maybe e-apply? Actually, e-bind for components works well also.
*
* WAIT! Since each controller is a function, best is to keep controllers.
*
* ------------
*
* TODO: Start splitting the library into multiple pieces, or it will soon become unmanageable
*
* TODO: Add support for controller derivation/extension. A controller may either
* create another controller, on do it indirectly, like: `controllers.add(name)`
*
* TODO: Perhaps add manual controller creation globally, just in case?
* NO: Life cycle will be in conflict with controllers, and may raise more duplicate issues
*
* TODO: Should check that controller names are not repeated
*
* TODO: Need to figure out how to make onDestroy work.
* */

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
     * Controller name-to-function cache/map.
     */
    var ctrlCache = {};

    /**
     * Complete list of controllers.
     */
    var controllers = [];

    /**
     * All valid elements with controllers.
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

    // Abbreviations:
    var jStr = JSON.stringify.bind(JSON);

    window.excellent = root;

    document.addEventListener('DOMContentLoaded', function () {
        initServices();
        initModules();
        initControllers();
    });

    function addEntity(name, cb, entity, obj) {
        name = typeof name === 'string' ? name : '';
        var m = name.match(/[a-z$_][a-z$_0-9]*/i);
        if (!m || m[0] !== name) {
            throw new TypeError('Invalid ' + entity + ' name ' + jStr(name) + ' specified.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Missing function for ' + entity + ' ' + jStr(name) + '.');
        }
        obj[name] = cb;
    }

    function find(selectors) {
        var f = document.querySelectorAll(selectors);
        var res = [];
        for (var i = 0; i < f.length; i++) {
            res.push(f[i]);
        }
        return res;
    }

    function trim(txt) {
        return txt.replace(/^[\s]*|[\s]*$/g, '');
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

    function initServices() {
        root.services = {};
        for (var a in reg.services) {
            var s = {};
            root.services[a] = s;
            reg.services[a].call(s, s);
        }
    }

    function initModules() {
        modules = {};
        for (var a in reg.modules) {
            var s = {}; // scope
            modules[a] = s;
            reg.modules[a].call(s, s);
        }
    }

    function initControllers() {
        controllers.length = 0;
        elements.length = 0;
        find('[e-bind]')
            .forEach(function (e) {
                var added;
                e.getAttribute('e-bind')
                    .split(',')
                    .forEach(function (name) {
                        // TODO: Add throw if duplicate controllers
                        name = trim(name);
                        if (name) {
                            var m = name.match(/([a-z$_][a-z$_0-9]*\.?)*[^.]/i);
                            if (!m || m[0] !== name) {
                                throw new Error('Invalid controller name ' + jStr(name));
                            }
                            var c = new EController(e);
                            getCtrlFunc(name).call(c, c);
                            controllers.push(c);
                            added = true;
                        }
                    });
                if (added) {
                    // TODO: Need to add controllers here to the element
                    elements.push(e);
                }
            });
        controllers.forEach(function (c) {
            if (typeof c.onInit === 'function') {
                c.onInit();
            }
        });
        /*
        This seems obsolete, check MutationObserver instead

        elements.forEach(function (e) {
            e.on('DOMNodeRemoved', function () {
                // go through all attached controllers, and call onDestroy
            });
        });*/
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
        if (name in ctrlCache) {
            return ctrlCache[name]; // use the cache
        }
        if (name.indexOf('.') === -1) {
            // it is a simple controller name;
            var f = reg.controllers[name]; // the function
            if (!f) {
                throw new Error('Controller ' + jStr(name) + ' not found.');
            }
            ctrlCache[name] = f; // updating cache
            return f;
        }
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
                ctrlCache[name] = obj;
                return obj;
            }
            throw new Error('Controller ' + jStr(name) + ' not found.'); // TODO: Refactor so thrown in one place only
        }
        throw new Error('Module ' + jStr(moduleName) + ' not found.');
    }

    /*
        to be used on the root level

        function findControllers(selectors) {

        }
    */

    /**
     * @class EController
     * @description
     * Virtual controller class.
     *
     * @param node
     * @constructor
     */
    function EController(node) {
        /**
         * Source DOM element that uses this controller.
         */
        this.node = node;

        this.extend = function (/*ctrlName*/) {
            /*
            * Checks for the controller already being on the element,
            * and if so - return in. Otherwise, it will create a new
            * controller and add it to the element.
            *
            * This will allow for both single and multiple inheritances.
            *
            * */
        };

        /**
         *
         * @type {function}
         */
        this.onInit = null;

        /**
         *
         * @type {function}
         */
        this.onDestroy = null;
    }

    /**
     * Searches for all matching elements that have controllers,
     * and returns the list of controllers.
     *
     * @param {String} selectors
     *
     * @returns {Array<EController>}
     */
    EController.prototype.find = function (/*selectors*/) {

    };

    /**
     * Searches for exactly a single matching element that has a controller,
     * and returns it.
     *
     * If no matching element found, or more than one found, it throws an error.
     *
     * @param {String} selectors
     *
     * @returns {EController}
     */
    EController.prototype.findOne = function (/*selectors*/) {

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
