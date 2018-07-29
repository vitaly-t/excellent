(function () {
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
     * All elements with controllers, currently in the DOM.
     */
    var elements = [];

    /**
     * Library's root object.
     *
     * @type {Excellent}
     */
    var root = new Excellent();

    /**
     * Helps observing when elements are removed.
     *
     * @type {DestroyObserver}
     */
    var observer = new DestroyObserver();

    /**
     * Indicates when the binding is in progress.
     *
     * @type {boolean}
     */
    var binding;

    window.excellent = root;

    // Abbreviations:
    var jStr = JSON.stringify.bind(JSON);

    document.addEventListener('DOMContentLoaded', function () {
        initServices();
        initModules();
        bind();
        if (typeof root.onInit === 'function') {
            root.onInit();
        }
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

    function find(selectors, node) {
        var f = (node || document).querySelectorAll(selectors);
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
                window[name] = root; // expose the alternative root name
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

    /**
     * Binds all elements to controllers, if not yet bound.
     */
    function bind(node) {
        binding = true;
        var allCtrl = [], els = [], init = !elements.length;
        find('[e-bind]', node)
            .forEach(function (e) {
                // skipping elements search during the initial binding:
                var idx = init ? -1 : elements.indexOf(e);
                if (idx === -1) {
                    var namesMap = {}, eCtrl;
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
                                eCtrl = eCtrl || {};
                                eCtrl[name] = c;
                                allCtrl.push(c);
                            }
                        });
                    if (eCtrl) {
                        e.controllers = eCtrl;
                        elements.push(e);
                        els.push(e);
                    }
                }
            });
        els.forEach(observer.watch);
        allCtrl.forEach(function (c) {
            if (typeof c.onInit === 'function') {
                c.onInit();
            }
        });
        binding = false;
    }

    /**
     * @constructor
     * @private
     * @description
     * Helps watching node elements removal from DOM, in order to provide onDestroy notification
     * for all corresponding controllers.
     *
     * Currently, it provides safe nada for IE9 and IE10, to be fixed later.
     */
    function DestroyObserver() {
        // TODO: Need to add support for IE9 and IE10, where MutationObserver is not supported.
        var mo = typeof MutationObserver !== 'undefined' && new MutationObserver(mutantCB);

        function mutantCB(mutations) {
            mutations.forEach(function (m) {
                for (var i = 0; i < m.removedNodes.length; i++) {
                    var e = m.removedNodes[i];
                    if (e.controllers) {
                        purge(e);
                    }
                }
            });
        }

        /**
         * Removes one element from the list of active elements, and sends onDestroy into all linked controllers.
         *
         * @param {} e
         * Element being destroyed.
         */
        function purge(e) {
            var idx = elements.indexOf(e);
            if (idx >= 0) {
                elements.splice(idx, 1);
                for (var a in e.controllers) {
                    var c = e.controllers[a];
                    if (typeof c.onDestroy === 'function') {
                        c.onDestroy();
                    }
                }
            }
        }

        /**
         * Initiates watching the element.
         *
         * @param {Element} e
         * Element to be watched.
         */
        this.watch = function (e) {
            if (mo) {
                mo.observe(e, {childList: true});
            }
        };
    }

    /**
     * Searches for controller function, based on the controller's full name.
     * For that it uses cache of names, plus modules.
     *
     * @param name
     *
     * @param [noError]
     * Tells it not to throw on errors, and rather return null.
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
        } else {
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
        }

        if (!noError) {
            throw new Error('Controller ' + jStr(name) + ' not found.');
        }
    }

    /**
     * @class Excellent
     */
    function Excellent() {

        /**
         * @property Excellent#version
         * Library version, automatically injected during the build process,
         * and so available only with the compressed version of the library.
         */
        this.version = '<version>';

        /**
         * @property Excellent#services
         * Namespace of all registered and initialized services.
         */
        this.services = {};

        /**
         * @method Excellent.onInit
         * @description
         * Called after all controllers have been initialized.
         *
         * @type {Function|null}
         */
        this.onInit = null;

        /**
         * @method Excellent.addController
         * @description
         * Adds/Registers a new controller.
         *
         * If controller with such name already exists, it will be overridden.
         */
        this.addController = function (name, cb) {
            addEntity(name, cb, 'controller', reg.controllers);
        };

        /**
         * @method Excellent.addService
         * @description
         * Adds/Registers a new service.
         *
         * If service with such name already exists, it will be overridden.
         */
        this.addService = function (name, cb) {
            addEntity(name, cb, 'service', reg.services);
        };

        /**
         * @method Excellent.addModule
         * @description
         * Creates and registers a new module.
         *
         * If module with such name already exists, it will be overridden.
         */
        this.addModule = function (name, cb) {
            addEntity(name, cb, 'module', reg.modules);
        };

        /**
         * @method Excellent.bind
         * @description
         * Searches for elements not yet bound, and binds them to controllers.
         *
         * It can be used when a controller creates a new controlled element
         * outside of its list of children.
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

        /**
         * @method Excellent.find
         * @description
         * Searches for controlled elements within document.
         *
         * It should only be called after initialization.
         *
         * @param {String} selectors
         * Standard DOM selectors.
         *
         * @returns {Array<Element>}
         * Controlled elements matching the selectors.
         */
        this.find = function (selectors) {
            return find(selectors).filter(function (e) {
                return e.controllers;
            });
        };

        /**
         * @method Excellent.findControllers
         * @description
         * Searches the entire document for all initialized controllers by a given controller name.
         *
         * It will skip controllers that haven't been initialized yet.
         *
         * @param {String} ctrlName
         * Controller name to search by.
         *
         * @returns {Array<EController>}
         * List of found controller objects.
         */
        this.findControllers = function (ctrlName) {
            // TODO: Need to validate the name here!
            var selectors = '[e-bind*="' + ctrlName + '"]';
            return this.find(selectors).filter(pick).map(pick);

            function pick(e) {
                // This also caters for dynamically created controlled
                // elements that haven't been initialized yet:
                return e.controllers[ctrlName];
            }
        };
    }

    /**
     * @class EController
     * @description
     * Virtual controller class.
     *
     * @param name
     * @param node
     */
    function EController(name, node) {

        /**
         * @member EController#name
         * @type {String}
         * @readonly
         * @description
         * Full controller name.
         */
        Object.defineProperty(this, 'name', {value: name});

        /**
         * @member EController#node
         * @type {Element}
         * @readonly
         * @description
         * Source DOM element that uses this controller.
         *
         * NOTE: In the current implementation the element is static (not live).
         */
        Object.defineProperty(this, 'node', {value: node});

        /**
         * @member EController#onInit
         * @type {function}
         * @description
         * Optional initialization event handler.
         */

        /**
         * @member EController#onDestroy
         * @type {function}
         * @description
         * Optional de-initialization event handler.
         */
    }

    var ecp = EController.prototype; // abbreviation

    /**
     * @method EController.bind
     * @description
     * Indicates that the element's content has been modified to contain new controller bindings,
     * and such controllers need to be attached.
     *
     * Requires that controller is initialized.
     *
     * NOTE: This method picks up only new elements, i.e. you cannot manually extend bindings
     * and expect an update here, only method `extend` can do that.
     */
    ecp.bind = function () {
        this.reqCtrl('bind');
        bind(this.node);
    };

    /**
     * @method EController.extend
     * @description
     * Extends the current element with another controller(s), thus providing functional inheritance.
     *
     * Requires that controller is initialized.
     *
     * @param {String|Array<String>>} ctrlName
     * Either a single controller name, or an array of names.
     *
     * @returns {EController|Array<EController>}
     * - if you pass in a single controller name, it returns a single controller.
     * - if you pass in an array of names, it returns an array of controllers.
     */
    ecp.extend = function (ctrlName) {
        var t = typeof ctrlName, arr = Array.isArray(ctrlName);
        if (!t || (t !== 'string' && !arr)) {
            throw new TypeError('Parameter \'ctrlName\' is invalid.');
        }
        var ctrl = this.reqCtrl('extend');

        function ext(name) {
            // TODO: Should validate controller name here!
            var c = this.node.controllers[name];
            if (!c) {
                c = new EController(name, this.node);
                getCtrlFunc(name).call(c, c);
                ctrl[name] = c;
                if (typeof c.onInit === 'function') {
                    c.onInit();
                }
            }
            return c;
        }

        return arr ? ctrlName.map(ext, this) : ext.call(this, ctrlName);
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
     * @method EController.find
     * @description
     * Searches for all initialized controlled elements among children.
     *
     * It will skip controlled elements that haven't been initialized yet.
     *
     * @param {String} selectors
     * Standard DOM selectors.
     *
     * @returns {Array<Element>}
     * Controlled initialized child elements matching the selectors.
     */
    ecp.find = function (selectors) {
        return find(selectors, this.node).filter(function (e) {
            return e.controllers;
        });
    };

    /**
     * @method EController.findOne
     * @description
     * Searches for a single matching initialized controlled element,
     * skipping uninitialized elements.
     *
     * It will throw an error, if multiple or no elements found.
     *
     * @param {String} selectors
     * Standard DOM selectors.
     *
     * @returns {Element}
     * One controlled element matching the selectors.
     */
    ecp.findOne = function (selectors) {
        var a = this.find(selectors);
        if (a.length !== 1) {
            throw new Error('A single element was expected, but found ' + a.length + '.');
        }
        return a[0];
    };

    /**
     * @method EController.findControllers
     * @description
     * Searches for all initialized child controllers by a given controller name.
     *
     * It will skip controllers that haven't been initialized yet.
     *
     * @param {String} ctrlName
     * Controller name to search by.
     *
     * @returns {Array<EController>}
     * List of found controllers.
     */
    ecp.findControllers = function (ctrlName) {

        // TODO: Should validate the name here!

        var selectors = '[e-bind*="' + ctrlName + '"]';
        return this.find(selectors).filter(pick).map(pick);

        function pick(e) {
            // This also caters for dynamically created controlled
            // elements that haven't been initialized yet:
            return e.controllers && e.controllers[ctrlName];
        }
    };

    /**
     * @method EController.send
     * @description
     * Synchronously sends data into method `onReceive`, and returns the response, if the method exists.
     * If `onReceive` handler does not exist, the method will do nothing, and return `undefined`.
     *
     * Requires that controller is initialized.
     *
     * @param {} data
     * Any type of data to be sent.
     *
     * @returns {}
     * Whatever method `onReceive` returns.
     */
    ecp.send = function (data) {
        this.reqCtrl('send');
        if (typeof this.onReceive === 'function') {
            return this.onReceive(data, this);
        }
    };

    /**
     * @method EController.post
     * @description
     * Asynchronously sends data into method `onReceive`, and if the callback was specified - calls it with the response.
     *
     * Requires that controller is initialized.
     *
     * @param {} [data]
     * Any data to be sent.
     *
     * @param {Function} [cb]
     * Optional callback to receive the response from method onReceive.
     */
    ecp.post = function (data, cb) {
        this.reqCtrl('post');
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

    /**
     * @method EController.reqCtrl
     * @private
     * @description
     * Requires controllers in a safe way: Verifies that controllers have been initialized,
     * or else throws an error.
     *
     * @param m
     * Name of the method that requires access to controllers.
     *
     * @returns {Array<EController>}
     * Controllers linked to the element.
     */
    ecp.reqCtrl = function (m) {
        var c = this.node.controllers;
        if (!c) {
            throw new Error('Method "' + m + '" cannot be used before initialization.');
        }
        return c;
    };

    initRoot();

})();
