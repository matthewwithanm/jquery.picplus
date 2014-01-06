/*jslint browser: true, nomen: true, todo: true */
(function ($, window) {
    'use strict';


    var PicPlus, loadImage, loadSvgInline,
        $win = $(window),
        MQL_DATA = 'picplus-mql',
        LOADING_DATA = 'picplus-loading',
        LOADED_DATA = 'picplus-loaded',
        ACTIVE_CLASS = 'picplus-active',
        INACTIVE_CLASS = 'picplus-inactive';


    // The default image loader. The plugin has a list of image loaders and
    // passes each one the image attributes. The loader can choose whether it
    // wants to load the image or not. If it decides it should load the image,
    // it should return a promise which is resolved with a DOM element
    // representing the loaded image. Otherwise, it should return `null`.
    loadImage = function (opts, done, fail) {
        var img = new Image();
        img.onload = function () {
            if (this.naturalWidth !== undefined && (this.width + this.height === 0)) {
                fail(new Error("Image <" + opts.url + "> could not be loaded."));
                return;
            }
            done(img);
        };
        img.onerror = function (err) {
            fail(err);
        };
        img.src = opts.url;
    };


    loadSvgInline = function (opts, done, fail) {
        $.ajax({
            url: opts.url,
            dataType: 'text',
            success: function (data) {
                var svg = $(data);
                done(svg);
            },
            error: function (xhr, status, err) {
                fail(err);
            }
        });
    };


    PicPlus = function ($el, options) {
        var self = this;
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

        this.pluginInstances = [];
        $.each(this.options.plugins, function (i, plugin) {
            self.pluginInstances.push(plugin.create(self));
        });
        this._callPluginMethod('initialize');

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

            // Register default types that can be loaded.
            types: {
                jpeg: 'image',
                jpg: 'image',
                png: 'image',
                gif: 'image',
                svg: 'image'
            },

            // Register loaders with names so that they can be specified in
            // options (to override the default).
            loaders: {
                'image': loadImage,
                'inline-svg': loadSvgInline
            },

            // Does the image change size when the browser window does?
            responsive: false,

            // By default, picplus will use $.show() and $.hide() to show active
            // sources. However, because of how the CSS "display" property
            // works, this may not give the desired results. In those cases, you
            // can set this option to `false` and style the elements using the
            // active and inactive classes.
            toggleDisplay: true,

            classNames: {
                loading: 'loading',
                loaded: 'loaded',
                sourceLoading: 'loading',
                sourceLoaded: 'loaded'
            }
        },

        // Invoke a method on the plugins for this instance.
        _callPluginMethod: function (method) {
            var args = Array.prototype.slice.call(arguments, 1);
            $.each(this.pluginInstances, function (i, plugin) {
                if (plugin && typeof plugin[method] === 'function') {
                    plugin[method].apply(plugin, args);
                }
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

        // Check to see if a particular source is loaded.
        isLoaded: function ($source) {
            return $source.data(LOADED_DATA) || false;
        },

        // Load the appropriate source.
        load: function () {
            var $source, i, media, mql, len;
            for (i = 0, len = this.$sources.length; i < len; i += 1) {
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
            $source.trigger('picplus:load');

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
                    .addClass(INACTIVE_CLASS)
                    .removeClass(ACTIVE_CLASS);
                if (this.options.toggleDisplay) {
                    this.$sources.hide();
                }
            }
            if (img && !img.parentNode) {
                $source.eq(0).append(img);
            }
            $source
                .removeClass(this.options.classNames.sourceLoading)
                .addClass(this.options.classNames.sourceLoaded)
                .removeClass(INACTIVE_CLASS)
                .addClass(ACTIVE_CLASS);
            if (this.options.toggleDisplay) {
                $source.show();
            }
            this.$el
                .removeClass(this.options.classNames.loading)
                .addClass(this.options.classNames.loaded);
        },

        // Load the source represented by the provided element.
        _loadSource: function ($source, done, fail) {
            var src, alt, imgAttrs, type, loader, onDone, onFail, opts,
                self = this,
                alreadyLoaded = $source.data(LOADED_DATA);

            if (alreadyLoaded) {
                this.showImage($source);
                return;
            }

            // Update the classes.
            this.$el
                .removeClass(this.options.classNames.loaded)
                .addClass(this.options.classNames.loading);
            $source
                .removeClass(this.options.classNames.sourceLoaded)
                .addClass(this.options.classNames.sourceLoading);

            this._loadingSource = $source;

            // If the source is already loading, don't load it again.
            if ($source.data(LOADING_DATA)) {
                return;
            }

            $source.data(LOADING_DATA, true);
            src = $source.attr('data-src');
            alt = $source.attr('data-alt');
            type = $source.attr('data-type');
            loader = $source.attr('data-loader');
            if (alt === null || alt === undefined) {
                alt = this.$el.attr('data-alt');
            }

            imgAttrs = {alt: alt};

            onFail = fail || $.noop;

            onDone = done || function (el) {
                $source
                    .data(LOADING_DATA, false)
                    .data(LOADED_DATA, true);
                $(el).attr(imgAttrs);
                self.onImageLoad(el, $source);
                if (typeof done === 'function') {
                    done(el);
                }
            };

            opts = {url: src, type: type, loader: loader, $el: $source};
            opts.loader = this.getLoader(opts);

            this.loadSource(opts, onDone, onFail);
        },

        getLoader: function (opts) {
            var m, ext,
                self = this,
                url = opts.url,
                loader = opts.loader,
                type = opts.type;

            if (loader) {
                if (typeof loader === 'function') {
                    return loader;
                }
                return this.options.loaders[loader] || $.error('No loader registered with name "' + loader + '".');
            }

            if (!type) {
                m = url.match(/.*\.(.+)(\?.*)?(#.*)?$/i);
                ext = m && m[1].toLowerCase();
            }

            // Look for a loader registered for the given type.
            $.each(this.options.types, function (key, value) {
                if (key === ext || (type && type.match(new RegExp('^[^/]+/' + key + '(\\+.+)?$')))) {
                    loader = self.options.loaders[value];
                    return false;
                }
            });

            if (!loader) {
                $.error('No loader found for image.');
            }

            return loader;
        },

        loadSource: function (opts, done, fail) {
            return opts.loader(opts, done, fail);  // TODO: Should we pass options?
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
        addPlugin: function (plugin) {
            var plugins = PicPlus.prototype.defaultOptions.plugins;
            if (plugins.indexOf(plugin) === -1) {
                plugins.push(plugin);
            }
        },
        config: function (opts) {
            if (opts) {
                $.extend(PicPlus.prototype.defaultOptions, opts);
            }
            return PicPlus.prototype.defaultOptions;
        },
        PicPlus: PicPlus
    });

}(this.jQuery, window));
