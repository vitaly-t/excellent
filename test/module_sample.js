/* eslint-disable */

/*
* The app that includes this module will be able to use:
* e-controller="myModuleName.controller1"
* e-controller="myModuleName.controller2"
* e-controller="myModuleName.special.deepCtrl"
*
* And the app can also alias the module's name:
* excellent.modules.myName = excellent.modules.someAwkwardName.
*
* But it must never rename the module, or other dependent modules
* will break.
*
* */
(function (e) {
    'use strict';

    // TODO: When a module includes a controller that wants to use
    // a controller from another module, how will this work?
    // A: The root needs to provide a method/way to check if that module is available.

    function myModule(/* self */) {
        /*
        * Can do stuff here, may also use service here
        *
        * Can also check if dependent modules are available.
        *
        * e.verifyDependencies(arrayOfModuleNames), returns names of modules
        * that are missing.
        *
        * PROBLEM: Modules list isn't available at this point.
        *
        * SOLUTION: Do not test it module-wide, as you may have only one
        * controller that needs, so best is to test it controller-wide only:
        *
        * ctrl.depends(['one', 'two', 'three']); that will throw, but? controller vs module?
        *
        * */

        this.controller1 = function () {
            console.log('fullname:', this.name);
            console.log('Inside controller myModuleName.controller1');
            this.onReceive = function (data, sender) {
                /* we got data */

                /* and we can return data to the sender, if we want */
            };
        };

        this.controller2 = function () {
            this.onReceive = function (data, sender) {
                /* we got data */

                /* and we can return data to the sender, if we want */
            };
        };

        this.special = {
            deepCtrl: function () {
                console.log('Inside controller myModuleName.special.deepCtrl');
                this.onReceive = function (data, sender) {
                    /* we got data */

                    /* and we can return data to the sender, if we want */
                };
            }
        };
    }

    e.addModule('myModule', myModule);

})(excellent);
