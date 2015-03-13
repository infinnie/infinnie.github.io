var CX = (function () {
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

    isArray = function (x) {
        return Object.prototype.toString.call(x) === "[object Array]";
    },
    _CX = {
        App: createNotifier(),
        Binding: {
            create: function (create, read, update, destroy) {
                /// <param name="read" type="Function"/>
                /// <param name="update" type="Function"/>
                /// <param name="create" type="Function">Initialization callback</param>
                /// <param name="destroy" type="Function"/>
                var _init = function (data, dataExpandos, isCreate) {
                    if (!data || typeof data !== "object") {
                        throw new Error("Object required");
                    }
                    var key, obj = {},
                        dataCopy /* A deep copy of the param data */ = {},
                        notifier = createNotifier(), curExpando,
                        reserved = /^(?:on|notify|add|remove|destroy|set)$/;
                    dataExpandos = arguments[1] || {};
                    if (!data[expando]) {
                        data[expando] = createId();
                    }
                    dataCopy[expando] = data[expando];
                    dataExpandos[data[expando]] = true;
                    for (key in data) {
                        // Skip expando key.
                        if (key !== expando) {
                            switch (typeof data[key]) {
                                case "function":
                                    // Non-function values only.
                                    break;
                                case "object":
                                    if (data[key] !== null) {
                                        curExpando = data[key][expando];
                                        if (!curExpando || !dataExpandos[curExpando]) {
                                            dataCopy[key] = _CX.Binding.create(data[key], dataExpandos);
                                            dataCopy[key].on("change", function () {
                                                notifier.notify("change", key, dataCopy[key]);
                                            });
                                        } else { // Circular reference and break.
                                            if (debug) {
                                                console.log("Circular reference detected.");
                                            }
                                        }
                                    }
                                    break;
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
                        if (typeof destroy === "function") {
                            destroy.call(window, obj);
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
                        if (typeof update === "function") {
                            update.call(window, dataCopy, obj, key, value);
                        } else {
                            dataCopy[key] = value;
                            notifier.notify("change", key, value);
                        }
                        return obj;
                    };
                    obj.get = function (key) {
                        return dataCopy[key];
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

                    if (isCreate && typeof create === "function") {
                        create.call(window, dataCopy, obj);
                    } else {
                        obj.notify("init");
                    }

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
                        if (typeof read === "function") {
                            return read.apply(window, args);
                        }
                    }
                }
            }, createSet: function (id) {
                /// <param name="id" type="String">The name of the optional ID property.
                /// If specified, the value of this property would become the key to the internal storage object.
                /// If not specified, the internal CX key would be used.</param>
                var _set = {}, notifier = createNotifier(), len = 0, obj = {
                    add: function (bound) {
                        /// <param name="bound" type="_CX.IntelliSenseCompat"/>
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
                /// <param name="bindCallback" type="Function"/>

                if (typeof bindCallback === "function") {
                    return bindCallback.call(window, element, bound);
                }
            }
        },

        // IntelliSense Compatibility use. Should not be used unless IntelliSense.
        IntelliSenseCompat: function () {
            return _CX.Binding.create().init();
        },
        Version: .01
    };
    return _CX;
})();