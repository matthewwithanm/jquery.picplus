/*jslint browser: true, nomen: true, todo: true */
(function ($, window, document) {
    'use strict';

    var P, PicPlus;

    P = PicPlus = function () {};


    PicPlus.prototype = {

        defaultOptions: {
        },

        initialize: function ($el, options) {
            this.$el = $el;
            this.options = $.extend({}, this.defaultOptions, options);
            return this;
        }
    };


    $.extend($.fn, {
        picplus: function (optionsOrMethod) {
            var returnValue = this,
                args = arguments;
            this.each(function (i, el) {
                var $el = $(el),
                    plugin = $el.data('picplus'),
                    method = typeof optionsOrMethod === 'string' ? optionsOrMethod : null,
                    options = method === null ? optionsOrMethod || {} : {};

                if (!plugin) {
                    if (method) {
                        $.error('You can\'t call the picplus method "' + method
                                + '" without first initializing the plugin by calling '
                                + 'picplus() on the jQuery object.');
                    } else {
                        plugin = new PicPlus().initialize($el, options);
                        $el.data('picplus', plugin);
                    }
                } else if (method) {
                    if (typeof plugin[method] !== 'function') {
                        $.error('Method "' + method + '" does not exist on jQuery.picplus');
                    } else {
                        // NOTE: If you call a method that returns a value, you will only get the result from the last item in the collection.
                        returnValue = plugin[method].apply(plugin, Array.prototype.slice.call(args, 1));
                    }
                }
            });
            return returnValue;
        }
    });
}(this.jQuery, window, document));
