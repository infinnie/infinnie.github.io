(function () {
    document.addEventListener("DOMContentLoaded", function () {
        var todos = window.todos = CX.Binding.createSet(),
            itemList = document.getElementById("uList"),
            itemTemplate = document.getElementById("ItemTemplate").innerHTML,
            createTodo = (function () {
                var TodoBinder = CX.Binding.create(function (_, todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    setTimeout(function () {
                        todo.notify("init");
                    }, 100);
                }, /* default getter */ null,
                function (dc, todo, key, val) {
                    /// <param name="dc" type="Object"/>
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    /// <param name="key" type="String"/>
                    setTimeout(function () {
                        // Simulate async operations.
                        dc[key] = val;
                        todo.notify("change", key, val);
                    }, 100);
                }, function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    setTimeout(function () {
                        todo.notify("destroy", todo.getCXID());
                    }, 100);
                });
                return function (value, done) {
                    var todo = TodoBinder.init({
                        content: value,
                        done: done || false
                    }), li = document.createElement("li");
                    li.innerHTML = document.getElementById("ItemTemplate").innerHTML;
                    CX.Binding.init(li, todo, function (elem, todo) {
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
                            itemList.appendChild(li);
                            li.setAttribute("data-id", todo.getCXID());
                            modifyElements();
                        }).on("destroy", function () {
                            itemList.removeChild(li);
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
                    });
                    return todo;
                };
            })();

        CX.Binding.init(document.body, todos, function (elem, todos) {
            var input = document.getElementById("add"), summary = document.getElementById("summary"),
                done = todos.filter(function (todo) {
                    /// <param name="todo" type="CX.IntelliSenseCompat"/>
                    return todo.get("done");
                });
            input.addEventListener("keyup", function (e) {
                var todo;
                if (e.keyCode === 13) {
                    // todos.add(createTodo(input.value));
                    todo = createTodo(input.value);
                    todo.on("init", function () {
                        todos.add(todo);
                    });
                    input.value = "";
                }
            });
            todos.on("itemadd itemchange itemremove", function () {
                var len = todos.length(), completedLen = done.length();
                summary.innerHTML = todos.length() + (len === 1 ? " item, " : " items, ")
                    + completedLen + " completed";
            }).notify("itemchange");
        });
    }, false);
})();