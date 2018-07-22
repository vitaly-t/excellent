(function (window) {
    'use strict';

    var exc = {};
    window.excellent = exc;

    var controllers = [];

    document.addEventListener('DOMContentLoaded', function () {
        controllers = document.querySelectorAll('[e-controller]');
    });

})(this);
