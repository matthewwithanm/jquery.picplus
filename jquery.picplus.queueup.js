/*jslint browser: true, nomen: true, todo: true */
(function ($, queueup) {
    'use strict';

    var loadqueue,
        queueupLoad;

    queueupLoad = function (attrs) {
        var promise,
            src = attrs.src;
        if (!loadqueue) {
            loadqueue = queueup();
        }
        promise = loadqueue.load(src);
        loadqueue.start();
        return promise;
    };

    $.picplus.config({
        loaders: [queueupLoad]
    });

}(this.jQuery, this.queueup));
