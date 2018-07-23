/* eslint-disable */

/*
    A service is a static protocol.

    Each registered service is called after the DOM has loaded,
    but before calling any controller, as controllers are typically
    using services.

    Within the root, each entry in .services will contain the value
    returned by the service's callback function.

* */
(function (e) {
    'use strict';

    function myServiceName(/* self */) {

        /*
        * DOM has loaded, but no controller executed yet
        * */

        /*
        * The service can do anything it wants here.
        * But it normally returns an object-namespace of the available functions.
        * */

        this.message = function () {
            return 'Hello World!';
        };

    }

    e.addService('myServiceName', myServiceName);

})(excellent);
