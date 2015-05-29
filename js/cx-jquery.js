/// <reference path="/js/jquery-1.8.0.min.js"/>

/// <var name="CX">CX version 0.025, whose name would get changed as it enters the alpha stage.</var>
var CX = (function ($) {
    "use strict";
    var expando = "__CX_" + (+new Date()), // We should expect it to be unique
    debug = true,
    createId = (function () {
        var maxid = 0;
        return function () {
            maxid = maxid + 1;
            return maxid;
        };
    })(), createNotifier = function () {
        var listeners = {}, notifier = {
            on: function (es, f) {
                /// <param name="es" type="String"/>
                es = es.replace(/^\s+|\s+$/g, "").split(/\s+/);
                var e, i, len = es.length;
                for (i = 0; i < len; i++) {
                    e = es[i];
                    if (!listeners[e]) {
                        listeners[e] = [];
                    }
                    listeners[e].push(f);
                }
                return notifier;
            }, notify: function (e) {
                var curListeners = listeners[e], len, i, args = Array.prototype.slice.call(arguments, 1);
                if (curListeners) {
                    len = curListeners.length;
                    for (i = 0; i < len; i++) {
                        curListeners[i].apply(this, args);
                    }
                }
                return notifier;
            }
        };
        return notifier;
    },

    isArray = $.isArray,

    specials = {
        "true": true,
        "false": false,
        "null": null
    },

    getProp = function (bound, prop) {
        return bound.get(prop) || specials[prop] || window[prop];
    },

    _CX = {
        App: createNotifier(),
        Binding: {
            create: function (crud, composers) {
                /// <param name="crud" type="Object">An object that contains CRUD functions</param>
                /// <param name="composers" type="Object">Composed getters and setters</params>
                crud = crud || {};
                var _CXStorage = {},
                    _init = function (data, dataExpandos, isCreate) {
                        if (!data || typeof data !== "object") {
                            throw new Error("Object required");
                        }
                        var key, obj = {},
                            dataCopy /* A deep copy of the param data */ = {},
                            notifier = createNotifier(), curExpando,
                            reserved = /^(?:on|notify|add|destroy|set)$/;
                        dataExpandos = dataExpandos || {};
                        if (data[expando]) {
                            return _CXStorage[data[expando]];
                        }
                        data[expando] = createId();
                        dataCopy[expando] = data[expando];
                        dataExpandos[data[expando]] = true;
                        for (key in data) {
                            // Skip expando key.
                            if (key !== expando) {
                                switch (typeof data[key]) {
                                    case "function": case "undefined":
                                        // Non-function values only.
                                        break;
                                    case "object":
                                        if (data[key] !== null) {
                                            curExpando = data[key][expando];
                                            if (!curExpando || !dataExpandos[curExpando]) {
                                                // Fix deep copy
                                                dataCopy[key] = _CX.Binding.create().init(data[key], dataExpandos);
                                                dataCopy[key].on("change destroy", function () {
                                                    notifier.notify("change", key, dataCopy[key]);
                                                });
                                            } else { // Circular reference and break.
                                                if (debug) {
                                                    console.log("Circular reference detected.");
                                                }
                                            }
                                            break;
                                        }
                                    default:
                                        if (reserved.test(key)) {
                                            if (debug) {
                                                console.log("Library functions should not be overridden.");
                                            }
                                            break;
                                        }
                                        dataCopy[key] = data[key];
                                }
                            }
                        }
                        obj.on = function () {
                            notifier.on.apply(notifier, arguments);
                            return obj;
                        };
                        obj.notify = function () {
                            notifier.notify.apply(notifier, arguments);
                            return obj;
                        }
                        obj.destroy = function () {
                            if (typeof crud.destroy === "function") {
                                crud.destroy.call(window, obj);
                            } else {
                                notifier.notify("destroy", dataCopy[expando]);
                            }
                        };
                        obj.set = function (key, value) {
                            if (reserved.test(key) || key === expando) {
                                if (debug) {
                                    console.log("Library functions should not be overridden.");
                                }
                                return obj;
                            }
                            if (composers && composers.set && typeof composers.set[key] == "function") {
                                composers.set[key].call(window, obj);
                                return obj;
                            }
                            if (typeof crud.update === "function") {
                                crud.update.call(window, dataCopy, obj, key, value);
                            } else {
                                dataCopy[key] = value;
                                notifier.notify("change", key, value);
                            }
                            return obj;
                        };
                        obj.get = function (key) {
                            if (composers && composers.get && typeof composers.get[key] == "function") {
                                return composers.get[key].call(window, obj);
                            }
                            return dataCopy[key];
                        };
                        obj.has = function (key) {
                            return key in dataCopy || key in composers.get || key in composers.set;
                        };
                        obj.getCXID = function () {
                            return obj[expando];
                        };
                        obj.toStatic = function () {
                            var key, ret = {};
                            for (key in dataCopy) {
                                if (key !== expando) {
                                    switch (typeof dataCopy[key]) {
                                        case "function":
                                            break;
                                        case "object":
                                            if (dataCopy[key] !== null) {
                                                ret[key] = dataCopy[key].toStatic();
                                            }
                                            break;
                                        default:
                                            ret[key] = dataCopy[key];
                                    }
                                }
                            }
                            return ret;
                        };
                        obj.toJSON = function () {
                            return obj.toStatic();
                        }
                        obj[expando] = data[expando];
                        if (isCreate && typeof crud.create === "function") {
                            crud.create.call(crud, dataCopy, obj);
                        } else {
                            obj.notify("init");
                        }

                        _CXStorage[obj[expando]] = obj;
                        return obj;
                    };
                return {
                    init: function (data) {
                        return _init(data, null, true);
                    }, read: function () {
                        var args = Array.prototype.slice.call(arguments);
                        args.unshift(function (data) {
                            return _init(data, null, false);
                        });
                        if (typeof crud.read === "function") {
                            return crud.read.apply(crud, args);
                        }
                    }
                }
            }, createSet: function (id, crud, composers) {
                /// <param name="id" type="String">The name of the optional ID property.
                /// If specified, the value of this property would become the key to the internal storage object.
                /// If not specified, the internal CX key would be used.</param>
                /// <param name="crud" type="Object">The CRUD methods for default binding.</param>
                /// <param name="composers" type="Object">Composed getters and setters for default binding.</params>
                var _set = {}, notifier = createNotifier(), len = 0, binder = _CX.Binding.create(crud, composers), obj = {
                    add: function (bound) {
                        /// <param name="bound" type="_CX.IntelliSenseCompat"/>
                        if (!bound[expando]) {
                            bound = binder.init(bound);
                        }
                        var key = id ? bound.get(id) : bound.getCXID();
                        if (!_set[key]) {
                            bound.on("change", function () {
                                notifier.notify("itemchange", key);
                            }).on("destroy", function () {
                                obj.removeAt(key);
                            });
                            _set[key] = bound;
                            len++;
                            notifier.notify("itemadd", key);
                        }
                        return obj;
                    }, find: function (key) {
                        return _set[key];
                    }, removeAt: function (key) {
                        if (!_set[key]) { return obj; }
                        var toRemove = _set[key];
                        delete _set[key];
                        len--;
                        notifier.notify("itemremove", key, toRemove);
                        return obj;
                    }, on: function () {
                        notifier.on.apply(notifier, arguments);
                        return obj;
                    }, notify: function () {
                        notifier.notify.apply(notifier, arguments);
                        return obj;
                    }, toStatic: function () {
                        var key, ret = {};
                        for (key in _set) {
                            if (key !== expando) {
                                ret[key] = _set[key];
                            }
                        }
                        return ret;
                    }, toJSON: function () {
                        return obj.toStatic();
                    }, length: function () {
                        return len;
                    }, each: function (f) {
                        var key;
                        for (key in _set) {
                            f.call(window, _set[key]);
                        }
                    }, filter: function (f) {
                        /// <summary>Returns a living set that is formed by elements of the original set that satisfy the f predicate.</summary>
                        /// <param name="f" type="Function"/>
                        var ret = _CX.Binding.createSet(id), key;
                        for (key in _set) {
                            if (f.call(window, _set[key])) {
                                ret.add(_set[key]);
                            }
                        }
                        obj.on("itemadd", function (key) {
                            /// <param name="key" type="String"/>
                            var bound = obj.find(key);
                            if (!bound) {
                                return;
                            }
                            if (f.call(window, bound)) {
                                ret.add(bound);
                            }
                        }).on("itemchange", function (key) {
                            var bound = obj.find(key);
                            if (!bound) {
                                return;
                            }
                            if (f.call(window, bound) && !ret.find(key)) {
                                ret.add(bound);
                            }
                            if (!f.call(window, bound) && ret.find(key)) {
                                ret.removeAt(key);
                            }
                        }).on("itemremove", function (key, bound) {
                            if (!bound) {
                                return;
                            }
                            ret.removeAt(key);
                        });

                        return ret;
                    }
                }
                obj[expando] = createId();
                return obj;
            }, init: function (element, bound, bindCallback) {
                /// <param name="element" type="HTMLElement"/>
                /// <param name="bound" type="_CX.IntelliSenseCompat"/>
                /// <param name="bindCallback" type="Function"/>
                if (element) {
                    $(element).find("*").andSelf().each(function () {
                        var that = this, binds, keyValArr, keyVals = {}, currentSet, i;

                        if (typeof $(that).attr("data-cx-bind") !== "undefined") {
                            keyVals.bind = {};
                            currentSet = keyVals.bind;
                            binds = $(that).attr("data-cx-bind").split(",");
                            for (i = 0; i < binds.length; i++) {
                                keyValArr = binds[i].split(":");
                                currentSet[$.trim(keyValArr[0])] = $.trim(keyValArr[1]);
                            }
                            for (i in currentSet) {
                                that[i] = getProp(bound, currentSet[i]);
                            }
                            bound.on("change", function (key, val) {
                                var currentSet = keyVals.bind;
                                for (i in currentSet) {
                                    that[i] = getProp(bound, currentSet[i]);
                                }
                            });
                        }

                        if (typeof $(that).attr("data-cx-class") !== "undefined") {
                            keyVals.classes = {};
                            currentSet = keyVals.classes;
                            binds = $(that).attr("data-cx-class").split(",");
                            for (i = 0; i < binds.length; i++) {
                                keyValArr = binds[i].split(":");
                                currentSet[$.trim(keyValArr[0])] = $.trim(keyValArr[1]);
                            }
                            for (i in currentSet) {
                                $(that)[getProp(bound, currentSet[i]) ? "addClass" : "removeClass"](i);
                            }
                            bound.on("change", function (key, val) {
                                var currentSet = keyVals.classes;
                                for (i in currentSet) {
                                    $(that)[getProp(bound, currentSet[i]) ? "addClass" : "removeClass"](i);
                                }
                            });
                        }

                        if (typeof $(that).attr("data-cx-events") !== "undefined") {
                            keyVals.events = {};
                            currentSet = keyVals.events;
                            binds = $(that).attr("data-cx-events").split(",");
                            for (i = 0; i < binds.length; i++) {
                                keyValArr = binds[i].split(":");
                                currentSet[$.trim(keyValArr[0])] = $.trim(keyValArr[1]);
                            }
                            for (i in currentSet) {
                                currentSet[i].replace(/^\$bind$/, function () {
                                    $(that).on(i, function () {
                                        /// <var name="currentSet" type="Object"/>
                                        var i, currentSet = keyVals.bind || {}, currentProp;
                                        for (i in currentSet) {
                                            currentProp = currentSet[i];
                                            if (/^(?:checked|value|selected|innerHTML)$/.test(i) && bound.has(currentProp)) {
                                                bound.set(currentProp, $(that).prop(i));
                                            }
                                        }
                                        return !$(that).is("a,button");
                                    });
                                    return "";
                                }).replace(/^([$A-Za-z_][$A-Za-z_0-9]*)$/, function (_, fname) {
                                    /// <param name="fname" type="String"/>
                                    $(that).on(i, function () {
                                        /// <var name="f" type="Function"/>
                                        var f = bound[fname];
                                        if (typeof f === "function") {
                                            f.call(bound);
                                        }
                                        return !$(that).is("a,button");
                                    });
                                });
                            }
                        }
                    });
                    bound.on("destroy", function () {
                        $(element).remove();
                    });
                }

                if (typeof bindCallback === "function") {
                    bindCallback.call(window, element, bound);
                }
                return {
                    element: function () {
                        return element;
                    }
                };
            }, initSet: function (element, boundSet, binder, itemBinder) {
                /// <param name="element" type="HTMLElement"/>
                /// <param name="boundSet" type="_CX.Binding.createSet"/>
                /// <param name="binder" type="Function"/>
                /// <param name="itemBinder" type="Function"/>
                $(element).find("[data-cx-each=true]").andSelf().filter("[data-cx-each=true]").each(function () {
                    var that = this, children = $(that).children().remove();
                    // children.each(function () { });
                    boundSet.on("itemadd", function (key) {
                        var bound = boundSet.find(key);
                        children.clone().each(function () {
                            _CX.Binding.init(this, bound, itemBinder);
                        }).appendTo(that);
                    });
                });
                if (typeof binder === "function") {
                    binder.call(window, element, boundSet);
                }
                return {
                    element: function () {
                        return element;
                    }
                };
            }
        },

        // IntelliSense Compatibility use. Should not be used unless IntelliSense.
        IntelliSenseCompat: function () {
            return _CX.Binding.create().init();
        },
        Version: .025
    };
    return _CX;
})(jQuery);