/// <reference path="/js/jquery-1.8.0.min.js"/>
jQuery(function ($) {
    "use strict";
    (function () {
        var matchMedia = window.matchMedia || window.msMatchMedia || window.mozMatchMedia || window.webkitMatchMedia, height,
            menuList = $("#menuList"), bodyContent = $("#bodyContent"), menuBtn = $("#menuBtn"), isWide = false, isMenuDown = false,
            menuDown = function () {
                if (isMenuDown) return;
                isMenuDown = true;
                bodyContent.css("transform", "translate3d(0," + height + "px,0)");
            }, menuUp = function () {
                if (!isMenuDown) return;
                isMenuDown = false;
                bodyContent.css("transform", "none");
            }, mediaListener = function (q) {
                if (q.matches) {
                    bodyContent.css("margin-top", 0);
                    menuUp();
                } else {
                    height = menuList.height();
                    bodyContent.css("margin-top", -height + "px");
                }
                isWide = q.matches;
            }, mq;
        if (typeof matchMedia == "function") {
            $("body").addClass("has-matchmedia");
            mq = matchMedia("screen and (min-width:40em)");
            mq.addListener(mediaListener);
            mediaListener(mq);
            menuBtn.on("click", function () {
                if (!isWide) {
                    if (isMenuDown) {
                        menuUp();
                    } else {
                        menuDown();
                    }
                }
                return false;
            })
        }
    })();
});