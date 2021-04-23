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
     * @type {Object.<JSName, function>}
     */
    var ctrlRegistered = {};

    /**
     * Live global controllers (initialized, but not destroyed), with each property -
     * controller name set to an array of controller objects.
     *
     * @type {Object.<CtrlName, EController[]>}
     */
    var ctrlGlobal = {};

    /**
     * Live local controllers (initialized, but not destroyed), with each property -
     * controller name set to an array of controller objects.
     *
     * @type {Object.<CtrlName, EController[]>}
     */
    var ctrlLocal = {};

    /**
     * Global name-to-function cache for all controllers.
     *
     * @type {Object.<CtrlName, function>}
     */
    var ctrlCache = {};

    /**
     * All controlled elements currently in the DOM.
     *
     * @type {ControlledElement[]}
     */
    var elements = [];

    /**
     * Library's root object.
     *
     * @type {ERoot}
     */
    var root = new ERoot();

    /**
     * Alternative root name, if it was specified.
     *
     * @type {string}
     */
    var altRootName;

    /**
     * Helps observing when elements are removed.
     *
     * @type {DestroyObserver}
     */
    var observer = new DestroyObserver();

    /**
     * Indicates when executing a controller constructor.
     *
     * @type {boolean}
     */
    var constructing = false;

    /**
     * Validates controller name, optionally trimmed.
     *
     * @param {string|CtrlName} cn
     * Controller name.
     *
     * @param {boolean} [t=false]
     * Trims the name before validation.
     *
     * @returns {CtrlName|undefined}
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
     * Validates parameter as a valid DOM Element object.
     *
     * @param {external:HTMLElement} e
     * Element object to be validated.
     */
    function validateElement(e) {
        if (!e || typeof e.innerHTML !== 'string') {
            throw new TypeError('Parameter ' + jStr(e) + ' does not represent a valid DOM element.');
        }
    }

    /**
     * Validates a string to be a proper JavaScript open name.
     *
     * @param {string} name
     *
     * @returns {boolean}
     */
    function validJsVariable(name) {
        var m = name.match(/[a-z$_][a-z$_0-9]*/i);
        return m && m[0] === name;
    }

    /**
     * Validates an entity being registered.
     *
     * @param {JSName} name
     * Name of the entity.
     *
     * @param {function} cb
     * Callback function.
     *
     * @param {string} entity
     * Entity name.
     *
     * @returns {JSName}
     * Validated entity name.
     */
    function validateEntity(name, cb, entity) {
        var n = typeof name === 'string' ? trim(name) : '';
        if (!validJsVariable(n)) {
            throw new TypeError('Invalid ' + entity + ' name ' + jStr(name) + ' specified.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Initialization function for ' + entity + ' ' + jStr(name) + ' is missing.');
        }
        return n;
    }

    /**
     * Wraps a value to be friendly within error messages.
     *
     * @param {*} value
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
     * @param {string|JSName} txt
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
     * @param {string|JSName|CtrlName} prop
     * Property name.
     *
     * @param {*} value
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
     * @param {external:HTMLElement} [node]
     * Element to start processing from.
     *
     * @param {boolean|function} process
     * Determines how to process the binding:
     * - _any falsy value (default):_ the binding will be done asynchronously;
     * - _a function:_ binding is asynchronous, calling the function when finished;
     * - _any truthy value, except a function type:_ forces synchronous binding.
     */
    function processBinding(node, process) {
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
            bindAll(node);
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
                        bindAll(null);
                    } else {
                        nodes.forEach(bindAll);
                    }
                }
                for (var i = 0; i < cbs.length; i++) {
                    cbs[i]();
                }
            });
        }
    }

    /**
     * Registers the live controller in the global list, so it can be found globally.
     *
     * @param {CtrlName|string} name
     * Controller name.
     *
     * @param {EController} c
     * Controller object.
     *
     * @param {boolean} [local=false]
     * Local-controller flag.
     */
    function addLiveCtrl(name, c, local) {
        var target = local ? ctrlLocal : ctrlGlobal;
        target[name] = target[name] || [];
        target[name].push(c);
    }

    /**
     * @class ControllerClass
     * @private
     * @readonly
     * @property {string|null} $ccn
     * Controller Class Name, if it is a valid controller class, or `null` otherwise.
     * @property {string} name
     * @property {ControlledElement} node
     */

    /**
     * Helper for creating a controller in a safe way.
     *
     * @param {string|CtrlName} name
     * Controller name.
     *
     * @param {HTMLElement|ControlledElement} e
     * Element associated with the controller.
     *
     * @param {function|ControllerClass} f
     * Controller's construction function or class.
     *
     * @returns {EController}
     * Created controller.
     */
    function createController(name, e, f) {
        validateClass(f);
        constructing = true;
        var c;
        var cc = {name: name, node: e}; // controller context
        try {
            if (f.$ccn) {
                var Cls = f; // it is a controller class
                c = new Cls(cc);
                if (c.name !== name || c.node !== e) {
                    throw new Error('Controller class "' + f.$ccn + '" passed invalid parameters to "EController" constructor.');
                }
            } else {
                c = new EController(cc);
                f.call(c, c);
            }
        } catch (err) {
            constructing = false;
            throw err;
        } finally {
            constructing = false;
        }
        return c;
    }

    /**
     * Validates and prepares a function / class for instantiation.
     *
     * @param {function|ControllerClass} func
     * Function or class to be validated.
     */
    function validateClass(func) {
        if (func.$ccn === undefined) {
            var m = Function.prototype.toString.call(func).match(/^class\s+([a-zA-Z$_][a-zA-Z$_0-9]*)/);
            var name = m && m[1];
            if (name && !(func.prototype instanceof EController)) {
                throw new Error('Invalid controller class "' + name + '", as it does not derive from "EController".');
            }
            Object.defineProperty(func, '$ccn', {value: name});
        }
    }

    /**
     * Binds to controllers all elements that are not yet bound,
     * within the specified parent element, or globally.
     *
     * @param {HTMLElement} [node]
     * Top-level node element to start searching from. When not specified,
     * the search is done for the entire document.
     */
    function bindAll(node) {
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
                                var f = getCtrlFunc(name, e);
                                var c = createController(name, e, f);
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
        eventNotify(allCtrl, 'onInit');
        eventNotify(allCtrl, 'onReady');
    }

    /**
     * Abstract event parameter-less notification for controllers.
     *
     * @param {Array<EController|ERoot>} arr
     * List of controllers.
     *
     * @param {string} event
     * Event name.
     */
    function eventNotify(arr, event) {
        for (var i = 0; i < arr.length; i++) {
            var a = arr[i];
            if (typeof a[event] === 'function') {
                a[event]();
            }
        }
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
        var mo, timer;

        // MutationObserver does not exist in JEST:
        // istanbul ignore else
        if (typeof MutationObserver === 'undefined') {
            // istanbul ignore else
            if (typeof window !== 'undefined' && window) {
                // We do not create any timer when inside Node.js
                timer = setInterval(manualCheck, 1000); // This is a work-around for IE9 and IE10
            }
        } else {
            mo = new MutationObserver(mutantCB);
        }

        /**
         * @method DestroyObserver#stop
         * @description
         * To be used only from tests, it helps fully reset the library.
         */
        this.stop = function () {
            // istanbul ignore else
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            // MutationObserver does not exist in JEST:
            // istanbul ignore next
            if (mo) {
                mo.disconnect();
                mo = null;
            }
        };

        /**
         * @method DestroyObserver#watch
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
                mo.observe(e, {childList: true, subtree: true});
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
                            destroyNotify(e);
                        }
                        removeControllers(e);
                    }
                    manualCheck();
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
                        destroyNotify(e);
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
        function destroyNotify(e) {
            var c = [];
            for (var i in e.controllers) {
                c.push(e.controllers[i]);
            }
            eventNotify(c, 'onDestroy');
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
     * @member {Object.<CtrlName, EController>} ControlledElement#controllers
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
     * Searches for a controller, based on its full name.
     * For that it uses the cache of names, plus modules.
     *
     * @param {string|CtrlName} name
     * Controller name to be resolved.
     *
     * @param {HTMLElement} [e]
     * Element available as the context.
     *
     * @param {boolean} [noError=false]
     * Tells it not to throw on errors, and rather return null.
     *
     * @returns {function|class|null}
     * Either a valid controller or throws an error. But if `noError` is true,
     * and no controller found, it returns `null`.
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
            var mod = names[0];
            if (!(mod in root.modules)) {
                if (noError) {
                    return null;
                }
                throw new Error('Module ' + jStr(mod) + ' not found' + (e ? ': ' + startTag(e) : '.'));
            }
            var obj = root.modules[mod];
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
        if (noError) {
            return null;
        }
        throw new Error('Controller ' + jStr(name) + ' not found' + (e ? ': ' + startTag(e) : '.'));
    }

    /**
     * Parses a controller name, while allowing for trailing spaces.
     *
     * @param {CtrlName} cn
     * Controller name.
     *
     * @returns {CtrlName}
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
     * {@link ERoot#addController addController},
     * {@link ERoot#addAlias addAlias},
     * {@link ERoot#addModule addModule},
     * {@link ERoot#addService addService},
     * {@link ERoot#attach attach},
     * {@link ERoot#bind bind},
     * {@link ERoot#bindFor bindFor},
     * {@link ERoot#find find},
     * {@link ERoot#findOne findOne},
     * {@link ERoot#getCtrlFunc getCtrlFunc},
     * {@link ERoot#reset reset},
     * {@link ERoot#modules modules},
     * {@link ERoot#services services},
     * {@link ERoot#version version},
     * {@link ERoot.event:onReady onReady}
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
         * @type {Object.<JSName, {}>}
         * @readonly
         * @description
         * Namespace of all services, registered with method {@link ERoot#addService addService}.
         *
         * @see {@link ERoot#addService addService}
         */
        readOnlyProp(this, 'services', {});

        /**
         * @member ERoot#modules
         * @type {Object.<JSName, {}>}
         * @readonly
         * @description
         * Namespace of all modules, registered with method {@link ERoot#addModule addModule}.
         *
         * @see {@link ERoot#addModule addModule}
         */
        readOnlyProp(this, 'modules', {});

        /**
         * @member ERoot#EController
         * @type {class}
         * @readonly
         * @private
         * @description
         * Exposing class EController, just for compatibility with TypeScript's require usage.
         */
        readOnlyProp(this, 'EController', EController);

        /**
         * @method ERoot#addController
         * @description
         * Registers a new application-level controller.
         *
         * A controller is either a function or ES6 class that implements it, paired with a unique name by which it is represented.
         *
         * Typical implementation for any reusable controller is to be done inside a module, which registers itself
         * (and all its controllers automatically) with {@link ERoot#addModule addModule}. It is only when you
         * need some application-specific controllers that you would create them on the application level, and then
         * you need to use this method, in order to register them.
         *
         * If controller with such name already exists, then the method will do the following:
         *
         *  - throw an error, if the controller is different from the original
         *  - nothing (and return `false`), if the controller passed in is the same
         *
         * _**TIP:** Reusable controllers should always reside inside modules._
         *
         * And if the purpose of your controller is only to extend and/or configure other controller(s), then method
         * {@link ERoot#addAlias addAlias} offers a simpler syntax for adding such controllers.
         *
         * @param {JSName} name
         * Controller name. Trailing spaces are ignored.
         *
         * @param {function|class} func
         * Either a function or ES6 class that implements the controller:
         * - a function is called with controller's scope/instance as a single parameter, and as `this` context,
         * to initialize the controller as required.
         * - for an ES6 class, a new instance is created.
         *
         * @returns {boolean}
         * Indication of whether the controller was added:
         * - `true` - a new controller has been added
         * - `false` - a controller with the same name and implementation was added previously
         *
         * @see
         * {@link ERoot#addAlias addAlias},
         * {@link ERoot#addModule addModule},
         * {@link ERoot#addService addService},
         * {@link EController.event:onInit EController.onInit},
         * {@link EController.event:onReady EController.onReady},
         * {@link EController.event:onDestroy EController.onDestroy}
         *
         * @example
         *
         * // ES5 syntax:
         * //
         * app.addController('ctrlName', function(ctrl) {
         *     // this = ctrl
         *
         *     // Initializing your controller here:
         *     //
         *     // - setting up public properties and methods
         *     // - setting up event handlers, as needed
         *     // - changing DOM, if needed
         *
         *     // Creating all event handlers, as needed:
         *
         *     this.onInit = function() {
         *         // - can do ctrl.extend(...) here, to extend functionality
         *         // - can find controllers created through explicit binding
         *     };
         *
         *     this.onReady = function() {
         *         // can find all controllers here, including the ones
         *         // created implicitly (through extension)
         *     };
         *
         *     this.onDestroy = function() {
         *         // any clean-up, if needed
         *     };
         *
         *     // Creating public properties + methods for
         *     // communication with other controllers:
         *
         *     this.someProp = 123;
         *
         *     this.someMethod = function() {
         *         // do something
         *     };
         * });
         *
         * @example
         *
         * // ES6 class syntax:
         * //
         * class MyController extends EController {
         *     // If you want to use a constructor in your controller class,
         *     // you must pass Controller Context parameter into the parent,
         *     // or else there will be a construction-related error thrown:
         *     constructor(cc) {
         *         super(cc); // pass Controller Context into the parent class
         *
         *         // here you can access and modify DOM
         *     }
         *
         *     onInit() {
         *         // - can do ctrl.extend(...) here, to extend functionality
         *         // - can find controllers created through explicit binding
         *     }
         *
         *     onReady() {
         *         // can find all controllers here, including the ones
         *         // created implicitly (through extension)
         *     }
         *
         *     onDestroy() {
         *         // any clean-up, if needed
         *     }
         * }
         *
         * app.addController('ctrlName', MyController);
         */
        this.addController = function (name, func) {
            name = validateEntity(name, func, 'controller');
            validateClass(func);
            if (name in ctrlRegistered) {
                // controller name has been registered previously
                if (ctrlRegistered[name] === func) {
                    // it is the same controller, so we can just ignore it;
                    return false;
                }
                throw new Error('Controller with name ' + jStr(name) + ' already exists.');
            }
            ctrlRegistered[name] = func;
            return true;
        };

        /**
         * @method ERoot#addAlias
         * @description
         * Creates a simplified controller as a configurable alias.
         *
         * Any controller that extends other controllers, using method {@link EController#extend EController.extend},
         * is effectively an alias. And this method simplifies creation of such controllers, suitable when you only want
         * a new alias for extended controller(s), and optionally configured.
         *
         * This method is particularity useful during integration into an app, creating simpler aliases and configuring
         * their extended controllers at the same time. You may decide to have a few such controllers, as a means of
         * simplifying the app setup, i.e. instead of searching for a controller to change its configuration, you can
         * resort to using a pre-configured alias, even if it is for a single controller:
         *
         * ```js
         * app.addAlias('errorBoard', 'someModule.panels.centered', function(c) {
         *    // here we presume that controller 'someModule.panels.centered'
         *    // implements method setConfig(configObject):
         *    c.setConfig({bgColor: 'red', color: 'white'});
         * });
         * ```
         *
         * In cases when all you want is to create an alias for a single controller name, inside an app or a module,
         * method {@link ERoot#getCtrlFunc getCtrlFunc} may be more appropriate for this.
         *
         * @param {JSName} name
         * New controller/alias name. Trailing spaces are ignored.
         *
         * @param {CtrlName|CtrlName[]} ctrlNames
         * Either a single controller name, or an array of names, for which the new alias is created.
         *
         * Trailing spaces are ignored.
         *
         * @param {function} [cb]
         * Optional callback for re-configuring controllers.
         *
         * It takes a dynamic list of parameters, matching the specified controllers.
         *
         * Calling context `this` is set to the created alias controller.
         *
         * @see
         * {@link ERoot#addController addController},
         * {@link ERoot#getCtrlFunc getCtrlFunc}
         *
         * @example
         *
         * // Create a new controller aliasName as an alias for ['controller1', 'controller2'],
         * // so instead of e-bind="controller1, controller2" we can use e-bind="aliasName":
         *
         * app.addAlias('aliasName', ['controller1', 'controller2']);
         *
         * @example
         *
         * // Create a new controller-alias, and re-configure it at the same time:
         *
         * app.addAlias('aliasName', ['controller1', 'controller2'], function(c1, c2) {
         *     // this = controller 'aliasName' object
         *     // c1 = controller 'controller1' object
         *     // c2 = controller 'controller2' object
         *
         *     this.node.className = 'myClass';
         *
         *     c1.someMethod(123);
         *     c2.someMethod('hello!');
         * });
         *
         */
        this.addAlias = function (name, ctrlNames, cb) {
            root.addController(name, function () {
                this.onInit = function () {
                    var c = this.extend(ctrlNames);
                    if (typeof cb === 'function') {
                        cb.apply(this, Array.isArray(c) && c || [c]);
                    }
                };
            });
        };

        /**
         * @method ERoot#addService
         * @description
         * Adds and initializes a new service, which is simply an isolated namespace that contains
         * generic reusable code, to be shared across components and/or the application.
         *
         * If the service with such name already exists, the method will do nothing, and return `false`.
         *
         * Each added service becomes globally available via the {@link ERoot#services services} namespace.
         *
         * @param {JSName} name
         * Service name. Trailing spaces are ignored.
         *
         * @param {function} func
         * Service initialization function, to be called with the service's scope as a single parameter,
         * and as `this` context, to initialize the service as required.
         *
         * @see
         * {@link ERoot#addController addController},
         * {@link ERoot#addModule addModule}
         *
         * @returns {boolean}
         * Indication of whether the service was added:
         * - `true` - the service has been successfully added
         * - `false` - ignoring the service, as it was added previously
         *
         * @example
         *
         * app.addService('serviceName', function(scope) {
         *     // this = scope
         *
         *     // Implement the service API on the scope here:
         *
         *     this.getMessage = function() {
         *         // implement the method here
         *     };
         * });
         */
        this.addService = function (name, func) {
            name = validateEntity(name, func, 'service');
            if (name in root.services) {
                return false;
            }
            var scope = {};
            func.call(scope, scope);
            readOnlyProp(root.services, name, scope);
            return true;
        };

        /**
         * @method ERoot#addModule
         * @description
         * Adds and initializes a new module, which is effectively an isolated namespace of controllers.
         *
         * If the module with such name already exists, the method will do nothing, and return `false`.
         *
         * Unlike application-level controllers, which register themselves by calling {@link ERoot#addController addController},
         * all controllers inside a module are available automatically, just as the module is added.
         *
         * Each added module is listed within the {@link ERoot#modules modules} namespace.
         *
         * @param {JSName} name
         * Module name. Trailing spaces are ignored.
         *
         * @param {function} func
         * Module initialization function, to be called with the module's scope as a single parameter,
         * and as `this` context, to initialize the module as required.
         *
         * @returns {boolean}
         * Indication of whether the module was added:
         * - `true` - the module has been successfully added
         * - `false` - ignoring the module, as it was added previously
         *
         * @see
         * {@link ERoot#addController addController},
         * {@link ERoot#addService addService}
         *
         * @example
         *
         * app.addModule('moduleName', function(scope) {
         *     // this = scope
         *
         *     // Creating functions-controllers on the scope:
         *
         *     this.ctrl1 = function() {
         *         // controller implementation here;
         *     };
         *
         *     // Can use sub-spaces of any depth:
         *     this.effects = {
         *         fadeIn: function() {
         *             // implement fadeIn controller here;
         *         },
         *         fadeOut: function() {
         *             // implement fadeOut controller here;
         *         };
         *     };
         * });
         *
         * @example
         *
         * // Modules can also use ES6 classes as controllers:
         *
         * class MyController extends EController {
         *     onInit() {
         *         this.node.innerHTML = 'Hello!';
         *     }
         * }
         *
         * app.addModule('moduleName', function(scope) {
         *     // this = scope
         *
         *     this.ctrl1 = MyController;
         * });
         */
        this.addModule = function (name, func) {
            name = validateEntity(name, func, 'module');
            if (name in root.modules) {
                return false;
            }
            var scope = {};
            func.call(scope, scope);
            readOnlyProp(root.modules, name, scope);
            return true;
        };

        /**
         * @method ERoot#attach
         * @description
         * Manually attaches/binds and initializes controller(s) to one specific DOM element, bypassing the automatic
         * controller binding.
         *
         * This method is to simplify the binding when elements are available only as DOM objects, and not as HTML.
         *
         * Most practical use cases for this method are that of an integration process into an application.
         * If however, you decide to call it from inside a controller, please note that while it will work during
         * and after {@link EController.event:onInit onInit} event, it will throw an error, if called during the
         * controller's construction, because it will cause nested binding execution, which this library does not support.
         *
         * The method's primary use is as an integration tool, and a replacement for automatic binding, not an addition.
         * However, if you try to combine it, note that while attaching to an element previously bound automatically,
         * it will work correctly, as an extension (just like method {@link EController#extend EController.extend}),
         * but automatic binding will not work on elements with manually attached controllers, due to the conflict
         * of controllers initialization in this case.
         *
         * Similar to method {@link EController#extend EController.extend}, it creates and returns a new controller(s),
         * according to the parameters. And if you specify a controller name that's already bound to the element,
         * that controller is returned instead, to be reused, because only a single controller type can be bound to any
         * given element.
         *
         * The method sets/updates attribute `data-e-bind` / `e-bind` according to the new bindings.
         *
         * @param {external:HTMLElement} e
         * Either a new DOM element or a {@link ControlledElement}, to bind with the specified controller(s).
         *
         * @param {CtrlName|CtrlName[]} names
         * Either a single controller name, or an array of names. Trailing spaces are ignored.
         *
         * @returns {EController|EController[]}
         * - if you pass in a single controller name, it returns a single created controller.
         * - if you pass in an array of names, it returns an array of created controllers.
         *
         * The returned controller(s) have already finished processing event {@link EController.event:onReady EController.onReady}.
         *
         * @see
         * {@link ERoot#bind bind},
         * {@link ERoot#bindFor bindFor},
         * {@link EController#bind EController.bind}
         *
         * @example
         *
         * // This is how you can integrate a controller into an existing app,
         * // without using element-to-controller explicit bindings:
         *
         * var e = document.getElementById('someId'); // find a DOM element
         * var c = app.attach(e, 'myController'); // attach a controller to it
         * c.someMethod(data); // data = parametrization data for the controller
         *
         * @example
         *
         * // This example is only to show how ERoot.attach relates to EController.extend,
         * // but not how it is to be used, as using ERoot.attach like this is pointless.
         *
         * app.addController('ctrlName', function(ctrl) {
         *     this.onInit = function() {
         *
         *         // Specifically in this context, the result of
         *         // calling the following two lines is identical:
         *
         *         var a = ctrl.extend(['ctrl1', 'ctrl2']);
         *
         *         var b = app.attach(ctrl.node, ['ctrl1', 'ctrl2']);
         *     };
         * });
         */
        this.attach = function (e, names) {
            validateElement(e);
            if (constructing) {
                throw new Error('Cannot invoke ERoot.attach from a controller constructor.');
            }
            var ctrl = e.controllers || {};
            var created = [], attrNames = [];

            function ext(n) {
                var cn = validateControllerName(n, true);
                if (!cn) {
                    throw new TypeError('Invalid controller name ' + jStr(n) + ' specified.');
                }
                var c = ctrl[cn];
                if (!c) {
                    var f = getCtrlFunc(cn);
                    c = createController(cn, e, f);
                    readOnlyProp(ctrl, cn, c);
                    addLiveCtrl(cn, c);
                    created.push(c);
                    attrNames.push(cn);
                }
                return c;
            }

            var result = Array.isArray(names) ? names.map(ext) : ext(names);

            if (!e.controllers) {
                readOnlyProp(e, 'controllers', ctrl);
                elements.push(e);
                observer.watch(e);
            }

            // Need to set the attribute, if missing, or else EController.find
            // won't see it; and worse - event onDestroy won't work in IE9/10
            var attrValue = getAttribute(e, 'data-e-bind', 'e-bind');
            if (attrValue) {
                var oldAttr = attrValue.split(',').map(trim);
                attrNames.forEach(function (a) {
                    if (oldAttr.indexOf(a) === -1) {
                        oldAttr.push(a);
                    }
                });
                attrNames = oldAttr;
            }
            attrValue = attrNames.join(', ');
            var an = e.hasAttribute('e-bind') ? 'e-bind' : 'data-e-bind';
            e.setAttribute(an, attrValue);

            eventNotify(created, 'onInit');
            eventNotify(created, 'onReady');
            return result;
        };

        /**
         * @method ERoot#reset
         * @description
         * Performs instant hard reset of the entire library state, including the root interface object.
         *
         * It is only to help with some automatic tests that may require fresh state of the library.
         *
         * **NOTE:** If an alternative root name was set with `e-root` / `data-e-root`, its value is reset,
         * but the name itself is not removed from the global scope, because the library can pick it up
         * only once, on the initial run.
         *
         * @see
         * {@link ERoot#analyze analyze}
         */
        this.reset = function () {
            ctrlRegistered = {};
            ctrlGlobal = {};
            ctrlLocal = {};
            ctrlCache = {};
            elements.length = 0;
            observer.stop();
            observer = new DestroyObserver();
            constructing = false;
            root = new ERoot();
            window.excellent = root;
            if (altRootName) {
                window[altRootName] = root;
            }
        };

        /**
         * @method ERoot#bind
         * @description
         * Searches for all elements in the document not yet bound, and binds them to controllers.
         *
         * It will search for all elements in the document that contain attribute `data-e-bind` / `e-bind`,
         * but without controllers yet, create and initialize controllers, as specified by the attribute,
         * which is expected to contain valid names (comma-separated) of existing controllers.
         *
         * Normally, a controller creates new controlled elements within its children, and then uses
         * {@link EController#bind EController.bind} method. It is only when you create a new controlled
         * element that's not a child element, then you would use this global binding. For a random-element
         * binding see {@link ERoot#bindFor bindFor}.
         *
         * Note that when integrating your controllers into an application, if you are dealing with DOM objects rather than HTML,
         * then you can alternatively make use of method {@link ERoot#attach attach}, to inject and initialize controllers
         * for one specific DOM element.
         *
         * You should try to avoid use of synchronous bindings, if possible. The binding engine implements the logic
         * of minimizing the number of checks against the DOM, but it works/scales best when requests are asynchronous.
         *
         * @param {boolean|function} [process=false]
         * Determines how to process the binding:
         * - _any falsy value (default):_ the binding will be done asynchronously;
         * - _a function:_ binding is asynchronous, calling the function when finished;
         * - _any truthy value, except a function type:_ forces synchronous binding.
         *
         * @see
         * {@link ERoot#bindFor bindFor},
         * {@link ERoot#attach attach},
         * {@link EController#bind EController.bind}
         */
        this.bind = function (process) {
            processBinding(null, process);
        };

        /**
         * @method ERoot#bindFor
         * @description
         * Searches and initializes new bindings inside the specified element.
         *
         * Typically, you would trigger local bindings via {@link EController#bind EController.bind}. But when you know the element
         * that contains new bindings, and do not want to create a controller for it, or use the global {@link ERoot#bind bind},
         * you can use this method instead.
         *
         * @param {external:HTMLElement} e
         * DOM element with new bindings among its children - elements with attribute `data-e-bind` / `e-bind` set to valid names
         * (comma-separated) of existing controllers.
         *
         * @param {boolean|function} [process=false]
         * Determines how to process the binding:
         * - _any falsy value (default):_ the binding will be done asynchronously;
         * - _a function:_ binding is asynchronous, calling the function when finished;
         * - _any truthy value, except a function type:_ forces synchronous binding.
         *
         * @see
         * {@link ERoot#bind bind},
         * {@link EController#bind EController.bind}
         *
         * @example
         *
         * var e = document.getElementById('someId');
         * e.innerHTML = '<div e-bind="ctrl1, ctrl2"></div>';
         * app.bindFor(e); // bind child elements to controllers
         */
        this.bindFor = function (e, process) {
            validateElement(e);
            processBinding(e, process);
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
         * {@link EController.event:onReady EController.onReady}. And it will find everything, if called during or after global event
         * {@link ERoot.event:onReady ERoot.onReady}.
         *
         * @param {CtrlName} name
         * Controller name to search by. Trailing spaces are ignored.
         *
         * @returns {EController[]}
         * List of found initialized controllers.
         *
         * @see
         * {@link ERoot#findOne findOne},
         * {@link EController#find EController.find},
         * {@link EController#findOne EController.findOne}
         */
        this.find = function (name) {
            var cn = parseControllerName(name);
            if (cn in ctrlGlobal) {
                return ctrlGlobal[cn].slice();
            }
            return [];
        };

        /**
         * @method ERoot#findOne
         * @description
         * Implements a safe-check search for a single initialized controller, in the entire application, based on the controller name.
         *
         * The method will throw an error, if multiple or no controllers found.
         *
         * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit EController.onInit},
         * and implicitly created controllers (extended via method {@link EController#extend EController.extend}), if called during or after event
         * {@link EController.event:onReady EController.onReady}. And it will find everything, if called during or after global event
         * {@link ERoot.event:onReady ERoot.onReady}.
         *
         * @param {CtrlName} name
         * Controller name to search by. Trailing spaces are ignored.
         *
         * @returns {EController}
         * A single controller with the matching name.
         *
         * @see
         * {@link ERoot#find find},
         * {@link EController#find EController.find},
         * {@link EController#findOne EController.findOne}
         */
        this.findOne = function (name) {
            var a = this.find(name);
            if (a.length !== 1) {
                throw new Error('Expected a single controller from findOne(' + jStr(name) + '), but found ' + a.length + '.');
            }
            return a[0];
        };

        /**
         * @method ERoot#getCtrlFunc
         * @description
         * Resolves a full controller name into the corresponding controller (function/class).
         *
         * This lets you create controllers on the app level or inside modules that directly alias an existing controller,
         * without extending it (methods {@link EController#extend EController.extend} and {@link ERoot#addAlias ERoot.addAlias}).
         *
         * ```js
         * // Example of declaring a controller inside a module,
         * // as an alias for a controller from another module:
         *
         * scope.print = e.getCtrlFunc('printModule.default.showUI');
         *
         * // e = excellent root object, scope = module's scope object
         * ```
         *
         * @param {CtrlName} name
         * Full controller name. Trailing spaces are ignored.
         *
         * @param {boolean} [noError=false]
         * By default, the method throws an error whenever it fails to resolve the specified name into a valid controller.
         * Passing in `noError = true` forces it to return `null` when the module or controller are not found.
         * This however will not suppress errors related to passing in an invalid controller name.
         *
         * Example of where you might want to use it - provide an alternative controller when the desired one could not be
         * resolved for some reasons, like when inclusion of a certain module into the app is optional.
         * This way you can also check whether the containing module is included or not.
         *
         * @returns {function|class|null}
         * Initialization controller (function/class).
         *
         * It can return `null` only when the function fails because the module or controller were not found,
         * and `noError` was passed in as a truthy value.
         *
         * @see
         * {@link ERoot#addAlias addAlias}
         *
         * @example
         *
         * // Adding a controller-alias, just to shorten another controller's name:
         *
         * app.addController('shortName', app.getCtrlFunc('module1.very.long.name'));
         *
         */
        this.getCtrlFunc = function (name, noError) {
            return getCtrlFunc(parseControllerName(name), null, noError);
        };

        /**
         * @method ERoot#analyze
         * @description
         * Pulls together and returns a snapshot of the current state of the library, as {@link EStatistics} object.
         *
         * This method is to help with debugging your application, and for automatic tests.
         *
         * @returns {EStatistics}
         * Statistics Data.
         *
         * @see
         * {@link ERoot#reset reset}
         */
        this.analyze = function () {
            var res = {
                bindings: {
                    locals: bs.nodes.length,
                    callbacks: bs.cb.length,
                    waiting: bs.waiting,
                    global: bs.glob
                },
                controllers: {
                    global: {},
                    local: {},
                    registered: Object.keys(ctrlRegistered),
                    total: 0
                },
                elements: elements.slice(),
                modules: root.modules,
                services: root.services
            };
            for (var g in ctrlGlobal) {
                res.controllers.total += ctrlGlobal[g].length;
                res.controllers.global[g] = ctrlGlobal[g].slice();
            }
            for (var l in ctrlLocal) {
                res.controllers.total += ctrlLocal[l].length;
                res.controllers.local[l] = ctrlLocal[l].slice();
            }
            return res;
        };
    }

    /**
     * @interface EStatistics
     * @description
     * Statistics / Diagnostics data, as returned by method {@link ERoot#analyze ERoot.analyze}.
     *
     * @property bindings
     * Element-to-controller binding status.
     *
     * @property {number} bindings.locals
     * Number of pending child-binding requests, from {@link EController#bind EController.bind}.
     *
     * @property {number} bindings.callbacks
     * Number of pending recipients awaiting a notification when the requested binding is finished.
     *
     * @property {boolean} bindings.waiting
     * Binding engine has triggered a timer for the next asynchronous update, and is now waiting for it.
     *
     * @property {boolean} bindings.global
     * A global asynchronous request is being processed.
     *
     * @property controllers
     * Details about controllers.
     *
     * @property {Object.<CtrlName, EController[]>} controllers.global
     * All global live controllers, visible to search methods {@link ERoot#find ERoot.find} and {@link ERoot#findOne ERoot.findOne}.
     *
     * @property {Object.<CtrlName, EController[]>} controllers.local
     * All local live controllers (created via {@link EController#extend EController.extend} with `local` = `true`),
     * and thus not visible to search methods {@link ERoot#find ERoot.find} and {@link ERoot#findOne ERoot.findOne}.
     *
     * @property {JSName[]} controllers.registered
     * Names of all registered controllers.
     *
     * @property {number} controllers.total
     * Total number of all live controllers.
     *
     * @property {ControlledElement[]} elements
     * List of all controlled elements currently in the DOM.
     *
     * @property {Object.<JSName, {}>} modules
     * All registered and initialized modules.
     *
     * @property {Object.<JSName, {}>} services
     * All registered and initialized services.
     *
     * */

    /**
     * @event ERoot.onReady
     * @type {function}
     * @description
     * Called only once, after initializing controllers in the app for the first time.
     *
     * It represents the state of the application when it is ready to find all controllers
     * and communicate with them. This includes controllers created through extension, i.e.
     * all controllers have finished processing {@link EController.event:onReady onReady}
     * event at this point.
     *
     * @see
     * {@link EController.event:onInit EController.onInit},
     * {@link EController.event:onReady EController.onReady}
     *
     * @example
     *
     * app.onReady = function() {
     *   // All explicit and extended controllers now can be located;
     *
     *   // Let's find our main app controller, and ask it to do something:
     *   app.findOne('appCtrl').doSomething();
     * };
     */

    /**
     * @class EController
     * @hideconstructor
     * @description
     * Controller interface, attached to each {@link ControlledElement} in the DOM.
     *
     * It is created automatically, during element-to-controller binding, or when {@link ERoot#attach attaching} to an element.
     *
     * @param {} cc
     * Controller Context.
     *
     * @param {CtrlName} cc.name
     * Controller name.
     *
     * @param {ControlledElement} cc.node
     * Controller's node element.
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
     * {@link EController.event:onReady onReady},
     * {@link EController.event:onDestroy onDestroy}
     */
    function EController(cc) {

        cc = cc || {};

        /**
         * @member EController#name
         * @type {CtrlName}
         * @readonly
         * @description
         * Full name of the controller, i.e. the name from which the controller was instantiated.
         */
        readOnlyProp(this, 'name', cc.name);

        /**
         * @member EController#node
         * @type {ControlledElement}
         * @readonly
         * @description
         * The DOM element/node this controller is bound to.
         *
         * Every controller is bound to a DOM element in the document, either through binding or direct attachment.
         * And at the core of every component is direct communication with the element it is bound to.
         */
        readOnlyProp(this, 'node', cc.node);
    }

    /**
     * @event EController.onInit
     * @type {function}
     * @description
     * Initialization event handler.
     *
     * It represents the state of the controller when it is ready to do any of the following:
     *  - find explicitly bound (through `e-bind` attribute) controllers and communicate with them
     *  - extend the element with other controllers (via method {@link EController#extend extend})
     *
     * Note that at this point you cannot locate or communicate with outside controllers being extended
     * (via method {@link EController#extend extend}). For that you need to use {@link EController.event:onReady onReady} event.
     *
     * If a controller doesn't extend or communicate with other controllers, then it does not need to handle this event.
     *
     * @see
     * {@link EController.event:onReady onReady},
     * {@link EController.event:onDestroy onDestroy},
     * {@link ERoot.event:onReady ERoot.onReady}
     *
     * @example
     *
     * app.addController('ctrlName', function(ctrl) {
     *    ctrl.onInit = function() {
     *        // this = ctrl
     *
     *        // - you can use ctrl.extend here, to extend it
     *        // - you can find explicitly created controllers
     *    };
     * });
     */

    /**
     * @event EController.onReady
     * @type {function}
     * @description
     * Post-initialization event (happens after event {@link EController.event:onInit onInit}).
     *
     * At this point you can find and communicate with controllers created implicitly, through extension (via method {@link EController#extend extend}).
     *
     * Controllers can only be extended during {@link EController.event:onInit onInit}, and they are initialized right after. If you need to find and communicate
     * with such extended controllers, it is only possible during or after this event.
     *
     * @see
     * {@link EController.event:onInit onInit},
     * {@link EController.event:onDestroy onDestroy},
     * {@link ERoot.event:onReady ERoot.onReady}
     *
     * @example
     *
     * app.addController('ctrlName', function(ctrl) {
     *    ctrl.onReady = function() {
     *        // this = ctrl
     *
     *        // you can find and communicate with all controllers here
     *    };
     * });
     */

    /**
     * @event EController.onDestroy
     * @type {function}
     * @description
     * De-initialization event handler.
     *
     * It signals the controller that its element has been removed from DOM, and it is time to release any pre-allocated resources, if necessary.
     *
     * In any modern browser, the event is triggered immediately, courtesy of {@link external:MutationObserver MutationObserver},
     * while in older browsers (IE9 and IE10), it falls back on a manual background check that runs every second. You can make it instant
     * under IE9/10 also, by adding one of the `MutationObserver` polyfills to the app.
     *
     * @see
     * {@link ERoot.event:onReady ERoot.onReady}
     *
     * @example
     *
     * app.addController('ctrlName', function(ctrl) {
     *    ctrl.onDestroy = function() {
     *        // this = ctrl
     *
     *        // Release any resources here, if necessary
     *    };
     * });
     */

    /**
     * @method EController#bind
     * @description
     * Signals the framework that the element's inner content has been modified to contain new child controlled elements,
     * and that it is time to bind those with the corresponding controllers.
     *
     * It will search for all child elements that contain attribute `data-e-bind` / `e-bind`, but without controllers yet,
     * create and initialize controllers, as specified by the attribute, which is expected to contain valid names
     * (comma-separated) of existing controllers.
     *
     * This method requires that the calling controller has been initialized.
     *
     * Note that when integrating your controllers into an application, if you are dealing with DOM objects rather than HTML,
     * then you can alternatively make use of method {@link ERoot#attach ERoot.attach}, to inject and initialize controllers
     * for one specific DOM element.
     *
     * You should try to avoid use of synchronous bindings, if possible. The binding engine implements the logic of minimizing
     * the number of checks against the DOM, but it works/scales best when requests are asynchronous.
     *
     * @param {boolean|function} [process=false]
     * Determines how to process the binding:
     * - _any falsy value (default):_ the binding will be done asynchronously;
     * - _a function:_ binding is asynchronous, calling the function when finished;
     * - _any truthy value, except a function type:_ forces synchronous binding.
     *
     * @see
     * {@link ERoot#bind ERoot.bind},
     * {@link ERoot#bindFor ERoot.bindFor},
     * {@link ERoot#attach ERoot.attach}
     *
     * @example
     *
     * app.addController('appCtrl', function(ctrl) {
     *
     *     // You can also change content here, but
     *     // the binding only possible during onInit;
     *
     *     ctrl.onInit = function() {
     *         // Injecting a new controlled element:
     *         ctrl.node.innerHTML = '<div e-bind="someCtrl"></div>';
     *
     *         // Asynchronously bind all child controlled elements:
     *         ctrl.bind(function() {
     *             // Binding has finished, we can now find the controller:
     *             var c = ctrl.findOne('someCtrl');
     *             // and communicate with it:
     *             c.someMethod();
     *         });
     *
     *         // The following binding would produce the same result:
     *         // app.bindFor(this.node, cb);
     *     };
     * });
     */
    EController.prototype.bind = function (process) {
        this.verifyInit('bind');
        processBinding(this.node, process);
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
     * by the method, other/global controllers can communicate with them only during or after event
     * {@link EController.event:onReady onReady}.
     *
     * @param {CtrlName|CtrlName[]} names
     * Either a single controller name, or an array of names. Trailing spaces are ignored.
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
     * @see
     * {@link EController#depends depends}
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
    EController.prototype.extend = function (names, local) {
        var ctrl = this.verifyInit('extend');
        var created = [];

        function ext(n) {
            var cn = validateControllerName(n, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(n) + ' specified.');
            }
            var c = ctrl[cn];
            if (!c) {
                var f = getCtrlFunc(cn);
                c = createController(cn, this.node, f);
                readOnlyProp(ctrl, cn, c);
                addLiveCtrl(cn, c, local);
                created.push(c);
            }
            return c;
        }

        var result = Array.isArray(names) ? names.map(ext, this) : ext.call(this, names);
        eventNotify(created, 'onInit');
        eventNotify(created, 'onReady');
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
     * @param {CtrlName[]} names
     * List of controller names. It should include all controller names that are due to be extended
     * (via method {@link EController#extend extend}), plus the ones that can be requested dynamically.
     *
     * Trailing spaces are ignored.
     *
     * @see {@link EController#extend extend}
     *
     * @example
     *
     * app.addController('ctrlName', function(ctrl) {
     *
     *     // Make sure every controller on the list is available,
     *     // or else throw a detailed dependency error:
     *     ctrl.depends(['appCtrl', 'mod.ctrl1']);
     *
     * });
     */
    EController.prototype.depends = function (names) {
        if (!Array.isArray(names)) {
            throw new TypeError('Invalid list of controller names.');
        }
        names.forEach(function (n) {
            var cn = validateControllerName(n, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(n) + ' specified.');
            }
            if (!getCtrlFunc(cn, null, true)) {
                throw new Error('Controller ' + jStr(this.name) + ' depends on ' + jStr(cn) + ', which was not found.');
            }
        }, this);
    };

    /**
     * @method EController#findOne
     * @description
     * Implements a safe-check search for a single initialized child controller by a given controller name.
     *
     * The method will throw an error, if multiple or no controllers found.
     *
     * It will find explicitly created controllers, if called during or after event {@link EController.event:onInit onInit},
     * and implicitly created controllers (extended via method {@link EController#extend extend}), if called during or after event
     * {@link EController.event:onReady onReady}.
     *
     * @param {CtrlName} name
     * Controller name to search by. Trailing spaces are ignored.
     *
     * @returns {EController}
     * A single child controller with the matching name.
     *
     * @see
     * {@link EController#find find},
     * {@link ERoot#find ERoot.find},
     * {@link ERoot#findOne ERoot.findOne}
     */
    EController.prototype.findOne = function (name) {
        var a = this.find(name);
        if (a.length !== 1) {
            throw new Error('Expected a single controller from ' + jStr(this.name) + '.findOne(' + jStr(name) + '), but found ' + a.length + '.');
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
     * {@link EController.event:onReady onReady}.
     *
     * @param {CtrlName} name
     * Controller name to search by. Trailing spaces are ignored.
     *
     * @returns {EController[]}
     * List of initialized child controllers.
     *
     * @see
     * {@link EController#findOne findOne},
     * {@link ERoot#findOne ERoot.findOne},
     * {@link ERoot#find ERoot.find}
     */
    EController.prototype.find = function (name) {
        var cn = parseControllerName(name);
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
            window.EController = EController;
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
                altRootName = name;
                window[name] = root; // adding alternative root name
            }
            document.addEventListener('DOMContentLoaded', function () {
                processBinding(null, true); // binding all elements synchronously
                eventNotify([root], 'onReady');
            });
        }
    })();

})();

/**
 * @typedef JSName
 * @type {string}
 * @description
 * It is a string that complies with the open-name syntax for JavaScript variables:
 * - It must contain 1 or more symbols
 * - It is treated as case-sensitive
 * - Allowed symbols are: `a-z`, `A-Z`, `0-9`, `$` and `_`
 * - It cannot start with a digit (`0-9`)
 */

/**
 * @typedef CtrlName
 * @type {string}
 * @description
 * It is a standard JavaScript nested-name string, made up by 1 or more {@link JSName} strings, joined by a dot:
 *
 * ```js
 * module_1.$name2._ctrl3
 * ```
 *
 * - It cannot start or end with a dot
 * - It cannot have any spaces in between
 * - It is treated as case-sensitive
 *
 * The string represents a full controller name, depending on how many {@link JSName} entries it contains:
 *
 * - When it contains a single {@link JSName}, it always refers to an app-level controller, as added with
 *   {@link ERoot#addController ERoot.addController}
 * - When it contains more than one {@link JSName}, then the first one is a module name, as added with
 *   {@link ERoot#addModule ERoot.addModule}, followed by either a simple or nested controller name in that module.
 */

/**
 * @external HTMLElement
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
 */

/**
 * @external MutationObserver
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
 */
