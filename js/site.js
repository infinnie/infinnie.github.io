/// <reference path="/js/jquery-1.8.0.min.js"/>
(function ($) {
    "use strict";
    if (!$) return;
    $(document).on("click", "[data-turnon]", function (e) {
        var temp = $($(this).attr("data-turnon")).addClass("ui-on").trigger("turnon.ui").get(0);
        temp && temp.focus();
        e.preventDefault();
    }).on("click", "[data-dismiss]", function (e) {
        $($(this).attr("data-dismiss")).removeClass("ui-on").trigger("turnoff.ui");
        e.preventDefault();
    }).on("keyup", function (e) {
        if (27 === e.keyCode) {
            $(".ui-on").removeClass("ui-on").trigger("turnoff.ui");
        };
    });
})(window.jQuery);