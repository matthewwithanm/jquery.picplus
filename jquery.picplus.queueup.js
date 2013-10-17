/*jslint browser: true, nomen: true, todo: true */
(function ($, queueup) {
    'use strict';

    var loadqueue,
        queueupLoad;

    queueupLoad = function (src, opts) {
        var promise;
        if (!loadqueue) {
            loadqueue = queueup();
        }
        promise = loadqueue.load(src, opts);
        loadqueue.start();
        return promise;
    };

    $.picplus.config({
        loadSource: queueupLoad
    });

}(this.jQuery, this.queueup));
