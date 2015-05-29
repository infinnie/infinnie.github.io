/// <reference path="/js/cx-jquery.js"/>
// Real Todo: add swiping support <done>and localStorage support</done>
jQuery(function ($) {
    "use strict";
    var todos = window.todos = CX.Binding.createSet(), indicator = $("#indicator"), App = CX.App, todoStorage = (function (ns) {
        var s = {};
        return {
            read: function (callback) {
                /// <param name="callback" type="Function"/>
                s = JSON.parse(localStorage.getItem(ns)) || {};
                if (callback) {
                    callback.call(window, s);
                }
                return s;
            },
            write: function (key, obj) {
                s[key] = obj;
                localStorage.setItem(ns, JSON.stringify(s));
            },
            remove: function (key) {
                delete s[key];
                localStorage.setItem(ns, JSON.stringify(s));
            },
            clear: function () {
                localStorage.clear(); // for later use
            }
        }
    })("TodoList"), TodoID = (function () {
        var max = 0;
        return {
            compare: function (id) {
                if (id > max) {
                    max = id;
                }
            }, create: function () {
                max++;
                return max;
            }
        };
    })(), Todo = (function () {
        var _Todo = CX.Binding.create({
            create: function (_, todo) {
                /// <param name="todo" type="CX.IntelliSenseCompat"/>
                App.notify("beforesave");
                setTimeout(function () {
                    todoStorage.write(todo.get("ID"), todo.toStatic());
                    todo.notify("init");
                }, 100);
            }, read: function (init, obj, callback) {
                /// <param name="init" type="Function"/>
                /// <param name="callback" type="Function"/>
                var todo = init(obj);
                callback.call(window, todo);
                todo.notify("read");
            }, update: function (dc, todo, key, val) {
                /// <param name="dc" type="Object"/>
                /// <param name="todo" type="CX.IntelliSenseCompat"/>
                /// <param name="key" type="String"/>
                App.notify("beforesave");
                setTimeout(function () {
                    // Simulate async operations.
                    dc[key] = val;
                    todoStorage.write(todo.get("ID"), todo.toStatic());
                    todo.notify("change", key, val);
                }, 100);
            }, destroy: function (todo) {
                /// <param name="todo" type="CX.IntelliSenseCompat"/>
                App.notify("beforesave");
                setTimeout(function () {
                    todoStorage.remove(todo.get("ID"));
                    todo.notify("destroy", todo.getCXID());
                }, 100);
            }
        });
        return {
            create: function (value, done) {
                var todo = _Todo.init({
                    content: value,
                    done: done || false,
                    ID: TodoID.create()
                });
                // Initialization
                todo.on("change init destroy", function () {
                    App.notify("save");
                });
                return todo;
            }, read: function (obj, callback) {
                return _Todo.read(obj, function (todo) {
                    todo.on("change init destroy", function () {
                        App.notify("save");
                    });
                    callback.call(window, todo);
                });
            }
        };
    })();

    CX.Binding.initSet(document.body, todos, function (_, todos) {
        var input = $("#add"),
            summary = $("#summary"),
            clearLink = $("#clear"),
            done = todos.filter(function (todo) {
                /// <param name="todo" type="Todo.create"/>
                return todo.get("done");
            });

        todos.on("itemadd itemchange itemremove", function () {
            var len = todos.length(), completedLen = done.length();
            summary.html(todos.length() + (len === 1 ? " item, " : " items, ")
                + completedLen + " completed");
        }).notify("itemchange");

        todoStorage.read(function (s) {
            var key;
            for (key in s) {
                // Preventing CX key from being added to localStorage, and it fucking works, too
                Todo.read($.extend({}, s[key]), function (todo) {
                    /// <param name="todo" type="Todo.create"/>
                    TodoID.compare(todo.get("ID"));
                    todos.add(todo);
                });
            }
        });

        input.on("keyup", function (e) {
            var todo;
            if (e.keyCode === 13 && input.val() !== "") {
                todo = Todo.create(input.val());
                todo.on("init", function () {
                    todos.add(todo);
                });
                input.val("");
            }
        });
        clearLink.on("click", function (e) {
            done.each(function (todo) {
                /// <param name="todo" type="Todo.create"/>
                todo.destroy();
            });
            e.preventDefault();
        });
    }, function (li, todo) {
        var el = $(li), textbox = el.find("[data-el=editor]");
        el.on("dblclick", function (e) {
            el.addClass("editing");
            textbox.get(0).focus();
        });
        textbox.on("keyup", function (e) {
            if (e.keyCode === 13) {
                e.target.blur();
            }
        }).on("blur", function () {
            el.removeClass("editing");
        });
    });

    App.on("beforesave", function () {
        indicator.addClass("loading");
    }).on("save", function () {
        setTimeout(function () {
            indicator.removeClass("loading");
        }, 1000);
    });
});
