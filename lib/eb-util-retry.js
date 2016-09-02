(function(window) {
    'use strict';

    /**
     * Helper for implementing retries with backoff. Initial retry
     * delay is 250ms, increasing by 2x (+jitter) for subsequent retries
     * @param {Object} [options]
     * @param {Number} [options.startInterval] start interval of the backoff. The initial value. Default 250ms.
     * @param {Number} [options.maxInterval] maximum waiting time, after reaching this point, backoff is not increased.
     * @param {Number} [options.maxAttempts] maximum number of attempts before failing. -1 by default = do not fail
     * @param {Number} [options.onFail] callback to call when maximum number of attempts was reached.
     * @param {Function} [options.logger] Logging function for event logging.
     * @constructor
     */
    var RetryHandler = function(options) {
        var nop = function(){};
        var def = function(val, def){
            return typeof val === 'undefined' ? def : val;
        };

        options = options || {};
        this.startInterval = def(options.startInterval, 250); // Start at 250ms - quick retry
        this.interval      = this.startInterval;
        this.maxInterval = def(options.maxInterval, 60 * 1000); // Don't wait longer than a minute
        this.maxAttempts = def(options.maxAttempts, -1);
        this.onFail = options.onFail || nop;
        this.logger = options.logger || nop;
        this.curAttempts = 0;
        this.curTimer = undefined;  // current setTimeout timer value. For cancellation.
    };

    /**
     * Invoke the function after waiting
     *
     * @param {function} fn Function to invoke
     */
    RetryHandler.prototype.retry = function(fn) {
        if (this.limitReached()){
            this.logger("Retry: max number reached");
            this.onFail(this);
            return;
        }

        var curInterval = this.interval;
        this.curTimer = setTimeout(fn, curInterval);
        this.logger("Retry: next attempt in: " + curInterval);

        this.interval = this.nextInterval_();
        this.curAttempts += 1;
        return curInterval;
    };

    /**
     * Cancels currently waiting back-off.
     */
    RetryHandler.prototype.cancel = function() {
        if (this.curTimer) {
            clearTimeout(this.curTimer);
            this.curTimer = undefined;
        }
    };

    /**
     * Reset the counter (e.g. after successful request.)
     */
    RetryHandler.prototype.reset = function() {
        this.cancel();
        this.interval = this.startInterval;
        this.curAttempts = 0;
    };

    /**
     * Returns number of attempts.
     * @returns {number}
     */
    RetryHandler.prototype.numAttempts = function(){
        return this.curAttempts;
    };

    /**
     * Returns true if the limit on maximum number of attempts was reached.
     * @returns {boolean}
     */
    RetryHandler.prototype.limitReached = function(){
        return this.maxAttempts >= 0 && this.maxAttempts <= this.curAttempts;
    };

    /**
     * Calculate the next wait time.
     * @return {number} Next wait interval, in milliseconds
     *
     * @private
     */
    RetryHandler.prototype.nextInterval_ = function() {
        var interval = this.interval * 2 + this.getRandomInt_(0, 1000);
        return Math.min(interval, this.maxInterval);
    };

    /**
     * Get a random int in the range of min to max. Used to add jitter to wait times.
     *
     * @param {number} min Lower bounds
     * @param {number} max Upper bounds
     * @private
     */
    RetryHandler.prototype.getRandomInt_ = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    /**
     * export to either browser or node.js
     */
    if (typeof exports !== "undefined") {
        exports = module.exports = RetryHandler;
    }
    else {
        window.RetryHandler = RetryHandler;

        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    RetryHandler: RetryHandler
                };
            });
        }
    }
})(typeof window === "undefined" ? this : window);

