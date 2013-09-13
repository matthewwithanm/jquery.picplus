/*jslint browser: true, nomen: true, todo: true */
(function ($, window, document) {
    'use strict';


    var P, PicPlus, loadImage,
        LoadQueue, loadQueue,
        $win = $(window),
        MQL_DATA = 'picplus-mql',
        ACTIVE_CLASS = 'picplus-active',
        Autoload = {
            IMMEDIATE: 'immediate',
            LAZY: 'lazy',
            NONE: 'none'
        };


    // The default image loader. The plugin has a list of image loaders and
    // passes each one the image attributes. The loader can choose whether it
    // wants to load the image or not. If it decides it should load the image,
    // it should return a promise which is resolved with a DOM element
    // representing the loaded image. Otherwise, it should return `null`.
    loadImage = function (attrs) {
        var deferred = $.Deferred(),
            img = new Image();
        img.onload = function () {
            deferred.resolve(img);
        };
        $.extend(img, attrs);
        return deferred.promise();
    };


    LoadQueue = function () {};
    LoadQueue.create = function () {
        var lq = new LoadQueue();
        lq.items = [];
        lq.loaders = [loadImage];
        lq._onComplete = $.proxy(LoadQueue.prototype._onComplete, lq);
        return lq;
    };
    LoadQueue.prototype = {
        simultaneous: 3,
        _loadingCount: 0,
        _loadNext: function () {
            var nextItem;
            if (!this.items.length || this._loadingCount >= this.simultaneous) {
                return;
            }
            nextItem = this.items.pop();  // Load most recently queued first.
            this._loadingCount += 1;
            nextItem();
        },
        _onComplete: function () {
            this._loadingCount -= 1;
            this._loadNext();
        },
        load: function (imgAttrs) {
            var loadNow,
                self = this,
                deferred = $.Deferred(),
                promise = deferred.promise();

            // TODO: Support timeout
            loadNow = function () {
                var p;

                // Loop through the loaders until we find one to use.
                $.each(self.loaders, function (i, loader) {
                    p = loader(imgAttrs);
                    if (p) {
                        p
                            .then(deferred.resolve)
                            .then(self._onComplete);
                        return false;
                    }
                });

                if (!p) {
                    $.error('No loader found for image.', imgAttrs)
                }
            };

            this.items.push(loadNow);
            this._loadNext();
            return promise;
        }
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
                this._onResize = $.proxy(this.load, this);
                $win.on('resize', this._onResize);
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
            this.showImage($source, img);
        },

        // Show the provided image, for the provided source element.
        showImage: function ($source, img) {
            if (this.$sources.length > 1) {
                this.$sources
                    .hide()
                    .removeClass(ACTIVE_CLASS);
            }
            if (img && !img.parentNode) {
                $source[0].appendChild(img);
            }
            $source
                .addClass(ACTIVE_CLASS)
                .show();
        },

        // Load the source represented by the provided element.
        _loadSource: function ($source) {
            var src, alt, lq,
                self = this,
                promise = $source.data('promise');

            if (promise) {
                if (promise.state() == 'resolved') {
                    this.showImage($source)
                }

                // TODO: Should promote it to top of queue.
                return;
            }

            if (!loadQueue) {
                loadQueue = LoadQueue.create();
            }

            src = $source.attr('data-src');
            alt = $source.attr('data-alt');
            if (alt === null || alt === undefined) {
                alt = this.$el.attr('data-alt');
            }

            promise = loadQueue.load({src: src, alt: alt});
            $source.data('promise', promise);
            this._loadingSource = $source;
            promise.done(function (img) {
                self.onImageLoad(img, $source);
            });
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
