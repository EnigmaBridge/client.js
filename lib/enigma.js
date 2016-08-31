/*!
 * EnigmaBridge core
 * @author Dusan Klinec (ph4r05)
 * @license GPL3.
 */

/*jshint globalstrict: true*/
/*jshint node: true */
'use strict';

var eb = require('./eb-core');

/**
 * export to either browser or node.js
 */
if (typeof exports !== "undefined") {
    exports = module.exports = eb;
}
else {
    window.eb = eb;

    if (typeof define === "function" && define.amd) {
        define(function() {
            return {
                eb: eb
            };
        });
    }
}

console.log("DONE: " + eb);