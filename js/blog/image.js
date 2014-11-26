/// <reference path="/js/jquery-1.8.0.min.js"/>
$(function () {
    "use strict";
    // Responsive images.
    var imgVer = (function () {
        var scr = window.screen, dpr = window.devicePixelRatio ||
            (scr && scr.deviceXDPI && scr.deviceXDPI / scr.logicalXDPI) || 1,
            winWidth = $(window).width() * dpr;
        if (winWidth > 640) {
            return "large";
        }
        return "small";
    })();
    $("[data-role=image-container]").each(function () {
        var self = $(this),
            img = $("<img>").attr("alt", self.attr("data-alt") || "").attr("src",
                self.attr("data-src-" + imgVer) || self.attr("data-src-small")).attr("data-zoom",
                self.attr("data-zoom")).data("size",
                $.parseJSON(self.attr("data-size-" + imgVer) || self.attr("data-size-small")));
        self.after(img);
    });
});
// Image zooming
(function ($) {
    "use strict";
    function zoomOut(that) {
        /// <param name="that" type="HTMLElement"/>
        var img = $(that).find("img"), cur = current;
        if (current !== null) {
            current = null;
            $(body).removeClass("zoomed");
            img.css("transform", "none");
            setTimeout(function () {
                if (img) {
                    img.remove();
                }
                if (cur !== null) {
                    $(cur).removeClass("zoom-hidden");
                }
            }, 450);
        }
    }
    var body, zoomOverlay,
        maxZoomWidth = 0, maxZoomHeight = 0, current = null, supports = ("innerWidth" in window);
    $.fn.zoomable = function () {
        if (!supports) {
            $.fn.zoomable = function () { return this };
            return this;
        }
        this.on("click", function (e) {
            body = body || document.body;
            zoomOverlay = zoomOverlay || $("<div>").addClass("zoom-overlay").appendTo(body).append($("<div>").addClass("zoom-overlay-bg"));
            var src = this.src, bcr = this.getBoundingClientRect(), that = this,
                width = $(this).data("size")[0], height = $(this).data("size")[1], img = new Image();
            e.preventDefault();
            e.stopPropagation();
            // Zoom image in
            if (current != null) { return; }
            current = this;
            $(body).addClass("zoomed");
            img.src = src;
            img.style.cssText = "top:" + (pageYOffset + bcr.top) + "px;left:" + (pageXOffset + bcr.left) + "px;height:" +
                (bcr.bottom - bcr.top) + "px;width:" + (bcr.right - bcr.left) + "px";
            zoomOverlay.append(img);
            setTimeout(function () {
                $(that).addClass("zoom-hidden");
            }, 50);
            setTimeout(function () {
                var tx = (innerWidth - bcr.right - bcr.left) / 2, ty = (innerHeight - bcr.bottom - bcr.top) / 2, scale,
                    imgWidth = bcr.right - bcr.left, imgHeight = bcr.bottom - bcr.top;
                if (width < maxZoomWidth && height < maxZoomHeight) {
                    scale = width / imgWidth;
                } else {
                    scale = width / height > maxZoomWidth / maxZoomHeight ? maxZoomWidth / imgWidth : maxZoomHeight / imgHeight;
                }
                img.style.msTransform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
                img.style.transform = img.style.WebkitTransform = "translate3D(" + tx + "px," + ty + "px,0) scale(" + scale + ")";
            }, 50);
        }).addClass("zoomable");
        return this;
    };
    $(function () {
        if (!supports) return;
        body = body || document.body;
        zoomOverlay = zoomOverlay || $("<div>").addClass("zoom-overlay").appendTo(body).append($("<div>").addClass("zoom-overlay-bg"));
        $(zoomOverlay).on("click", function (e) {
            zoomOut(this);
        });
        $(window).on("resize", function () {
            maxZoomWidth = innerWidth - 80; maxZoomHeight = innerHeight - 80;
        }).on("scroll", function () {
            setTimeout(function () {
                zoomOut(zoomOverlay);
            }, 20);
        }).trigger("resize");
    });
})(jQuery);
