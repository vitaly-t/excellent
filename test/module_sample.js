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

    function myModuleName() {
        /*
        * Can do stuff here, may also use service here
        * */

        return {
            controller1: function (ctrl) {
                console.log('Inside controller myModuleName.controller1');
                ctrl.onReceive = function (data, sender) {
                    /* we got data */

                    /* and we can return data to the sender, if we want */
                };
            },
            controller2: function (ctrl) {
                ctrl.onReceive = function (data, sender) {
                    /* we got data */

                    /* and we can return data to the sender, if we want */
                };
            },
            special: {
                deepCtrl: function (ctrl) {
                    console.log('Inside controller myModuleName.special.deepCtrl');
                    ctrl.onReceive = function (data, sender) {
                        /* we got data */

                        /* and we can return data to the sender, if we want */
                    };
                }
            }
        };
    }

    e.addModule('myModuleName', myModuleName);

})(excellent);
