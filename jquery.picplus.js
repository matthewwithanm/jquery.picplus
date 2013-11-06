/*jslint browser: true, nomen: true, todo: true */
(function ($, window, document) {
    'use strict';


    var PicPlus, loadImage, loadSvgInline,
        $win = $(window),
        MQL_DATA = 'picplus-mql',
        ACTIVE_CLASS = 'picplus-active';


    // The default image loader. The plugin has a list of image loaders and
    // passes each one the image attributes. The loader can choose whether it
    // wants to load the image or not. If it decides it should load the image,
    // it should return a promise which is resolved with a DOM element
    // representing the loaded image. Otherwise, it should return `null`.
    loadImage = function (src) {
        var deferred = $.Deferred(),
            img = new Image();
        img.onload = function () {
            deferred.resolve(img);
        };
        img.onerror = function () {
            deferred.reject();
        };
        img.src = src;
        return deferred.promise();
    };


    loadSvgInline = function (src) {
        var deferred = $.Deferred();
        $.ajax({
            url: src,
            dataType: 'text',
            success: function (data) {
                var svg = $(data);
                deferred.resolve(svg);
            },
            error: function () {
                deferred.reject();
            }
        });
        return deferred.promise();
    };


    PicPlus = function ($el, options) {
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
            this._onResize = $.proxy(this.load, this);
            $win.on('resize', this._onResize);
        }

        this._initializePlugins();

        if (this.options.autoload) {
            this.load();
        }
    };

    PicPlus.prototype = {

        defaultOptions: {
            // Should the image load as soon as possible?
            autoload: true,

            // Plugins to initialize with PicPlus.
            plugins: [],

            // Register loaders for the specified types.
            loaders: {
                jpeg: loadImage,
                jpg: loadImage,
                png: loadImage,
                gif: loadImage,
                svg: loadSvgInline
            },

            // Does the image change size when the browser window does?
            responsive: false,

            classNames: {
                loading: 'loading',
                loaded: 'loaded',
                sourceLoading: 'loading',
                sourceLoaded: 'loaded'
            },

            //called immediately after an image is successfully loaded
            loadSuccess: function(el) {},

            //called when an error occurs after an image is loaded
            loadError: function(el) {},

            //called when progress notifications are sent
            loadProgress: function(el) {},

            //called after the image is actually added to the dom
            afterShow: function(el) {}

        },

        // Loop through and initialize plugins.
        _initializePlugins: function () {
            var instance = this;
            $.each(this.options.plugins, function (i, plugin) {
                plugin.initialize(instance);
            });
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
            this.showImage($source, img);
            $source.trigger('picplus:load');
        },

        // Show the provided image, for the provided source element.
        showImage: function ($source, img) {
            if (this.$sources.length > 1) {
                this.$sources
                    .hide()
                    .removeClass(ACTIVE_CLASS);
            }
            if (img && !img.parentNode) {
                $source.eq(0).append(img);
            }
            $source
                .removeClass(this.options.classNames.sourceLoading)
                .addClass(this.options.classNames.sourceLoaded)
                .addClass(ACTIVE_CLASS)
                .show();
            this.$el
                .removeClass(this.options.classNames.loading)
                .addClass(this.options.classNames.loaded);

            this.options.afterShow(img);
        },

        // Load the source represented by the provided element.
        _loadSource: function ($source) {
            var src, alt, imgAttrs, type,
                self = this,
                promise = $source.data('promise');

            if (promise) {
                if (promise.state() === 'resolved') {
                    this.showImage($source);
                }

                // TODO: Should promote it to top of queue.
                return;
            }

            // Update the classes.
            this.$el
                .removeClass(this.options.classNames.loaded)
                .addClass(this.options.classNames.loading);
            $source
                .removeClass(this.options.classNames.sourceLoaded)
                .addClass(this.options.classNames.sourceLoading);

            src = $source.attr('data-src');
            alt = $source.attr('data-alt');
            type = $source.attr('data-type');
            if (alt === null || alt === undefined) {
                alt = this.$el.attr('data-alt');
            }

            imgAttrs = {alt: alt};

            promise = this.loadSource(src, {type: type});

            if (!promise) {
                $.error('No loader found for image.');
            }

            promise.then(function (el) {
                    $(el).attr(imgAttrs);
                    self.options.loadSuccess(el);
                },
                this.options.loadError,
                this.options.loadProgress
            );

            $source.data('promise', promise);
            this._loadingSource = $source;
            promise.done(function (img) {
                self.onImageLoad(img, $source);
            });
        },

        loadSource: function (src, opts) {
            var m, ext, loader,
                type = opts.type;
            if (!type) {
                m = src.match(/.*\.(.+)(\?.*)?(#.*)?$/i);
                ext = m && m[1].toLowerCase();
            }

            // Look for a loader registered for the given type.
            $.each(this.options.loaders, function (key, value) {
                if (key === ext || (type && type.match(new RegExp('^[^/]+/' + key + '(\\+.+)?$')))) {
                    loader = value;
                    return false;
                }
            });

            return loader && loader(src);    // TODO: Should we pass options?
        },

        destroy: function () {
            if (this._onResize) {
                $win.off('resize', this._onResize);
            }
        }
    };


    $.extend($.fn, {
        picplus: function (optionsOrMethod) {
            var returnValue = this,
                args = arguments;
            this.each(function (i, el) {
                var $el = $(el),
                    plugin = $el.data('picplusInstance'),
                    method = typeof optionsOrMethod === 'string' ? optionsOrMethod : null,
                    options = method === null ? optionsOrMethod || {} : {};

                if (!plugin) {
                    if (method) {

                        $.error('You can\'t call the picplus method "' + method
                                + '" without first initializing the plugin by calling '
                                + 'picplus() on the jQuery object.');
                    } else {
                        plugin = new PicPlus($el, options);
                        $el.data('picplusInstance', plugin);
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

    $.extend($.picplus, {
        config: function (opts) {
            if (opts) {
                $.extend(PicPlus.prototype.defaultOptions, opts);
            }
            return PicPlus.prototype.defaultOptions;
        },
        PicPlus: PicPlus
    });

}(this.jQuery, window, document));
