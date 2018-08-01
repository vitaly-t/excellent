/**
 * @author Vitaly Tomilov
 */
(function () {
    'use strict';

    /**
     * Registered app controllers.
     *
     * It is a controller name-to-function map for the app's local controllers.
     */
    var controllers = {};

    /**
     * Global name-to-function cache for all controllers.
     */
    var ctrlCache = {};

    /**
     * All registered modules.
     */
    var modules = {};

    /**
     * All elements with controllers, currently in the DOM.
     */
    var elements = [];

    /**
     * Library's root object.
     *
     * @type {ERoot}
     */
    var root = new ERoot();

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
        bind();
        if (typeof root.onInit === 'function') {
            root.onInit();
        }
    });

    function checkEntity(name, cb, entity) {
        name = typeof name === 'string' ? name : '';
        var m = name.match(/[a-z$_][a-z$_0-9]*/i);
        if (!m || m[0] !== name) {
            throw new TypeError('Invalid ' + entity + ' name ' + jStr(name) + ' specified.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Initialization function for ' + entity + ' ' + jStr(name) + ' is missing.');
        }
    }

    /**
     * Validates controller name, optionally trimmed.
     *
     * @param {String} cn
     * Controller name.
     *
     * @param {Boolean} [t]
     * Trims the name before validation.
     *
     * @returns {String|undefined}
     * Valid controller name, or nothing.
     */
    function validCN(cn, t) {
        if (typeof cn === 'string') {
            cn = t ? trim(cn) : cn;
            var m = cn.match(/([a-z$_][a-z$_0-9]*\.?)*[^.]/i);
            if (m && m[0] === cn) {
                return cn;
            }
        }
    }

    /**
     * Searches for all elements that match selectors.
     *
     * @param {String} selectors
     *
     * @param {Element} [node]
     *
     * @returns {Array<Element>}
     */
    function find(selectors, node) {
        var f = (node || document).querySelectorAll(selectors);
        var res = [];
        for (var i = 0; i < f.length; i++) {
            res.push(f[i]);
        }
        return res;
    }

    /**
     * Trims a string, by removing all trailing spaces, tabs and line breaks.
     *
     * @param {String} txt
     *
     * @returns {String}
     */
    function trim(txt) {
        return txt.replace(/^[\s]*|[\s]*$/g, '');
    }

    /**
     * Creates a read-only enumerable property on an object.
     *
     * @param {Object} target
     * Target object.
     *
     * @param {String} prop
     * Property name.
     *
     * @param {} value
     * Property value.
     */
    function rop(target, prop, value) {
        Object.defineProperty(target, prop, {value: value, enumerable: true});
    }

    /**
     * Binds to controllers all elements that are not yet bound.
     *
     * @param {Element} [node]
     * Top-level node element to start searching from. When not specified,
     * the search is done for the entire document.
     */
    function bind(node) {
        binding = true;
        var allCtrl = [], els = [];
        find('[e-bind]', node)
            .forEach(function (e) {
                if (!e.controllers) {
                    var namesMap = {}, eCtrl;
                    e.getAttribute('e-bind')
                        .split(',')
                        .forEach(function (name) {
                            name = trim(name);
                            if (name) {
                                if (!validCN(name)) {
                                    throw new Error('Invalid controller name ' + jStr(name) + '.');
                                }
                                if (name in namesMap) {
                                    throw new Error('Duplicate controller name ' + jStr(name) + ' not allowed.');
                                }
                                namesMap[name] = true;
                                var c = new EController(name, e);
                                getCtrlFunc(name).call(c, c);
                                eCtrl = eCtrl || {};
                                rop(eCtrl, name, c);
                                allCtrl.push(c);
                            }
                        });
                    if (eCtrl) {
                        rop(e, 'controllers', eCtrl);
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
     * For IE9/10 that do not support MutationObserver, it executes manual check every 500ms.
     */
    function DestroyObserver() {
        var mo;
        if (typeof MutationObserver === 'undefined') {
            setInterval(manualCheck, 500); // This is a work-around for IE9 and IE10
        } else {
            mo = new MutationObserver(mutantCB);
        }

        /**
         * @member DestroyObserver.watch
         * @description
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

        function mutantCB(mutations) {
            mutations.forEach(function (m) {
                for (var i = 0; i < m.removedNodes.length; i++) {
                    var e = m.removedNodes[i];
                    if (e.controllers) {
                        var idx = elements.indexOf(e);
                        if (idx >= 0) {
                            elements.splice(idx, 1);
                            notify(e);
                        }
                    }
                }
            });
        }

        /**
         * Manual check for controlled elements that have been deleted from DOM.
         */
        function manualCheck() {
            var i = elements.length;
            if (i) {
                var ce = find('[e-bind]'); // all controlled elements;
                while (i--) {
                    var e = elements[i];
                    if (ce.indexOf(e) === -1) {
                        elements.splice(i, 1);
                        notify(e);
                    }
                }
            }
        }

        /**
         * Sends onDestroy notification into all controllers of an element.
         *
         * @param {} e
         */
        function notify(e) {
            for (var i in e.controllers) {
                var c = e.controllers[i];
                if (typeof c.onDestroy === 'function') {
                    c.onDestroy();
                }
            }
        }

    }

    /**
     * Searches for controller function, based on the controller's full name.
     * For that it uses cache of names, plus modules.
     *
     * @param {String} name
     *
     * @param {Boolean} [noError=false]
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
            // it is an in-app controller;
            var f = controllers[name]; // the function
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
     * Finds all initialized controllers from controller name.
     */
    function findCS(cn) {
        cn = validCN(cn, true);
        if (!cn) {
            throw new TypeError('Invalid controller name specified.');
        }
        var s = '[e-bind*="' + cn + '"]'; // selectors
        return this.find(s).filter(pick).map(pick);

        function pick(e) {
            // This also caters for dynamically created controlled
            // elements that haven't been initialized yet:
            return e.controllers && e.controllers[cn];
        }
    }

    /**
     * @class ERoot
     * @description
     * Root interface of the library, available via global variable `excellent`.
     *
     * @see
     * {@link ERoot#services services},
     * {@link ERoot#version version},
     * {@link ERoot#addController addController},
     * {@link ERoot#addModule addModule},
     * {@link ERoot#addService addService},
     * {@link ERoot#bind bind},
     * {@link ERoot#find find},
     * {@link ERoot#findControllers findControllers}
     */
    function ERoot() {

        /**
         * @member ERoot#version
         * @type {String}
         * @readonly
         * @description
         * Library version, automatically injected during the build process,
         * and so available only with the compressed version of the library.
         */
        rop(this, 'version', '<version>');

        /**
         * @member ERoot#services
         * @type {Object}
         * @readonly
         * @description
         * Namespace of all registered and initialized services.
         *
         * @see {@link ERoot#addService addService}
         *
         */
        rop(this, 'services', {});

        /**
         * @method ERoot#addController
         * @description
         * Adds/Registers a new controller.
         *
         * If controller with such name already exists, then the method will do the following:
         *
         *  - will throw an error, if the function is different
         *  - will do nothing, if the function is the same
         *
         * In order to avoid naming conflicts, reusable controllers should reside inside modules.
         *
         * @param {String} name
         * Controller name.
         *
         * @param {Function} cb
         * Controller function.
         */
        this.addController = function (name, cb) {
            checkEntity(name, cb, 'controller');
            if (name in controllers) {
                // controller name has been registered before
                if (controllers[name] === cb) {
                    // it is the same controller, so we can just ignore it;
                    return;
                }
                throw new Error('Controller with name ' + jStr(name) + ' already exists.');
            }
            controllers[name] = cb;
        };

        /**
         * @method ERoot#addService
         * @description
         * Adds and initializes a new service.
         *
         * If the service with such name already exists, the method will do nothing,
         * because it cannot determine whether the actual service behind the name is the same,
         * while services need to be fully reusable, even in dynamically loaded pages.
         *
         * Every added service becomes accessible via property {@link ERoot#services services}.
         *
         * @param {String} name
         * Service name.
         *
         * @param {Function} cb
         * Service initialization function.
         */
        this.addService = function (name, cb) {
            checkEntity(name, cb, 'service');
            if (!(name in root.services)) {
                var s = {}; // service's scope
                rop(root.services, name, s);
                cb.call(s, s);
            }
        };

        /**
         * @method ERoot#addModule
         * @description
         * Adds and initializes a new module.
         *
         * If the module with such name already exists, the method will do nothing,
         * because it cannot determine whether the actual module behind the name is the same,
         * while modules need to be fully reusable, even in dynamically loaded pages.
         *
         * @param {String} name
         * Module name.
         *
         * @param {Function} cb
         * Module initialization function.
         */
        this.addModule = function (name, cb) {
            checkEntity(name, cb, 'module');
            if (!(name in modules)) {
                var s = {}; // module's scope
                modules[name] = s;
                cb.call(s, s);
            }
        };

        /**
         * @method ERoot#bind
         * @description
         * Searches for all elements in the document not yet bound, and binds them to controllers.
         *
         * Normally, a controller creates new controlled elements within its children, and then
         * uses ctrl.bind() method. It is only if you create a new controlled element that's not
         * a child element that you would use this global bind method.
         *
         * And if you call it while in the process of binding, the call will be delayed, which is
         * the scenario best to be avoided.
         */
        this.bind = function () {
            if (binding) {
                // Called during construction or initialization, so need to delay the call, to avoid recursion.
                // This usually doesn't happen, unless there is a flaw in how your app is implemented.
                setTimeout(bind);
            } else {
                bind();
            }
        };

        /**
         * @method ERoot#find
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
         * @method ERoot#findControllers
         * @description
         * Searches the entire document for all initialized controllers by a given controller name.
         *
         * @param {String} ctrlName
         * Controller name to search by.
         *
         * @returns {Array<EController>}
         * List of found initialized controllers.
         */
        this.findControllers = findCS.bind(this);
    }

    /**
     * @event ERoot.onInit
     * @description
     * Called once in the beginning, after all controllers have been initialized.
     *
     * @see {@link EController.event:onInit EController.onInit}
     *
     * @type {Function|null}
     */

    /**
     * @class EController
     * @description
     * Controller class, automatically associated with a DOM element, internally by the library,
     * for every controller name listed within `e-bind` attribute.
     *
     * @see
     * {@link EController#name name},
     * {@link EController#node node},
     * {@link EController#bind bind},
     * {@link EController#depends depends},
     * {@link EController#extend extend},
     * {@link EController#find find},
     * {@link EController#findOne findOne},
     * {@link EController#findControllers findControllers},
     * {@link EController#send send},
     * {@link EController#post post}
     *
     * @param {String} name
     * Controller name.
     *
     * @param {Element} node
     * DOM element, associated with the controller.
     */
    function EController(name, node) {

        /**
         * @member EController#name
         * @type {String}
         * @readonly
         * @description
         * Full controller name.
         */
        rop(this, 'name', name);

        /**
         * @member EController#node
         * @type {Element}
         * @readonly
         * @description
         * Source DOM element that uses this controller.
         *
         * NOTE: In the current implementation, the element is static (not live).
         */
        rop(this, 'node', node);
    }

    /**
     * @event EController.onInit
     * @description
     * Initialization event handler.
     *
     * It is called after all controllers have finished their initialization,
     * and now ready to communicate with each other.
     *
     * @see
     * {@link EController.event:onDestroy onDestroy},
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    /**
     * @event EController.onDestroy
     * @description
     * De-initialization event handler.
     *
     * It signals the controller that its element has been removed from the DOM,
     * and it is time to release any pre-allocated resources, if necessary.
     *
     * For any modern browser, the event is triggered automatically, courtesy of `MutationObserver`,
     * while for older browsers, such as IE9 and IE10 it falls back on a manual background check
     * that runs every 500ms.
     *
     * @see
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    var ecp = EController.prototype; // abbreviation

    /**
     * @method EController#bind
     * @description
     * Indicates that the element's content has been modified to contain new child controlled elements,
     * and that it is time to bind those elements and initialize its controllers.
     *
     * This method requires that its controller has been initialized.
     */
    ecp.bind = function () {
        this.reqCtrl('bind');
        bind(this.node);
    };

    /**
     * @method EController#extend
     * @description
     * Extends other controller(s) with new functionality, thus providing functional inheritance.
     *
     * This method requires that its controller has been initialized.
     *
     * @param {String|String[]} ctrlName
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
            var cn = validCN(name, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(name) + ' specified.');
            }
            var c = this.node.controllers[cn];
            if (!c) {
                c = new EController(cn, this.node);
                getCtrlFunc(cn).call(c, c);
                rop(ctrl, cn, c);
                if (typeof c.onInit === 'function') {
                    c.onInit();
                }
            }
            return c;
        }

        return arr ? ctrlName.map(ext, this) : ext.call(this, ctrlName);
    };

    /**
     * @method EController#depends
     * @description
     * Verifies that each controller in the list of dependencies exists, or else throws an error.
     *
     * This optional level of verification is useful when sub-controllers are rarely used, or loaded
     * dynamically. Such explicit verification simply makes the code more robust.
     *
     * @param {Array<String>} ctrlNames
     * List of controller names.
     *
     * You would specify all controller names that this controller may be extending via method {@link EController#extend extend},
     * plus any others that your controller may generate dynamically.
     */
    ecp.depends = function (ctrlNames) {
        if (!Array.isArray(ctrlNames)) {
            throw new TypeError('Invalid list of controller names.');
        }
        ctrlNames.forEach(function (name) {
            // TODO: Need to validate the name, or else it may crash here
            if (!getCtrlFunc(name, true)) {
                throw new Error('Controller ' + jStr(name) + ' depends on ' + jStr(this.name) + ', which was not found.');
            }
        }, this);
    };

    /**
     * @method EController#find
     * @description
     * Searches for all initialized controlled elements among children.
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
     * @method EController#findOne
     * @description
     * Searches for a single matching initialized controlled element.
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
     * @method EController#findControllers
     * @description
     * Searches for all initialized child controllers by a given controller name.
     *
     * @param {String} ctrlName
     * Controller name to search by.
     *
     * @returns {Array<EController>}
     * List of found initialized controllers.
     */
    ecp.findControllers = function (ctrlName) {
        return findCS.call(this, ctrlName);
    };

    /**
     * @method EController#send
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
     * @method EController#post
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
     * @method EController#reqCtrl
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

    /**
     * Initializes the optional e-root.
     */
    (function () {
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
    })();

})();
