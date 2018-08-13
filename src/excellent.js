/*
 * Copyright (c) 2018-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

(function () {
    'use strict';

    /**
     * Registered app controllers.
     *
     * It is a controller name-to-function map for the app's local controllers.
     *
     * @type {Object.<string, Function>}
     */
    var ctrlRegistered = {};

    /**
     * Live global controllers (initialized, but not destroyed), with each property -
     * controller name set to an array of controller objects.
     *
     * @type {Object.<string, EController[]>}
     */
    var ctrlGlobal = {};

    /**
     * Live local controllers (initialized, but not destroyed), with each property -
     * controller name set to an array of controller objects.
     *
     * @type {Object.<string, EController[]>}
     */
    var ctrlLocal = {};

    /**
     * Global name-to-function cache for all controllers.
     *
     * @type {Object.<string, Function>}
     */
    var ctrlCache = {};

    /**
     * All registered modules.
     *
     * @type {Object.<string, {$about}>}
     */
    var modules = {};

    /**
     * All elements with controllers, currently in the DOM.
     *
     * @type {HTMLElement[]}
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
     * Validates controller name, optionally trimmed.
     *
     * @param {string} cn
     * Controller name.
     *
     * @param {boolean} [t]
     * Trims the name before validation.
     *
     * @returns {string|undefined}
     * Valid controller name, or nothing.
     */
    function validateControllerName(cn, t) {
        if (typeof cn === 'string') {
            cn = t ? trim(cn) : cn;
            var m = cn.match(/^[a-z$_][$\w]*(\.[a-z$_][$\w]*)*$/i);
            if (m && m[0] === cn) {
                return cn;
            }
        }
    }

    /**
     * Validates a string to be a proper JavaScript open name.
     *
     * @param {string} name
     * @returns {boolean}
     */
    function validJsVariable(name) {
        var m = name.match(/[a-z$_][a-z$_0-9]*/i);
        return m && m[0] === name;
    }

    /**
     * Validates an entity being registered.
     *
     * The entity must use JavaScript open-name syntax.
     *
     * @param {string} name
     * Name of the entity.
     *
     * @param {function} cb
     * Callback function.
     *
     * @param {string} entity
     * Entity name.
     */
    function validateEntity(name, cb, entity) {
        name = typeof name === 'string' ? name : '';
        if (!validJsVariable(name)) {
            throw new TypeError('Invalid ' + entity + ' name ' + jStr(name) + ' specified.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Initialization function for ' + entity + ' ' + jStr(name) + ' is missing.');
        }
    }

    /**
     * Wraps a value to be friendly within error messages.
     *
     * @param {} value
     * @returns {string}
     */
    function jStr(value) {
        var t = typeof value;
        if (t === 'undefined' || t === 'boolean' || t === 'number' || value === null) {
            return '<' + value + '>';
        }
        if (t === 'function') {
            return '<' + value.toString() + '>';
        }
        return JSON.stringify(value);
    }

    /**
     * Retrieves full start tag from a DOM element.
     *
     * @param {HTMLElement} element
     *
     * @returns {string}
     * Full start tag string.
     */
    function startTag(element) {
        var h = element.outerHTML;
        return h.substring(0, h.indexOf('>') + 1);
    }

    /**
     * Searches for all elements that match selectors, and optionally - within a parent node.
     *
     * @param {string} selectors
     * Standard selectors.
     *
     * @param {HTMLElement} [node]
     * Parent node to search for children.
     *
     * @returns {HTMLElement[] | ControlledElement[]}
     */
    function findAll(selectors, node) {
        var f = (node || document).querySelectorAll(selectors);
        var l = f.length, arr = new Array(l);
        while (l--) {
            arr[l] = f[l];
        }
        return arr;
    }

    /**
     * Gets the primary attribute's value, if the attribute exists,
     * or else it gets the secondary attribute's value.
     *
     * @param {HTMLElement} e
     * Element to get the value from.
     *
     * @param {string} primary
     * Primary attribute name.
     *
     * @param {string} secondary
     * Secondary attribute name.
     *
     * @returns {string}
     * The attribute's value.
     */
    function getAttribute(e, primary, secondary) {
        if (e.hasAttribute(primary)) {
            return e.getAttribute(primary);
        }
        return e.getAttribute(secondary);
    }

    /**
     * Trims a string, by removing all trailing spaces, tabs and line breaks.
     *
     * @param {string} txt
     * Input string.
     *
     * @returns {string}
     * The resulting string.
     *
     */
    function trim(txt) {
        return txt.replace(/^[\s]*|[\s]*$/g, '');
    }

    /**
     * Creates a read-only enumerable property on an object.
     *
     * @param {object} target
     * Target object.
     *
     * @param {string} prop
     * Property name.
     *
     * @param {} value
     * Property value.
     */
    function readOnlyProp(target, prop, value) {
        Object.defineProperty(target, prop, {value: value, enumerable: true});
    }

    /**
     * Binding Status.
     *
     * It helps with smart asynchronous bindings management, to help executing only
     * the necessary minimum of bindings, based on the current flow of requests.
     *
     * @type {{nodes: Array, cb: Array, waiting: boolean, glob: boolean}}
     */
    var bs = {
        nodes: [], // local elements
        cb: [], // all callbacks
        waiting: false, // timer is currently waiting
        glob: false // global async is being processed
    };

    /**
     * General binding processor.
     *
     * It implements the logic of bindings reduced to the absolute minimum DOM usage.
     *
     * @param {HTMLElement} [node]
     * Element to start processing from.
     *
     * @param {boolean|function} process
     * Determines how to process the binding:
     * - _any falsy value (default):_ the binding will be done asynchronously;
     * - _a function:_ binding is asynchronous, calling the function when finished;
     * - _any truthy value, except a function type:_ forces synchronous binding.
     */
    function bindElement(node, process) {
        var cb = typeof process === 'function' && process;
        if (process && !cb) {
            // synchronous binding;
            if (bs.waiting) {
                // timer is now waiting
                if (node) {
                    // Cancel asynchronous binding on the same node:
                    var idx = bs.nodes.indexOf(node);
                    if (idx >= 0) {
                        bs.nodes.splice(idx, 1);
                    }
                } else {
                    // A global synchronous binding cancels everything for
                    // asynchronous processing, except callback notifications:
                    bs.waiting = false;
                    bs.glob = false;
                    bs.nodes.length = 0;
                }
            }
            bind(node);
        } else {
            // asynchronous binding;
            if (node) {
                // local binding, append the request, if unique:
                if (bs.nodes.indexOf(node) === -1) {
                    bs.nodes.push(node);
                }
            } else {
                // global binding, cancels local bindings:
                bs.glob = true;
                bs.nodes.length = 0;
            }
            if (cb) {
                // callback notifications:
                bs.cb.push(cb);
            }
            if (bs.waiting) {
                return;
            }
            bs.waiting = true;
            setTimeout(function () {
                var nodes = bs.nodes.slice();
                var cbs = bs.cb.slice();
                bs.nodes.length = 0;
                bs.cb.length = 0;
                if (bs.waiting) {
                    bs.waiting = false;
                    if (bs.glob) {
                        bs.glob = false;
                        bind(null);
                    } else {
                        nodes.forEach(bind);
                    }
                }
                cbs.forEach(function (f) {
                    f();
                });
            });
        }
    }

    /**
     * Registers the live controller in the global list, so it can be found globally.
     *
     * @param {string} name
     * Controller name.
     *
     * @param {EController} c
     * Controller object.
     *
     * @param {boolean} [local=false]
     * Local-controller flag.
     */
    function addLiveCtrl(name, c, local) {
        var dest = local ? ctrlLocal : ctrlGlobal;
        dest[name] = dest[name] || [];
        dest[name].push(c);
    }

    /**
     * Binds to controllers all elements that are not yet bound.
     *
     * @param {HTMLElement} [node]
     * Top-level node element to start searching from. When not specified,
     * the search is done for the entire document.
     */
    function bind(node) {
        var allCtrl = [], els = [];
        findAll('[data-e-bind],[e-bind]', node)
            .forEach(function (e) {
                if (!e.controllers) {
                    var namesMap = {}, eCtrl;
                    getAttribute(e, 'data-e-bind', 'e-bind')
                        .split(',')
                        .forEach(function (name) {
                            name = trim(name);
                            if (name) {
                                if (!validateControllerName(name)) {
                                    throw new Error('Invalid controller name ' + jStr(name) + ': ' + startTag(e));
                                }
                                if (name in namesMap) {
                                    throw new Error('Duplicate controller name ' + jStr(name) + ' not allowed: ' + startTag(e));
                                }
                                namesMap[name] = true;
                                var c = new EController(name, e);
                                getCtrlFunc(name, e).call(c, c);
                                eCtrl = eCtrl || {};
                                readOnlyProp(eCtrl, name, c);
                                allCtrl.push(c);
                                addLiveCtrl(name, c);
                            }
                        });
                    if (eCtrl) {
                        readOnlyProp(e, 'controllers', eCtrl);
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
        allCtrl.forEach(function (c) {
            if (typeof c.onPostInit === 'function') {
                c.onPostInit();
            }
        });
    }

    /**
     * @constructor
     * @private
     * @description
     * Helps watching node elements removal from DOM, in order to provide {@link EController.event:onDestroy onDestroy}
     * notification for all corresponding controllers.
     *
     * For IE9/10 that do not support `MutationObserver`, it executes a manual check once a second.
     */
    function DestroyObserver() {
        var mo;
        // MutationObserver does not exist in JEST:
        // istanbul ignore else
        if (typeof MutationObserver === 'undefined') {
            // istanbul ignore else
            if (typeof window !== 'undefined' && window) {
                // We do not create any timer when inside Node.js
                setInterval(manualCheck, 1000); // This is a work-around for IE9 and IE10
            }
        } else {
            mo = new MutationObserver(mutantCB);
        }

        /**
         * @member DestroyObserver.watch
         * @description
         * Initiates watching the element.
         *
         * @param {HTMLElement} e
         * Element to be watched.
         */
        this.watch = function (e) {
            // MutationObserver does not exist in JEST:
            // istanbul ignore if
            if (mo) {
                mo.observe(e, {childList: true});
            }
        };

        // MutationObserver does not exist in JEST:
        // istanbul ignore next
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
                        removeControllers(e);
                    }
                }
            });
        }

        /**
         * Removes all controllers from ctrlGlobal, as per the element.
         *
         * @param {ControlledElement} e
         */
        function removeControllers(e) {
            for (var a in e.controllers) {
                remove(a, ctrlGlobal);
                remove(a, ctrlLocal);
            }

            function remove(name, dest) {
                var c = dest[name];
                if (c) {
                    var i = dest[name].indexOf(e.controllers[name]);
                    dest[name].splice(i, 1);
                    if (!dest[name].length) {
                        delete dest[name];
                    }
                }
            }
        }


        /**
         * Manual check for controlled elements that have been deleted from DOM.
         */
        function manualCheck() {
            var i = elements.length;
            if (i) {
                var ce = findAll('[data-e-bind],[e-bind]'); // all controlled elements;
                while (i--) {
                    var e = elements[i];
                    if (ce.indexOf(e) === -1) {
                        elements.splice(i, 1);
                        notify(e);
                        removeControllers(e);
                    }
                }
            }
        }

        /**
         * Sends onDestroy notification into all controllers of an element.
         *
         * @param {ControlledElement} e
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
     * @interface ControlledElement
     * @extends external:HTMLElement
     * @description
     * Represents a standard DOM element, extended with read-only property `controllers`.
     *
     * This type is provided by the library automatically, after binding elements to controllers.
     *
     * @see
     * {@link ERoot#bind ERoot.bind},
     * {@link EController#bind EController.bind}
     */

    /**
     * @member {Object.<string, EController>} ControlledElement#controllers
     * @readonly
     * @description
     * An object - map, with each property (controller name) of type {@link EController}.
     * And each property in the object is read-only.
     *
     * This property is available only after the controller has been initialized.
     *
     * For example, if you have a binding like this:
     *
     * ```html
     * <div e-bind="homeCtrl, view.main"></div>
     * ```
     *
     * Then you can access those controllers like this:
     *
     * ```js
     * app.addController('homeCtrl', function(ctrl) {
     *
     *     // During the controller's construction,
     *     // this.node.controllers is undefined.
     *
     *     this.onInit = function() {
     *         var ctrl1 = this.node.controllers.homeCtrl;
     *         // ctrl1 = ctrl = this
     *
     *         var ctrl2 = this.node.controllers['view.main'];
     *     };
     * });
     * ```
     */

    /**
     * Searches for a controller function, based on the controller's full name.
     * For that it uses the cache of names, plus modules.
     *
     * @param {string} name
     * Controller name to be resolved.
     *
     * @param {HTMLElement} [e]
     * Element available as the context.
     *
     * @param {boolean} [noError=false]
     * Tells it not to throw on errors, and rather return null.
     *
     * @returns {function|undefined}
     * Either controller function or throws. But if noError is true,
     * and no controller found, it returns `undefined`.
     *
     */
    function getCtrlFunc(name, e, noError) {
        if (name in ctrlCache) {
            return ctrlCache[name]; // use the cache
        }
        if (name.indexOf('.') === -1) {
            // it is an in-app controller;
            var f = ctrlRegistered[name]; // the function
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
                throw new Error('Module ' + jStr(moduleName) + ' not found' + (e ? ': ' + startTag(e) : '.'));
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
            throw new Error('Controller ' + jStr(name) + ' not found' + (e ? ': ' + startTag(e) : '.'));
        }
    }

    /**
     * Parses a controller name, while allowing for trailing spaces.
     *
     * @param {string} cn
     * Controller name.
     *
     * @returns {string}
     * Validated controller name (without trailing spaces).
     */
    function parseControllerName(cn) {
        var name = validateControllerName(cn, true);
        if (!name) {
            throw new TypeError('Invalid controller name ' + jStr(cn) + ' specified.');
        }
        return name;
    }

    /**
     * @interface ERoot
     * @description
     * Root interface of the library, available via global variable `excellent`.
     *
     * You can make this interface also available via an alias name that can be set via
     * attribute `e-root` or `data-e-root` on the `HTML` element:
     *
     * ```html
     * <HTML e-root="app">
     * ```
     *
     * @see
     * {@link ERoot#analyze analyze},
     * {@link ERoot#services services},
     * {@link ERoot#version version},
     * {@link ERoot#addController addController},
     * {@link ERoot#addModule addModule},
     * {@link ERoot#addService addService},
     * {@link ERoot#bind bind},
     * {@link ERoot#find find},
     * {@link ERoot#findOne findOne},
     * {@link ERoot.event:onInit onInit}
     */
    function ERoot() {

        /**
         * @member ERoot#version
         * @type {string}
         * @readonly
         * @description
         * Library version, automatically injected during the build/compression process, and so available
         * only with the compressed version of the library. But you should be using `excellent.min.js` always,
         * because the library is distributed with the source maps.
         */
        readOnlyProp(this, 'version', '<version>');

        /**
         * @member ERoot#services
         * @type {Object.<string, {$about}>}
         * @readonly
         * @description
         * Namespace of all registered and initialized services.
         *
         * @see {@link ERoot#addService addService}
         *
         */
        readOnlyProp(this, 'services', {});

        /**
         * @method ERoot#addController
         * @description
         * Adds/Registers a new controller.
         *
         * If controller with such name already exists, then the method will do the following:
         *
         *  - throw an error, if the function is different
         *  - nothing, if the function is the same
         *
         * In order to avoid naming conflicts, reusable controllers should reside inside modules.
         *
         * @param {string} name
         * Controller name. Must adhere to JavaScript open-name syntax.
         *
         * @param {function} cb
         * Controller function.
         */
        this.addController = function (name, cb) {
            validateEntity(name, cb, 'controller');
            if (name in ctrlRegistered) {
                // controller name has been registered before
                if (ctrlRegistered[name] === cb) {
                    // it is the same controller, so we can just ignore it;
                    return;
                }
                throw new Error('Controller with name ' + jStr(name) + ' already exists.');
            }
            ctrlRegistered[name] = cb;
        };

        /**
         * @method ERoot#addService
         * @description
         * Adds and initializes a new service.
         *
         * If the service with such name already exists, the method will do nothing, because it cannot determine
         * whether the actual service behind the name is the same, while services need to be fully reusable,
         * like in dynamically loaded pages.
         *
         * @param {string} name
         * Service name. Must adhere to JavaScript open-name syntax.
         *
         * @param {function} cb
         * Service initialization function. The function will be passed the service's scope as a single parameter
         * and as `this` context, and it is expected to initialize the service as required.
         *
         * If the service creates property-object `$about` on its scope, the value will be reported by method
         * {@link ERoot#analyze analyze}.
         */
        this.addService = function (name, cb) {
            validateEntity(name, cb, 'service');
            if (!(name in root.services)) {
                var scope = {};
                readOnlyProp(root.services, name, scope);
                cb.call(scope, scope);
            }
        };

        /**
         * @method ERoot#addModule
         * @description
         * Adds and initializes a new module.
         *
         * If the module with such name already exists, the method will do nothing, because it cannot determine
         * whether the actual module behind the name is the same, while modules need to be fully reusable,
         * like in dynamically loaded pages.
         *
         * @param {string} name
         * Module name. Must adhere to JavaScript open-name syntax.
         *
         * @param {function} cb
         * Module initialization function. The function will be passed the module's scope as a single parameter
         * and as `this` context, and it is expected to initialize the module as required.
         *
         * If the module creates property-object `$about` on its scope, the value will be reported by method
         * {@link ERoot#analyze analyze}.
         */
        this.addModule = function (name, cb) {
            validateEntity(name, cb, 'module');
            if (!(name in modules)) {
                var scope = {};
                modules[name] = scope;
                cb.call(scope, scope);
            }
        };

        /**
         * @method ERoot#bind
         * @description
         * Searches for all elements in the document not yet bound, and binds them to controllers.
         *
         * Normally, a controller creates new controlled elements within its children, and then uses
         * {@link EController#bind EController.bind} method. It is only when you create a new controlled
         * element that's not a child element, then you would use this global binding.
         *
         * You should try to avoid use of synchronous bindings, as they are hardly ever necessary,
         * while affecting performance of the application. The binding engine implements the logic
         * of minimizing the number of checks against the DOM, but it works best when requests are asynchronous.
         *
         * @param {boolean|function} [process=false]
         * Determines how to process the binding:
         * - _any falsy value (default):_ the binding will be done asynchronously;
         * - _a function:_ binding is asynchronous, calling the function when finished;
         * - _any truthy value, except a function type:_ forces synchronous binding.
         */
        this.bind = function (process) {
            bindElement(null, process);
        };

        /**
         * @method ERoot#find
         * @description
         * Searches for all initialized controllers in the entire application, based on the controller name,
         * including the extended controllers.
         *
         * The search is based solely on the internal map of controllers, without involving DOM, and provides instant results.
         * Because of this, it will always significantly outperform method {@link EController#find EController.find},
         * even though the latter searches only among child elements, but it uses DOM.
         *
         * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit EController.onInit},
         * and implicitly created controllers (extended via method {@link EController#extend EController.extend}), if called during or after event
         * {@link EController.event:onPostInit EController.onPostInit}. And it will find everything, if called during or after global event
         * {@link ERoot.event:onInit ERoot.onInit}.
         *
         * @param {string} ctrlName
         * Controller name to search by. It must adhere to JavaScript open-name syntax.
         *
         * @returns {EController[]}
         * List of found initialized controllers.
         */
        this.find = function (ctrlName) {
            var cn = parseControllerName(ctrlName);
            if (cn in ctrlGlobal) {
                return ctrlGlobal[cn].slice();
            }
            return [];
        };

        /**
         * @method ERoot#findOne
         * @description
         * Searches for a single initialized controller, in the entire application, based on the controller name.
         *
         * The method will throw an error, if multiple or no controllers found.
         *
         * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit EController.onInit},
         * and implicitly created controllers (extended via method {@link EController#extend EController.extend}), if called during or after event
         * {@link EController.event:onPostInit EController.onPostInit}. And it will find everything, if called during or after global event
         * {@link ERoot.event:onInit ERoot.onInit}.
         *
         * @param {string} ctrlName
         * Controller name to search by. It must adhere to JavaScript open-name syntax.
         *
         * @returns {EController}
         * A single controller with the matching name.
         */
        this.findOne = function (ctrlName) {
            var a = this.find(ctrlName);
            if (a.length !== 1) {
                throw new Error('Expected a single controller from findOne(' + jStr(ctrlName) + '), but found ' + a.length + '.');
            }
            return a[0];
        };

        /**
         * @method ERoot#analyze
         * @description
         * Pulls together and returns statistics / snapshot of the current state of the library.
         *
         * This method is to help with debugging your application, and for automatic tests.
         *
         * @returns {EStatistics}
         * Statistics Data.
         */
        this.analyze = function () {
            var res = {
                binding: {
                    locals: bs.nodes.length,
                    callbacks: bs.cb.length,
                    waiting: bs.waiting,
                    global: bs.glob
                },
                controllers: {
                    global: {},
                    local: {},
                    registered: Object.keys(ctrlRegistered)
                },
                elements: elements.slice(),
                modules: {},
                services: {}
            };
            for (var a in ctrlGlobal) {
                res.controllers.global[a] = ctrlGlobal[a].length;
            }
            for (var b in ctrlLocal) {
                res.controllers.local[b] = ctrlLocal[b].length;
            }
            for (var m in modules) {
                var ma = modules[m].$about;
                res.modules[m] = (ma && typeof ma === 'object') ? ma : null;
            }
            for (var s in root.services) {
                var sa = root.services[s].$about;
                res.services[s] = (sa && typeof sa === 'object') ? sa : null;
            }
            return res;
        };
    }

    /**
     * @interface EStatistics
     * @description
     * Statistics / Diagnostics data, as returned by method {@link ERoot#analyze ERoot.analyze}.
     *
     * @property {} binding
     * Element-to-controller binding status.
     *
     * @property {number} binding.locals
     * Number of pending child-binding requests, from {@link EController#bind EController.bind}.
     *
     * @property {number} binding.callbacks
     * Number of pending recipients awaiting a notification when the requested binding is finished.
     *
     * @property {boolean} binding.waiting
     * Binding engine has triggered a timer for the next asynchronous update, and is now waiting for it.
     *
     * @property {boolean} binding.global
     * A global asynchronous request is being processed.
     *
     * @property {} controllers
     * Details about controllers.
     *
     * @property {Object.<string, number>} controllers.global
     * All global live controllers, visible to global search methods {@link ERoot#find ERoot.find} and {@link ERoot#findOne ERoot.findOne}.
     * Each name is set to a total number of such controllers.
     *
     * @property {Object.<string, number>} controllers.local
     * All local live controllers (created via {@link EController#extend EController.extend} with `local` = `true`),
     * and thus not visible to global search methods {@link ERoot#find ERoot.find} and {@link ERoot#findOne ERoot.findOne}.
     * Each name is set to a total number of such controllers.
     *
     * @property {string[]} controllers.registered
     * Names of all registered controllers.
     *
     * @property {ControlledElement[]} elements
     * List of all controlled elements currently in the DOM.
     *
     * @property {Object.<string, {}>} modules
     * All registered modules, with each name set to the value of property `$about` on the module's scope,
     * if the value is an object, or `null` otherwise.
     *
     * @property {Object.<string, {}>} services
     * All registered services, with each name set to the value of property `$about` on the service's scope,
     * if the value is an object, or `null` otherwise.
     *
     * */

    /**
     * @event ERoot.onInit
     * @type {function}
     * @description
     * Called once in the beginning, after all controllers in the app have been fully initialized.
     *
     * It represents the state of the application when it is ready to find all controllers
     * and communicate with them. This includes controllers created through extension, i.e.
     * all controllers have finished processing {@link EController.event:onPostInit onPostInit}
     * event at this point.
     *
     * @see
     * {@link EController.event:onInit EController.onInit},
     * {@link EController.event:onPostInit EController.onPostInit}
     *
     * @example
     *
     * app.onInit = function() {
     *   // All explicit and extended controllers now can be located;
     *
     *   // Let's find our main app controller, and ask it do something:
     *   app.findOne('appCtrl').doSomething();
     * };
     */

    /**
     * @interface EController
     * @description
     * Controller interface, attached to each controlled element in the DOM. Such elements
     * adhere to type {@link ControlledElement}.
     *
     * @see
     * {@link EController#name name},
     * {@link EController#node node},
     * {@link EController#bind bind},
     * {@link EController#depends depends},
     * {@link EController#extend extend},
     * {@link EController#find find},
     * {@link EController#findOne findOne},
     * {@link EController.event:onInit onInit},
     * {@link EController.event:onPostInit onPostInit},
     * {@link EController.event:onDestroy onDestroy}
     *
     * @param {string} name
     * Controller name.
     *
     * @param {ControlledElement} node
     * DOM element, associated with the controller.
     */
    function EController(name, node) {

        /**
         * @member EController#name
         * @type {string}
         * @readonly
         * @description
         * Full name of the controller.
         */
        readOnlyProp(this, 'name', name);

        /**
         * @member EController#node
         * @type {ControlledElement}
         * @readonly
         * @description
         * Source DOM element bound to this controller.
         */
        readOnlyProp(this, 'node', node);
    }

    /**
     * @event EController.onInit
     * @type {function}
     * @description
     * Initialization event handler.
     *
     * It represents the state of the controller when it is ready to do the following:
     *  - find explicitly bound controllers and communicate with them
     *  - extend other controllers (via method {@link EController#extend extend})
     *
     * At this point you cannot locate or communicate with controllers that are being extended
     * (via method {@link EController#extend extend}). For that you need to use {@link EController.event:onPostInit onPostInit} event.
     *
     * @see
     * {@link EController.event:onPostInit onPostInit},
     * {@link EController.event:onDestroy onDestroy},
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    /**
     * @event EController.onPostInit
     * @type {function}
     * @description
     * Post-initialization event handler.
     *
     * It represents the state of the controller when it is able to find and communicate
     * with controllers that were created during initialization through extension (via method {@link EController#extend extend}).
     *
     * Controllers can only be extended during initialization (see method {@link EController#extend extend}),
     * and so the controllers being extended are initialized right after. If you need to locate and communicate
     * with such extended controllers, it is only possible during or after this post-initialization event.
     *
     * @see
     * {@link EController.event:onInit onInit},
     * {@link EController.event:onDestroy onDestroy},
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    /**
     * @event EController.onDestroy
     * @type {function}
     * @description
     * De-initialization event handler.
     *
     * It signals the controller that its element has been removed from the DOM,
     * and it is time to release any pre-allocated resources, if necessary.
     *
     * For any modern browser, the event is triggered automatically, courtesy of `MutationObserver`,
     * while for older browsers, such as IE9 and IE10 it falls back on a manual background check
     * that runs once a second.
     *
     * @see
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    /**
     * @method EController#bind
     * @description
     * Signals the framework that the element's content has been modified to contain new child controlled
     * elements, and that it is time to bind those elements with the corresponding controllers.
     *
     * This method requires that the calling controller has been initialized.
     *
     * You should try to avoid use of synchronous bindings, as they are hardly ever necessary, while affecting
     * performance of the application. The binding engine implements the logic of minimizing the number of checks
     * against the DOM, but it works best when requests are asynchronous.
     *
     * @param {boolean|function} [process=false]
     * Determines how to process the binding:
     * - _any falsy value (default):_ the binding will be done asynchronously;
     * - _a function:_ binding is asynchronous, calling the function when finished;
     * - _any truthy value, except a function type:_ forces synchronous binding.
     */
    EController.prototype.bind = function (process) {
        this.verifyInit('bind');
        bindElement(this.node, process);
    };

    /**
     * @method EController#extend
     * @description
     * Extends other controller(s) with new functionality, thus providing functional inheritance.
     *
     * It creates and returns a new controller(s), according to the parameters. But if you specify a controller
     * name that's already bound to the element, that controller is returned instead, to be reused, because
     * only a single controller type can be bound to any given element.
     *
     * This method can only be called during event {@link EController.event:onInit onInit}.
     *
     * Note that while the calling controller has immediate access to extended controllers, as they are returned
     * by the method, other controllers can communicate with them only during or after event
     * {@link EController.event:onPostInit onPostInit}.
     *
     * @param {string|string[]} ctrlName
     * Either a single controller name, or an array of names.
     * Names must adhere to JavaScript open-name syntax.
     *
     * @param {boolean} [local=false]
     * When `true`, newly created controllers are not registered in the global map,
     * so global search methods {@link ERoot#find ERoot.find} and {@link ERoot#findOne ERoot.findOne}
     * would not find them. This offers a level of encapsulation / privacy, in case access to such
     * extended controllers by an outside controller is undesirable.
     *
     * Note that if the element already has the controller, it is reused, and flag `local` is then ignored.
     *
     * @returns {EController|EController[]}
     * - if you pass in a single controller name, it returns a single controller.
     * - if you pass in an array of names, it returns an array of controllers.
     *
     * @example
     *
     * app.addController('myController', function(ctrl) {
     *     // Optional early dependency diagnostics:
     *     ctrl.depends(['dragDrop', 'removable']);
     *
     *     ctrl.onInit = function() {
     *         var c = ctrl.extend(['dragDrop', 'removable']);
     *
     *         // c[0] = ctrl.node.controllers.dragDrop
     *         // c[1] = ctrl.node.controllers.removable
     *     };
     * });
     */
    EController.prototype.extend = function (ctrlName, local) {
        var ctrl = this.verifyInit('extend');
        var created = [];

        function ext(name) {
            var cn = validateControllerName(name, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(name) + ' specified.');
            }
            var c = this.node.controllers[cn];
            if (!c) {
                c = new EController(cn, this.node);
                getCtrlFunc(cn).call(c, c);
                readOnlyProp(ctrl, cn, c);
                addLiveCtrl(cn, c, local);
                created.push(c);
            }
            return c;
        }

        var result = Array.isArray(ctrlName) ? ctrlName.map(ext, this) : ext.call(this, ctrlName);

        created.forEach(function (c) {
            if (typeof c.onInit === 'function') {
                c.onInit();
            }
        });

        created.forEach(function (c) {
            if (typeof c.onPostInit === 'function') {
                c.onPostInit();
            }
        });

        return result;
    };

    /**
     * @method EController#depends
     * @description
     * Verifies that each controller in the list of dependencies exists, or else throws an error.
     * It is normally used during the controller's construction.
     *
     * This optional level of verification is mainly useful when using dynamically injected controllers
     * (not just the ones through method {@link EController#extend extend}), as it is best to verify such
     * dependencies before trying to use them.
     *
     * Note however, that this method may not see controllers registered dynamically.
     *
     * @param {string[]} ctrlNames
     * List of controller names. It should include all controller names that are due to be extended
     * (via method {@link EController#extend extend}), plus the ones that can be requested dynamically.
     *
     * Controller names must adhere to JavaScript open-name syntax.
     *
     * @see {@link EController#extend extend}
     */
    EController.prototype.depends = function (ctrlNames) {
        if (!Array.isArray(ctrlNames)) {
            throw new TypeError('Invalid list of controller names.');
        }
        ctrlNames.forEach(function (name) {
            var cn = validateControllerName(name, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(name) + ' specified.');
            }
            if (!getCtrlFunc(cn, null, true)) {
                throw new Error('Controller ' + jStr(this.name) + ' depends on ' + jStr(cn) + ', which was not found.');
            }
        }, this);
    };

    /**
     * @method EController#findOne
     * @description
     * Searches for a single initialized child controller by a given controller name.
     *
     * The method will throw an error, if multiple or no controllers found.
     *
     * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit onInit},
     * and implicitly created controllers (extended via method {@link EController#extend extend}), if called during or after event
     * {@link EController.event:onPostInit onPostInit}.
     *
     * @param {string} ctrlName
     * Controller name to search by. It must adhere to JavaScript open-name syntax.
     *
     * @returns {EController}
     * A single child controller with the matching name.
     */
    EController.prototype.findOne = function (ctrlName) {
        var a = this.find(ctrlName);
        if (a.length !== 1) {
            throw new Error('Expected a single controller from ' + jStr(this.name) + '.findOne(' + jStr(ctrlName) + '), but found ' + a.length + '.');
        }
        return a[0];
    };

    /**
     * @method EController#find
     * @description
     * Searches for all initialized child controllers, by a given controller name, including the extended controllers.
     *
     * This method searches through DOM, as it needs to iterate over child elements. And because of that, even though
     * it searches just through a sub-set of elements, it is always slower than the global {@link ERoot#find ERoot.find} method.
     *
     * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit onInit},
     * and implicitly created controllers (extended via method {@link EController#extend extend}), if called during or after event
     * {@link EController.event:onPostInit onPostInit}.
     *
     * @param {string} ctrlName
     * Controller name to search by. It must adhere to JavaScript open-name syntax.
     *
     * @returns {EController[]}
     * List of initialized child controllers.
     *
     * @see {@link ERoot#find ERoot.find}
     */
    EController.prototype.find = function (ctrlName) {
        var cn = parseControllerName(ctrlName);
        return findAll('[data-e-bind],[e-bind]', this.node)
            .filter(function (e) {
                return e.controllers && e.controllers[cn];
            })
            .map(function (e) {
                return e.controllers[cn];
            });
    };

    /**
     * @method EController#verifyInit
     * @private
     * @description
     * Verifies that this controller has been initialized, or else throws an error.
     *
     * This method is for internal use.
     *
     * @param {string} method
     * Name of the method that requires verification.
     *
     * @returns {EController[]}
     * Controllers linked to the element.
     */
    EController.prototype.verifyInit = function (method) {
        var c = this.node.controllers;
        if (!c) {
            throw new Error('Method "' + method + '" cannot be used before initialization.');
        }
        return c;
    };

    /**
     * Global initialization.
     *
     * It excludes else statements from test coverage, because only
     * under JEST we have 'module' and 'window' at the same time.
     */
    (function () {
        /* istanbul ignore else */
        if (typeof module === 'object' && module && typeof module.exports === 'object') {
            module.exports = root; // UMD support
        }
        /* istanbul ignore else */
        if (typeof window !== 'undefined' && window) {
            window.excellent = root; // default root name
            var e = findAll('[data-e-root],[e-root]');
            if (e.length) {
                if (e.length > 1) {
                    throw new Error('Multiple root elements are not allowed.');
                }
                var name = getAttribute(e[0], 'data-e-root', 'e-root');
                if (!validJsVariable(name)) {
                    // The name must adhere to JavaScript open-name syntax!
                    throw new Error('Invalid ' + jStr(name) + ' root name specified: ' + startTag(e[0]));
                }
                window[name] = root; // adding alternative root name
            }
            document.addEventListener('DOMContentLoaded', function () {
                bindElement(null, true); // binding all elements synchronously
                if (typeof root.onInit === 'function') {
                    root.onInit();
                }
            });
        }
    })();

})();

/**
 * @external HTMLElement
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
 */
