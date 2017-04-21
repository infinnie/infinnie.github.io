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
        var img = $(that).find("img"), cur = current, data = img.data("original") || {};
        if (current !== null) {
            current = null;
            $(body).removeClass("zoomed");

            img.css("WebkitTransform", data.unprefixed).css("transform", data.unprefixed);
            setTimeout(function () {
                if (img) {
                    img.remove();
                }
                if (cur !== null) {
                    $(cur).removeClass("zoom-hidden");
                }
            }, 350);
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
                width = $(this).data("size")[0], height = $(this).data("size")[1], img = new Image(),
                imgWidth = bcr.right - bcr.left, imgHeight = bcr.bottom - bcr.top,
                zoomedWidth, zoomedHeight, zoomedTop, zoomedLeft, unzoomedScale, unzoomedTx, unzoomedTy, originalTransform = { ms: "", unprefixed: "" };

            if (current != null) { return; }
            current = this;
            e.preventDefault();
            e.stopPropagation();

            if (width < maxZoomWidth && height < maxZoomHeight) {
                zoomedWidth = width;
                zoomedHeight = height;
            } else {
                if (width / height > maxZoomWidth / maxZoomHeight) {
                    zoomedWidth = maxZoomWidth;
                    zoomedHeight = imgHeight * maxZoomWidth / imgWidth;
                } else {
                    zoomedWidth = imgWidth * maxZoomHeight / imgHeight;
                    zoomedHeight = maxZoomHeight;
                }
            }
            zoomedLeft = pageXOffset + (innerWidth - zoomedWidth) / 2;
            zoomedTop = pageYOffset + (innerHeight - zoomedHeight) / 2;
            unzoomedScale = (bcr.right - bcr.left) / zoomedWidth;
            unzoomedTy = bcr.top + zoomedHeight * unzoomedScale / 2 - innerHeight / 2;
            unzoomedTx = bcr.left + zoomedWidth * unzoomedScale / 2 - innerWidth / 2;

            originalTransform.ms = "translate(" + unzoomedTx + "px," + unzoomedTy + "px) scale(" + unzoomedScale + ")";
            originalTransform.unprefixed = "translate3D(" + unzoomedTx + "px," + unzoomedTy + "px,0) scale(" + unzoomedScale + ")";
            // Zoom image in

            $(body).addClass("zoomed");
            img.src = src;
            img.style.cssText = "top:" + zoomedTop + "px;left:" + zoomedLeft + "px;height:" +
                zoomedHeight + "px;width:" + zoomedWidth + "px";
            img.style.msTransform = originalTransform.ms;
            img.style.transform = originalTransform.unprefixed;
            zoomOverlay.append(img);
            setTimeout(function () {
                $(img).css("msTransform", "").css("WebkitTransform", "translatez(0)").css("transform", "translateZ(0)").data("original", originalTransform);
            }, 50);
            setTimeout(function () {
                $(that).addClass("zoom-hidden");
            }, 70);
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
        }).on("keyup", function (e) {
            if (e.keyCode === 27) {
                setTimeout(function () {
                    zoomOut(zoomOverlay);
                }, 20);
            }
        }).trigger("resize");
    });
})(jQuery);
