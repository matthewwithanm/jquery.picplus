jquery.picplus
==============

Take control of your images. By [matthewwithanm] and [lettertwo].

[matthewwithanm]: http://github.com/matthewwithanm
[lettertwo]: http://github.com/lettertwo


What?
-----

- [Load different images based on media queries](#responsive-images)
- [Load SVGs inline so they can be interactive and styled using CSS](#embedded-svgs)
- [Lazyload images when they're scrolled into the viewport](#lazyloading)
- [Queue loads and promote images when they become more important](#loading)


Getting Started
---------------

To get started, `bower install jquery.picplus` or download the file from [the
GitHub page][1]. Include a `<script>` tag in your HTML that points to it.

[1]: http://github.com/matthewwithanm/jquery.picplus


The Basics
----------

PicPlus uses custom markup to describe images:

```html
<span data-picplus
    data-src="myimage.jpg"
    data-alt="An awesome picture"></span>
```

Use this markup anywhere you would normally use an `<img>` tag. Then intialize
the jQuery plugin in your document ready handler:

```javascript
$(document).ready(function () {
    $('[data-picplus]').picplus();
});
```


Reponsive Images
----------------

The responsive image markup is based on [Scott Jehl's awesome picturefill
project][2]:

```html
<span data-picplus data-alt="An awesome picture">
    <span data-src="extralarge.jpg" data-media="(min-width: 1000px)"></span>
    <span data-src="large.jpg"      data-media="(min-width: 800px)"></span>
    <span data-src="medium.jpg"     data-media="(min-width: 400px)"></span>
    <span data-src="small.jpg"></span>

    <!-- Fallback content for non-JS browsers. Same img src as the initial, unqualified source element. -->
    <noscript>
        <img src="small.jpg" alt="An awesome picture" />
    </noscript>
</span>
```

However, there's one major difference: sources are evaluated in order, instead
of in reverse order. See [this issue][3] for more discussion.

[2]: https://github.com/scottjehl/picturefill
[3]: https://github.com/scottjehl/picturefill/issues/79


Embedded SVGs
-------------

SVGs are awesome and especially important for devices with high pixel densities
(retina displays). Unfortunately, a lot of the cool things you can do with SVGs
[don't work when you load them with img tags][3]. You could embed them directly
in your HTML, but that bloats the size of your markup and prevents browsers from
caching them. With PicPlus, though, you can just include them like normal
images and they'll be loaded and inserted into your document. That means you can
style them with CSS, and script them with JavaScript. Just add a `data-loader`
attribute:

```html
<span data-picplus
    data-loader="inline-svg"
    data-src="myimage.svg"
    data-alt="An awesome picture"></span>
```

[3]: http://www.schepers.cc/svg/blendups/embedding.html


### A Note on CORS

This technique involves loading SVGs with XMLHttpRequests, making it subject to
[CORS] restrictions. This usually isn't a huge deal, but if your SVGs aren't
loading, this is the first thing you should troubleshoot. If you want to support
IE9, you'll need to include a CORS-supporting polyfill like
[jQuery-ajaxTransport-XDomainRequest].

[CORS]: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
[jQuery-ajaxTransport-XDomainRequest]: https://github.com/MoonScript/jQuery-ajaxTransport-XDomainRequest


Lazy Loading
------------

Lazy loading images when they enter the viewport can be a great way to optimize
your page load. To get this behavior, simply include the [picplus.lazyload]
plugin, and set the `autoload` option to false:

```javascript
$(['data-picplus']).picplus({autoload: false});
```


Loading
-------

Normal `<img>` tags don't give you much control over how your images are loaded:
all the images on your page are loaded right away, in parallel, when your page
loads. For convenience's sake, this is how PicPlus works by default too, but you
aren't tied to it. By setting the `autoload` option to `false`, you can tell
PicPlus not to load images immediately. Then your application can call the
`load()` method when it's ready to load the image.

```javascript
$(['data-picplus']).picplus({autoload: false});

// Later...
$('.my-picture').picplus('load');
```

That's cool by itself, but it's only the tip of the iceberg. If you use the
[queueup plugin][picplus.queueup], images will be placed into a loading queue when you call
`load()`. Subsequent calls to `load()` will promote the image in the queue. The
queueup plugin can be used whether `autoload` is `true` or `false`. If
`autoload` is `true` (the default), and you use both the queueup and
[lazyload](#lazyloading) plugins, all of your images will be loaded
automatically in the background, but the ones in the viewport will always have
priority!

[picplus.lazyload]: https://github.com/matthewwithanm/jquery.picplus.lazyload
[picplus.queueup]: https://github.com/matthewwithanm/jquery.picplus.queueup
