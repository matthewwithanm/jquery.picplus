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
        }
    });

}(this.jQuery, this.queueup));
