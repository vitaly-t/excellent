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
    var ctrlRegistered = {};

    /**
     * All live controllers (initialized, but not destroyed), with each property -
     * controller name set to an array of controller objects.
     *
     * @type {{Object.<string, EController[]>>}}
     */
    var ctrlLive = {};

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
        if (!validJsVariable(name)) {
            throw new TypeError('Invalid ' + entity + ' name ' + jStr(name) + ' specified.');
        }
        if (typeof cb !== 'function') {
            throw new TypeError('Initialization function for ' + entity + ' ' + jStr(name) + ' is missing.');
        }
    }

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
    function validCN(cn, t) {
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
     * Searches for all elements that match selectors.
     *
     * @param {string} selectors
     *
     * @param {Element} [node]
     *
     * @returns {Element[] | ControlledElement[]}
     */
    function find(selectors, node) {
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
     * @param e
     * Element to get the value from.
     *
     * @param primary
     * Primary attribute name.
     *
     * @param secondary
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
     *
     * @returns {string}
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
     * Binds to controllers all elements that are not yet bound.
     *
     * @param {Element} [node]
     * Top-level node element to start searching from. When not specified,
     * the search is done for the entire document.
     */
    function bind(node) {
        binding = true;
        var allCtrl = [], els = [];
        find('[data-e-bind],[e-bind]', node)
            .forEach(function (e) {
                if (!e.controllers) {
                    var namesMap = {}, eCtrl;
                    getAttribute(e, 'data-e-bind', 'e-bind')
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
                                readOnlyProp(eCtrl, name, c);
                                allCtrl.push(c);
                                ctrlLive[name] = ctrlLive[name] || [];
                                ctrlLive[name].push(c);
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
        binding = false;
    }

    /**
     * @constructor
     * @private
     * @description
     * Helps watching node elements removal from DOM, in order to provide `onDestroy` notification
     * for all corresponding controllers.
     *
     * For IE9/10 that do not support `MutationObserver`, it executes manual check every 500ms.
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
                        removeControllers(e);
                    }
                }
            });
        }

        /**
         * Removes all controllers from ctrlLive, as per the element.
         *
         * @param {ControlledElement} e
         */
        function removeControllers(e) {
            for (var a in e.controllers) {
                var i = ctrlLive[a].indexOf(e.controllers[a]);
                ctrlLive[a].splice(i, 1);
                if (!ctrlLive[a].length) {
                    delete ctrlLive[a];
                }
            }
        }

        /**
         * Manual check for controlled elements that have been deleted from DOM.
         */
        function manualCheck() {
            var i = elements.length;
            if (i) {
                var ce = find('[data-e-bind],[e-bind]'); // all controlled elements;
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
     * @class ControlledElement
     * @extends Element
     * @description
     * Represents a standard DOM element, extended with read-only property `controllers`.
     *
     * This type is provided by the library automatically, after binding the element to controllers.
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
     *
     * @param {boolean} [noError=false]
     * Tells it not to throw on errors, and rather return null.
     *
     * @returns {function|undefined}
     * Either controller function or throws. But if noError is true,
     * and no controller found, it returns `undefined`.
     *
     */
    function getCtrlFunc(name, noError) {
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
     * Parses a controller name, allowing for trailing spaces.
     *
     * @param {string} cn
     * Controller name.
     *
     * @returns {string}
     * Validated controller name (without trailing spaces).
     */
    function parseControllerName(cn) {
        var name = validCN(cn, true);
        if (!name) {
            throw new TypeError('Invalid controller name ' + jStr(cn) + ' specified.');
        }
        return name;
    }

    /**
     * @class ERoot
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
     * {@link ERoot#services services},
     * {@link ERoot#version version},
     * {@link ERoot#addController addController},
     * {@link ERoot#addModule addModule},
     * {@link ERoot#addService addService},
     * {@link ERoot#bind bind},
     * {@link ERoot#find find},
     * {@link ERoot#findControllers findControllers},
     * {@link ERoot.event:onInit onInit}
     */
    function ERoot() {

        /**
         * @member ERoot#version
         * @type {string}
         * @readonly
         * @description
         * Library version, automatically injected during the build/compression process,
         * and so available only with the compressed version of the library.
         */
        readOnlyProp(this, 'version', '<version>');

        /**
         * @member ERoot#services
         * @type {object}
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
         * Controller name.
         *
         * @param {function} cb
         * Controller function.
         */
        this.addController = function (name, cb) {
            checkEntity(name, cb, 'controller');
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
         * If the service with such name already exists, the method will do nothing,
         * because it cannot determine whether the actual service behind the name is the same,
         * while services need to be fully reusable, even in dynamically loaded pages.
         *
         * Every added service becomes accessible by its name, from property {@link ERoot#services services}.
         *
         * @param {string} name
         * Service name.
         *
         * @param {function} cb
         * Service initialization function.
         */
        this.addService = function (name, cb) {
            checkEntity(name, cb, 'service');
            if (!(name in root.services)) {
                var s = {}; // service's scope
                readOnlyProp(root.services, name, s);
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
         * @param {string} name
         * Module name.
         *
         * @param {function} cb
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
         * uses {@link EController#bind EController.bind} method. It is only if you create a new
         * controlled element that's not a child element that you would use this global binding.
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
         * Searches for controlled elements within the entire document.
         *
         * It should only be called after initialization, or it will skip all uninitialized controllers.
         *
         * @param {string} selectors
         * Standard DOM selectors.
         *
         * @returns {ControlledElement[]}
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
         * Searches for all initialized controller objects, in the entire application, based on the controller name.
         *
         * The search is based on the internal instant-access controller map, without involving DOM, and is thus very fast.
         * In most cases it will significantly outperform {@link EController#findControllers EController.findControllers},
         * even though the latter searches only among children, but it uses DOM.
         *
         * @param {string} ctrlName
         * Controller name to search by.
         *
         * @returns {EController[]}
         * List of found initialized controllers.
         */
        this.findControllers = function (ctrlName) {
            var cn = parseControllerName(ctrlName);
            if (cn in ctrlLive) {
                return ctrlLive[cn].slice();
            }
            return [];
        };
    }

    /**
     * @event ERoot.onInit
     * @description
     * Called once in the beginning, after all controllers have been initialized.
     *
     * @see {@link EController.event:onInit EController.onInit}
     *
     * @type {function}
     */

    /**
     * @class EController
     * @description
     * Controller class, automatically associated with a DOM element, internally by the library,
     * for every controller name listed with either `e-bind` or `data-e-bind` attribute.
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
     * {@link EController#post post},
     * {@link EController.event:onInit onInit},
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
         * Full controller name.
         */
        readOnlyProp(this, 'name', name);

        /**
         * @member EController#node
         * @type {ControlledElement}
         * @readonly
         * @description
         * Source DOM element that uses this controller.
         */
        readOnlyProp(this, 'node', node);
    }

    /**
     * @event EController.onInit
     * @description
     * Initialization event handler.
     *
     * It is called after all controllers have finished their initialization,
     * and now ready to communicate with each other.
     *
     * @type {function}
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
     * @type {function}
     *
     * @see
     * {@link ERoot.event:onInit ERoot.onInit}
     */

    /**
     * @method EController#bind
     * @description
     * Indicates that the element's content has been modified to contain new child controlled elements,
     * and that it is time to bind those elements and initialize its controllers.
     *
     * This method requires that its controller has been initialized.
     */
    EController.prototype.bind = function () {
        this.verifyInit('bind');
        bind(this.node);
    };

    /**
     * @method EController#extend
     * @description
     * Extends other controller(s) with new functionality, thus providing functional inheritance.
     *
     * This method requires that its controller has been initialized.
     *
     * @param {string|string[]} ctrlName
     * Either a single controller name, or an array of names.
     *
     * @returns {EController|EController[]}
     * - if you pass in a single controller name, it returns a single controller.
     * - if you pass in an array of names, it returns an array of controllers.
     */
    EController.prototype.extend = function (ctrlName) {
        var t = typeof ctrlName, arr = Array.isArray(ctrlName);
        if (!t || (t !== 'string' && !arr)) {
            throw new TypeError('Parameter \'ctrlName\' is invalid.');
        }
        var ctrl = this.verifyInit('extend');

        function ext(name) {
            var cn = validCN(name, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(name) + ' specified.');
            }
            var c = this.node.controllers[cn];
            if (!c) {
                c = new EController(cn, this.node);
                getCtrlFunc(cn).call(c, c);
                readOnlyProp(ctrl, cn, c);
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
     * dynamically. Such explicit verification makes the code more robust.
     *
     * @param {string[]} ctrlNames
     * List of controller names.
     *
     * You would specify all controller names this controller may be extending via method {@link EController#extend extend},
     * plus any others that your controller may generate dynamically.
     */
    EController.prototype.depends = function (ctrlNames) {
        if (!Array.isArray(ctrlNames)) {
            throw new TypeError('Invalid list of controller names.');
        }
        ctrlNames.forEach(function (name) {
            var cn = validCN(name, true);
            if (!cn) {
                throw new TypeError('Invalid controller name ' + jStr(name) + ' specified.');
            }
            if (!getCtrlFunc(cn, true)) {
                throw new Error('Controller ' + jStr(this.name) + ' depends on ' + jStr(cn) + ', which was not found.');
            }
        }, this);
    };

    /**
     * @method EController#find
     * @description
     * Searches for all initialized controlled elements among children.
     *
     * @param {string} selectors
     * Standard DOM selectors.
     *
     * @returns {ControlledElement[]}
     * Controlled initialized child elements, matching the selectors.
     */
    EController.prototype.find = function (selectors) {
        return find(selectors, this.node).filter(function (e) {
            return !!e.controllers;
        });
    };

    /**
     * @method EController#findOne
     * @description
     * Searches for a single matching initialized controlled element.
     *
     * It will throw an error, if multiple or no elements found.
     *
     * @param {string} selectors
     * Standard DOM selectors.
     *
     * @returns {ControlledElement}
     * One controlled element matching the selectors.
     */
    EController.prototype.findOne = function (selectors) {
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
     * This method searches through DOM, as it needs to iterate over child elements.
     * And because of that, even though it searches through just a sub-set of elements,
     * it often can be way slower than the global {@link ERoot#findControllers ERoot.findControllers} method.
     *
     * @param {string} ctrlName
     * Controller name to search by.
     *
     * @returns {EController[]}
     * List of found initialized controllers.
     *
     * @see {@link ERoot#findControllers ERoot.findControllers}
     */
    EController.prototype.findControllers = function (ctrlName) {
        var cn = parseControllerName(ctrlName);
        var s = '[data-e-bind*="' + cn + '"],[e-bind*="' + cn + '"]'; // selectors
        return this.find(s).filter(pick).map(pick);

        function pick(e) {
            // This also caters for dynamically created controlled
            // elements that haven't been initialized yet:
            return e.controllers && e.controllers[cn];
        }
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
    EController.prototype.send = function (data) {
        this.verifyInit('send');
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
     * @param {function} [cb]
     * Optional callback to receive the response from method onReceive.
     */
    EController.prototype.post = function (data, cb) {
        this.verifyInit('post');
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
     * @method EController#verifyInit
     * @private
     * @description
     * Verifies that this controller has been initialized, or else throws an error.
     *
     * This method is for internal use only.
     *
     * @param {string} m
     * Name of the method that requires verification.
     *
     * @returns {EController[]}
     * Controllers linked to the element.
     */
    EController.prototype.verifyInit = function (m) {
        var c = this.node.controllers;
        if (!c) {
            throw new Error('Method "' + m + '" cannot be used before initialization.');
        }
        return c;
    };

    /**
     * Sets the default root name, plus the alternative root name, if it is specified.
     */
    (function () {
        window.excellent = root; // default root name
        var e = find('[data-e-root],[e-root]');
        if (e.length) {
            if (e.length > 1) {
                throw new Error('Multiple e-root elements are not allowed.');
            }
            var name = getAttribute(e[0], 'data-e-root', 'e-root');
            if (!validJsVariable(name)) {
                throw new Error('Invalid ' + jStr(name) + ' root name specified.');
            }
            window[name] = root; // alternative root name
        }
    })();

})();
