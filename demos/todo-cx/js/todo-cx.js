/// <reference path="/js/cx.js"/>
/// Real Todo: add swiping support and localStorage support (done)
(function () {
    "use strict";
    document.addEventListener("DOMContentLoaded", function () {
        var todos = window.todos = CX.Binding.createSet("ID"),
            itemList = document.getElementById("uList"),
            itemTemplate = document.getElementById("ItemTemplate").innerHTML,
            indicator = document.getElementById("indicator"),
            clearLink = document.getElementById("clear"),
            App = CX.App,
            todoStorage = {
                read: function (callback) {
                    /// <param name="callback" type="Function"/>
                    var obj = JSON.parse(localStorage.getItem("TodoList")) || {};
                    callback.call(window, obj);
                    return obj;
                },
                write: function (obj) {
                    localStorage.setItem("TodoList", JSON.stringify(obj));
                }
            }, TodoID = (function () {
                var max = 0;
                return {
                    compare: function (id) {
                        /// <param name="todo" type="CX.IntelliSenseCompat"/>
                        if (id > max) {
                            max = id;
                        }
                    }, create: function () {
                        /// <param name="todo" type="CX.IntelliSenseCompat"/>
                        max++;
                        return max;
                    }
                };
            })(),

            Todo = (function () {
                var _Todo = CX.Binding.create(function (_, todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    App.notify("beforesave");
                    setTimeout(function () {
                        todo.notify("init");
                    }, 100);
                }, function (init, obj, callback) {
                    /// <param name="init" type="Function"/>
                    /// <param name="callback" type="Function"/>
                    var todo = init(obj);
                    callback.call(window, todo);
                    todo.notify("read");
                },
                function (dc, todo, key, val) {
                    /// <param name="dc" type="Object"/>
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    /// <param name="key" type="String"/>
                    App.notify("beforesave");
                    setTimeout(function () {
                        // Simulate async operations.
                        dc[key] = val;
                        todo.notify("change", key, val);
                    }, 100);
                }, function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    App.notify("beforesave");
                    setTimeout(function () {
                        todo.notify("destroy", todo.getCXID());
                    }, 100);
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
            })(), bindTodoToElement = function (todo) {
                /// <param name="list" type="HTMLUListElement"/>
                var li = document.createElement("li");
                li.innerHTML = itemTemplate;
                return CX.Binding.init(li, todo, function (elem, todo) {
                    var container = elem.querySelector("[data-el=container]"),
                        checkBox = elem.querySelector("[data-el=check]"),
                        removeBtn = elem.querySelector("[data-el=remove]"),
                        editor = elem.querySelector("[data-el=input]"),
                        contentPresenter = elem.querySelector("[data-el=presenter]"),
                        modifyElements = function () {
                            container.className = todo.get("done") ? "done" : "";
                            checkBox.checked = todo.get("done");
                            editor.value = todo.get("content");
                            contentPresenter.innerHTML = todo.get("content");
                        }, ret = {
                            render: function () {
                                modifyElements();
                                return ret;
                            },
                            element: function () { return li; }
                        };

                    li.setAttribute("data-id", todo.getCXID());

                    // Object callbacks
                    todo.on("change", function (key) {
                        switch (key) {
                            case "content":
                                editor.value = todo.get("content");
                                contentPresenter.innerHTML = todo.get("content");
                                break;
                            case "done":
                                container.className = todo.get("done") ? "done" : "";
                                checkBox.checked = todo.get("done");
                                break;
                            default:
                                modifyElements();
                        }
                    }).on("destroy", function () {
                        var par = li.parentElement;
                        if (par !== null) {
                            par.removeChild(li);
                        }
                        li = null;
                    });

                    // DOM callbacks
                    li.addEventListener("dblclick", function () {
                        li.className = "editing";
                        editor.focus();
                    }, false);
                    editor.addEventListener("blur", function () {
                        editor.blur();
                        todo.set("content", editor.value);
                        li.className = "";
                    }, false);
                    editor.addEventListener("keyup", function (e) {
                        if (e.keyCode === 13) {
                            editor.blur();
                        }
                    }, false);
                    checkBox.addEventListener("change", function () {
                        todo.set("done", !todo.get("done"));
                    }, false);
                    removeBtn.addEventListener("click", function () {
                        todo.destroy();
                    }, false);

                    return ret;
                });
            };

        CX.Binding.init(null, todos, function (_, todos) {
            var input = document.getElementById("add"),
                summary = document.getElementById("summary"),
                done = todos.filter(function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    return todo.get("done");
                });

            todos.on("itemadd itemchange itemremove", function () {
                var len = todos.length(), completedLen = done.length();
                summary.innerHTML = todos.length() + (len === 1 ? " item, " : " items, ")
                    + completedLen + " completed";
            }).on("itemadd", function (key) {
                var todo = todos.find(key);
                itemList.appendChild(bindTodoToElement(todo).render().element());
            }).notify("itemchange");

            todoStorage.read(function (s) {
                var key;
                for (key in s) {
                    Todo.read(s[key], function (todo) {
                        /// <param name="todo" type="CX.IntelliSenseCompat"/>
                        TodoID.compare(todo.get("ID"));
                        todos.add(todo);
                    });
                }
            });

            todos.on("itemadd itemchange itemremove", function () {
                todoStorage.write(todos);
            });

            input.addEventListener("keyup", function (e) {
                var todo;
                if (e.keyCode === 13 && input.value !== "") {
                    todo = Todo.create(input.value);
                    todo.on("init", function () {
                        todos.add(todo);
                    });
                    input.value = "";
                }
            }, false);
            clearLink.addEventListener("click", function (e) {
                done.each(function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    todo.destroy();
                });
                e.preventDefault();
            }, false);
        });

        App.on("beforesave", function () {
            indicator.className = "indicator loading";
        }).on("save", function () {
            setTimeout(function () {
                indicator.className = "indicator";
            }, 1000);
        });
    }, false);
})();