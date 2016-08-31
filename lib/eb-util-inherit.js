(function(window) {
    'use strict';

    var ebextend = require('./eb-util-extend');
    function inherit(cur, parentClassOrObject, newPrototype ){
        if ( parentClassOrObject.constructor == Function )
        {
            //Normal Inheritance
            cur.prototype = new parentClassOrObject();
            cur.prototype.constructor = cur;
            cur.prototype.parent = parentClassOrObject.prototype;

            // Better for calling super methods. Avoids looping.
            cur.superclass = parentClassOrObject.prototype;
            cur.prototype = ebextend(this.prototype, newPrototype);

            // If we have inheritance chain A->B->C, A = root, A defines method x()
            // B also defines x = function() { this.parent.x.call(this); }, C does not defines x,
            // then calling x on C will cause infinite loop because this references to C in B.x() and this.parent is B in B.x()
            // not A as desired.
        }
        else
        {
            //Pure Virtual Inheritance
            cur.prototype = parentClassOrObject;
            cur.prototype.constructor = cur;
            cur.prototype.parent = parentClassOrObject;
            cur.superclass = parentClassOrObject;
        }
        return cur;
    }

    /**
     * export to either browser or node.js
     */
    if (typeof exports !== "undefined") {
        exports = module.exports = inherit;
    }
    else {
        window.inherit = inherit;

        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    extend: inherit
                };
            });
        }
    }
})(typeof window === "undefined" ? this : window);
