/// <reference path="/js/cx.js"/>
/// Real Todo: add swiping support
(function () {
    "use strict";
    document.addEventListener("DOMContentLoaded", function () {
        var todos = window.todos = CX.Binding.createSet(),
            itemList = document.getElementById("uList"),
            itemTemplate = document.getElementById("ItemTemplate").innerHTML,
            indicator = document.getElementById("indicator"),
            clearLink = document.getElementById("clear"),
            App = CX.App,

            createTodo = (function () {
                var TodoBinder = CX.Binding.create(function (_, todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    App.notify("beforesave");
                    setTimeout(function () {
                        todo.notify("init");
                    }, 100);
                }, /* default read */ null,
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
                return function (value, done) {
                    return TodoBinder.init({
                        content: value,
                        done: done || false
                    });
                };
            })(), bindTodoToElement = function (todo, list) {
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
                        };

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
                    }).on("init", function () {
                        list.appendChild(li);
                        li.setAttribute("data-id", todo.getCXID());
                        modifyElements();
                    }).on("destroy", function () {
                        list.removeChild(li);
                        li = null;
                    }).on("change init destroy", function () {
                        App.notify("save");
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
            }).notify("itemchange");

            input.addEventListener("keyup", function (e) {
                var todo;
                if (e.keyCode === 13 && input.value !== "") {
                    // todos.add(createTodo(input.value));
                    todo = createTodo(input.value);
                    bindTodoToElement(todo,itemList);
                    todo.on("init", function () {
                        todos.add(todo);
                    }).on("destroy", function () {
                    });
                    input.value = "";
                }
            });
            clearLink.addEventListener("click", function (e) {
                done.each(function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    todo.destroy();
                });
                e.preventDefault();
            });
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