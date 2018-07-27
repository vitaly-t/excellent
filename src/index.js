/*
* Overall things still outstanding:
*
* TODO: Automated tests
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
     * All valid elements with controllers.
     */
    var elements = [];

    /**
     * Library's root object.
     */
    var root = new Excellent();

    window.excellent = root;

    // Abbreviations:
    var jStr = JSON.stringify.bind(JSON);

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
            throw new TypeError('Initialization function in ' + entity + ' ' + jStr(name) + ' is missing.');
        }
        obj[name] = cb;
    }

    function find(selectors) {
        var f = document.querySelectorAll(selectors);
        var res = [];
        f.forEach(function (e) {
            res.push(e);
        });
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
        bind();
    }

    /**
     * Indicates when the binding is in progress.
     *
     * @type {boolean}
     */
    var binding;

    /**
     * Binds all elements to controllers, if not yet bound.
     */
    function bind() {
        binding = true;
        var allCtrl = [], els = [];
        find('[e-bind]')
            .forEach(function (e) {
                if (elements.indexOf(e) === -1) {
                    var namesMap = {}, eCtrl = [];
                    e.getAttribute('e-bind')
                        .split(',')
                        .forEach(function (name) {
                            name = trim(name);
                            if (name) {
                                var m = name.match(/([a-z$_][a-z$_0-9]*\.?)*[^.]/i);
                                if (!m || m[0] !== name) {
                                    throw new Error('Invalid controller name ' + jStr(name));
                                }
                                if (name in namesMap) {
                                    throw new Error('Duplicate controller name ' + jStr(name) + ' not allowed.');
                                }
                                namesMap[name] = true;
                                var c = new EController(name, e);
                                getCtrlFunc(name).call(c, c);
                                eCtrl.push(c);
                                allCtrl.push(c);
                            }
                        });
                    if (eCtrl.length) {
                        e.controllers = eCtrl;
                        elements.push(e);
                        els.push(e);
                    }
                }
            });
        allCtrl.forEach(function (c) {
            if (typeof c.onInit === 'function') {
                c.onInit();
            }
        });
        els.forEach(function (/*e*/) {
            // TODO: Need to inject onDestroy handler here:
            // Check: DOMNodeRemoved vs MutationObserver
        });
        binding = false;
        console.log('Elements Length:', elements.length);
    }

    // from: https://stackoverflow.com/questions/30578673/is-it-possible-to-make-queryselectorall-live-like-getelementsbytagname
    /*
    function querySelectorAllLive(element, selector) {

        // Initialize results with current nodes.
        var result = Array.prototype.slice.call(element.querySelectorAll(selector));

        // Create observer instance.
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                [].forEach.call(mutation.addedNodes, function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
                        result.push(node);
                    }
                });
            });
        });

        // Set up observer.
        observer.observe(element, { childList: true, subtree: true });

        return result;
    }*/

    /**
     * Searches for controller function, based on the controller's full name.
     * For that it uses cache of names, plus modules.
     *
     * @param name
     *
     * @param [noError]
     * Tells it not to throw an errors, rather return null.
     *
     * @returns {function|undefined}
     * Either controller function or throws.
     *
     */
    function getCtrlFunc(name, noError) {
        if (name in ctrlCache) {
            return ctrlCache[name]; // use the cache
        }
        if (name.indexOf('.') === -1) {
            // it is a simple controller name;
            var f = reg.controllers[name]; // the function
            if (f) {
                ctrlCache[name] = f; // updating cache
                return f;
            }
        }
        // the controller is from a module
        var names = name.split('.');
        var moduleName = names[0];
        if (!(moduleName in modules)) {
            if (noError) {
                return;
            }
            throw new Error('Module ' + jStr(moduleName) + ' not found.');
        }
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
        if (!noError) {
            throw new Error('Controller ' + jStr(name) + ' not found.');
        }
    }

    function Excellent() {

        /**
         * Library version
         */
        this.version = '0.0.1';

        /**
         * Namespace of all registered and initialized services.
         */
        this.services = {};

        /**
         * Adds/Registers a new controller.
         *
         * If controller with such name already exists, it will be overridden.
         */
        this.addController = function (name, cb) {
            addEntity(name, cb, 'controller', reg.controllers);
        };

        /**
         * Adds/Registers a new service.
         *
         * If service with such name already exists, it will be overridden.
         */
        this.addService = function (name, cb) {
            addEntity(name, cb, 'service', reg.services);
        };

        /**
         * Creates and registers a new module.
         *
         * If module with such name already exists, it will be overridden.
         */
        this.addModule = function (name, cb) {
            addEntity(name, cb, 'module', reg.modules);
        };

        /**
         * Searches for elements not yet bound, and binds them to controllers.
         */
        this.bind = function () {
            if (binding) {
                // Called during construction on initialization,
                // so need to delay the call, to avoid recursion:
                setTimeout(bind);
            } else {
                bind();
            }
        };
    }

    /**
     * @class EController
     * @description
     * Virtual controller class.
     *
     * @param node
     * @constructor
     */
    function EController(name, node) {

        /**
         * Full controller name.
         */
        Object.defineProperty(this, 'name', {value: name});

        /**
         * Source DOM element that uses this controller.
         *
         * NOTE: In the current implementation the element is static (not live).
         */
        Object.defineProperty(this, 'node', {value: node});

        /**
         * @type {function}
         */
        this.onInit = null;

        /**
         * @type {function}
         */
        this.onDestroy = null;
    }

    var ecp = EController.prototype;

    /**
     * Indicates that the element's content has been modified to contain new
     * controller bindings, and such controllers need to be attached.
     *
     * NOTE: This method picks up only new elements, i.e. you cannot manually extend
     * bindings and expect an update here, only method `extend` can do that.
     */
    ecp.bind = function () {
        // TODO: See if we can automate this through a watch, then it would be awesome!


    };

    /**
     * Inheritance support.
     */
    ecp.extend = function (/*ctrlName*/) {
        /*
        * TODO: inheritance support is needed.
        *
        * Checks for the controller already being on the element,
        * and if so - return in. Otherwise, it will create a new
        * controller and add it to the element.
        *
        * This will allow for both single and multiple inheritances.
        *
        * */
    };

    /**
     * @method EController.depends
     * @description
     * Verifies that each controller in the list of dependencies exists, or else throws an error.
     *
     * This optional level of verification is useful when sub-controllers are rarely used, or loaded
     * dynamically. And such explicit verification makes the code more robust.
     *
     * @param {Array<String>>} ctrlNames
     */
    ecp.depends = function (ctrlNames) {
        if (!Array.isArray(ctrlNames)) {
            throw new TypeError('Invalid list of controller names.');
        }
        ctrlNames.forEach(function (name) {
            if (!getCtrlFunc(name, true)) {
                throw new Error('Controller ' + jStr(name) + ' depends on ' + jStr(this.name) + ', which was not found.');
            }
        }, this);
    };

    /**
     * Searches for all matching elements that have controllers.
     *
     * Can only be used after initialization.
     *
     * @param {String} selectors
     *
     * @returns {Array<Element>}
     */
    ecp.find = function (selectors) {
        return find(selectors).filter(function (e) {
            return e.controllers;
        });
    };

    /**
     * Searches for exactly a single matching element that has a controller,
     * and returns it.
     *
     * If no matching element found, or more than one found, it throws an error.
     *
     * @param {String} selectors
     *
     * @returns {Element}
     */
    ecp.findOne = function (selectors) {
        var a = this.find(selectors);
        if (a.length > 1) {
            throw new Error('A single element was expected, but found ' + a.length + '.');
        }
        if (!a.length) {
            throw new Error('A single element was expected, but none found.');
        }
        return a[0];
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
    ecp.send = function (data) {
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
    ecp.post = function (data, cb) {
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
