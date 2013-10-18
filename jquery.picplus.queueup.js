/*jslint browser: true, nomen: true, todo: true */
(function ($, queueup) {
    'use strict';

    var loadqueue;  // a 'global' loadqueue for every instance of picplus.

    $.picplus.config().plugins.push({
        initialize: function (picplus) {
            picplus.loadSource = function (src, opts) {
                var promise;
                if (!loadqueue) {
                    loadqueue = queueup();
                }
                promise = loadqueue.load(src, opts);
                loadqueue.start();
                return promise;
            };
            picplus._loadSource = function ($source) {
                var promise = $source.data('promise');
                // If this source is already pending, promote it.
                if (promise && promise.state() === 'pending') {
                    return promise.promote();
                }
                return $.picplus.PicPlus.prototype._loadSource.call(this, $source);
            };
        }
    });

}(this.jQuery, this.queueup));
