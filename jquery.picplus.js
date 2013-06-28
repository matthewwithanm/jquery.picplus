/*jslint browser: true, nomen: true, todo: true */
(function ($, window, document) {
    'use strict';


    var P, PicPlus, WindowWatcher, $win, ResizeWatcher, resizeWatcher,
        MQL_DATA = 'picplus-mql',
        ACTIVE_CLASS = 'picplus-active',
        Autoload = {
            IMMEDIATE: 'immediate',
            LAZY: 'lazy',
            NONE: 'none'
        };


    WindowWatcher = function () {};
    WindowWatcher.prototype = {
        initialize: function () {
            if (!$win) { $win = $(window); }
            this.handler = $.proxy(this.handler, this);
            this.items = [];
        },

        add: function (item) {
            if (this.items.indexOf(item) === -1) {
                this.items.push(item);
                if (this.items.length === 1) {
                    // This is the first item. Add a listener.
                    $win.on(this.event, this.handler);
                }
            }
        },

        remove: function (item) {
            var index = this.items.indexOf(item);
            if (index !== -1) {
                this.items.splice(index, 1);
                if (this.items.length === 0) {
                    // That was the last item. Remove the listener.
                    $win.off(this.event, this.handler);
                }
            }
        },

        handler: function () {
            var i;
            for (i = this.items.length - 1; i >= 0; i -= 1) {
                this.callback(this.items[i]);
            }
        }
    };


    ResizeWatcher = function () {};
    ResizeWatcher.create = function () {
        var w = new ResizeWatcher();
        w.initialize.apply(w, arguments);
        return w;
    };
    ResizeWatcher.prototype = new WindowWatcher();
    ResizeWatcher.prototype.event = 'resize';
    ResizeWatcher.prototype.callback = function (el) {
        el.load();
    };


    P = PicPlus = function () {};
    PicPlus.prototype = {

        defaultOptions: {
            // When should the image be loaded?
            autoload: Autoload.IMMEDIATE,

            // Does the image change size when the browser window does?
            responsive: false
        },

        initialize: function ($el, options) {
            this.$el = $el;
            this.options = $.extend({}, this.defaultOptions, this.getHtmlOptions(), options);

            if (this.$el.is('[data-src]')) {
                // Shorthand version
                this.$sources = this.$el;
            } else {
                this.$sources = this.$el.find('[data-src]');
            }

            this._setupMediaQueries();

            if (this.options.responsive && this.$sources.length > 1) {
                // Unfortunately, we can't use MediaQueryList.addListener
                // because if multiple sources match, we need to recalculate
                // to find the *first* match.
                if (!resizeWatcher) {
                    resizeWatcher = ResizeWatcher.create();
                }
                resizeWatcher.add(this);
            }
            if (this.options.autoload === Autoload.IMMEDIATE) {
                this.load();
            }
            return this;
        },

        // Create a media query list for each source.
        _setupMediaQueries: function () {
            var $el, mql, media;
            if (!window.matchMedia) {
                return;
            }

            this.$sources.each(function (i, el) {
                $el = $(el);
                media = $el.attr('data-media');
                if (media) {
                    mql = window.matchMedia(media);
                    $el.data(MQL_DATA, mql);
                }
            });
        },

        getHtmlOptions: function () {
            var attrs = this.$el[0].attributes;
            return {
                autoload: attrs['data-autoload'],
                alt: attrs.alt
            };
        },

        // Load the appropriate source.
        load: function () {
            var $source, i, media, mql;
            // Iterate in reverse order so that later sources have higher
            // priority.
            for (i = this.$sources.length - 1; i >= 0; i -= 1) {
                $source = this.$sources.eq(i);
                media = $source.attr('data-media');
                mql = $source.data(MQL_DATA);
                if (!media || (window.matchMedia && mql.matches)) {
                    // We should load this source.
                    this._loadSource($source);
                    break;
                }
            }

            return this;
        },

        onImageLoad: function (img, $source) {
            // Make sure this is the image we were waiting for.
            if (!(this._loadingSource && this._loadingSource[0] === $source[0])) {
                return;
            }
            this._loadingSource = null;
            img.onload = null;
            this.showImage(img, $source);
        },

        // Show the provided image, for the provided source element.
        showImage: function (img, $source) {
            if (this.$sources.length > 1) {
                this.$sources
                    .hide()
                    .removeClass(ACTIVE_CLASS);
            }
            if (!img.parentNode) {
                $source[0].appendChild(img);
            }
            $source
                .addClass(ACTIVE_CLASS)
                .show();
        },

        // Load the source represented by the provided element.
        _loadSource: function ($source) {
            var src, alt,
                img = $source.data('image');

            if (img) {
                if (img.complete) {
                    this.showImage(img, $source);
                    return;
                }

                // It's already loading. Just let it finish.
                return;
            }

            src = $source.attr('data-src');
            img = new Image();
            alt = $source.attr('data-alt');
            if (alt === null || alt === undefined) {
                alt = this.$el.attr('data-alt');
            }
            img.alt = alt;
            $source.data('image', img);
            this._loadingSource = $source;
            img.onload = $.proxy(this.onImageLoad, this, img, $source);
            img.src = src;
        },

        destroy: function () {
            if (resizeWatcher) {
                resizeWatcher.remove(this);
            }
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

    $.picplus = function (opts) {
        $('[data-picplus]').picplus(opts);
    };

    $.picplus.config = function (opts) {
        // global config opts. for example, how many images to load at once.
    };

}(this.jQuery, window, document));
