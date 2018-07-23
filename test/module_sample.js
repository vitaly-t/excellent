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

    function myModuleName(/* self */) {
        /*
        * Can do stuff here, may also use service here
        * */

        this.controller1 = function () {
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

    e.addModule('myModuleName', myModuleName);

})(excellent);
