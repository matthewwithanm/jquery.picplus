/*jslint browser: true, nomen: true, todo: true */
(function ($) {
    'use strict';

    $.picplus.config().plugins.push({
        initialize: function (picplus) {
            var watcher = window.scrollMonitor.create(picplus.$el[0]);
            watcher.enterViewport(function () {
                picplus.load();
            });
        }
    });

}(this.jQuery));
