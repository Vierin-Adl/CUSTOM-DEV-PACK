/**
 * creative/remote-navigation.js — CTV remote key-to-action mapping
 *
 * Maps SIMID event names and browser KeyboardEvent.key values to plain
 * developer-defined actions: 'left', 'right', 'up', 'down', 'ok'.
 *
 * No SIMID, no VPAID, no DOM knowledge.
 *
 * Usage:
 *   var keys = new RemoteKeys();
 *   keys.mapKey('left',  function () { ... });
 *   keys.mapKey('right', function () { ... });
 *   keys.mapKey('up',    function () { ... });
 *   keys.mapKey('down',  function () { ... });
 *   keys.mapKey('ok',    function () { ... });
 *
 *   // called by app.js with the raw input payload — dev never calls this
 *   keys.handle(payload);
 */

// eslint-disable-next-line no-unused-vars
var RemoteKeys = (function () {
    'use strict';

    var KEY_ALIASES = {
        left:  ['Creative:navigateLeft', 'ArrowLeft'],
        right: ['Creative:navigateRight', 'ArrowRight'],
        up:    ['Creative:navigateUp', 'ArrowUp'],
        down:  ['Creative:navigateDown', 'ArrowDown'],
        ok:    ['Creative:ok', 'Enter']
    };

    var LEGACY_ALIASES = {
        prev: 'left',
        next: 'right'
    };

    function RemoteKeys() {
        this._handlers = {};
    }

    RemoteKeys.prototype.mapKey = function (action, callback) {
        this._handlers[action] = callback;
        return this; // chainable: keys.map('prev', fn).map('next', fn)
    };

    RemoteKeys.prototype.map = function (action, callback) {
        return this.mapKey(LEGACY_ALIASES[action] || action, callback);
    };

    RemoteKeys.prototype.handle = function (payload) {
        var input = (payload && payload.mapped) || (payload && payload.key) || '';
        if (!input) return false;

        var actions = Object.keys(KEY_ALIASES);
        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            // payload.mapped already carries the action name ('left', 'right', …)
            // — accept it as well as the raw SIMID / KeyboardEvent aliases.
            if (action === input || KEY_ALIASES[action].indexOf(input) !== -1) {
                if (typeof this._handlers[action] === 'function') {
                    this._handlers[action]();
                }
                return true;
            }
        }
        return false;
    };

    return RemoteKeys;
})();
