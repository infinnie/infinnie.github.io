/// <reference path="/js/jquery-1.8.0.min.js"/>
jQuery(function ($) {
    "use strict";
    var AppStorage = {
        read: function () {
            /// <returns type="Array"/>
            console.log("Reading from localStorage.");
            return JSON.parse(localStorage.getItem("todoList-New") || "null") || [];
        },
        write: function (newList) {
            console.log("Writing to localStorage.");
            localStorage.setItem("todoList-New", JSON.stringify(newList));
        }
    }, AppModel = {
        todoList: null,
        count: null,
        doneCount: 0,
        allDone: false
    }, AppEvents = (function () {
        var topics = {};
        return {
            on: function (e, f) {
                topics[e] = topics[e] || $.Callbacks();
                topics[e].add(f);
                return this;
            }, off: function (e, f) {
                if (e in topics) {
                    topics[e].remove(f);
                }
                return this;
            }, trigger: function (e, t) {
                topics[e] && topics[e].fire(t);
                return this;
            }
        };
    })(), combineTransformations = (function () {
        var promiseJoin = function (f, g) {
            /// <param name="f" type="Function"/>
            /// <param name="g" type="Function"/>
            return function (x) {
                /// <returns type="Promise"/>
                return f(x).then(g);
            };
        }, idTransformation = function (x) {
            var d = $.Deferred();
            d.resolve(x);
            return d.promise();
        };
        return function (transformations) {
            /// <param name="transformations" type="Array"/>
            var ret = idTransformation;
            $.each(transformations || [], function (i, val) {
                ret = promiseJoin(ret, val);
            });
            return ret;
        };
    })(), storageActionMap = {
        precreate: function (list, item) {
            /// <summary>returns the transformed item and list.</summary>
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return { list: list, item: item };
            }
            var val = item.value,
                obj = { id: +new Date() };
            $.extend(obj, val);
            return {
                list: [obj].concat(list),
                item: {
                    action: "create",
                    value: obj,
                    id: obj.id,
                    type: "todo"
                }
            };
        }, preupdate: function (list, item) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return { list: list, item: item };
            }
            var id = item.id,
                retList = $.map(list, function (element, index) {
                    if (id !== element.id) { return element; }
                    return $.extend({}, element, item.value);
                });
            return {
                list: retList,
                item: {
                    action: "update",
                    value: item.value,
                    id: id,
                    type: "todo"
                }
            };
        }, predestroy: function (list, item) {
            /// <summary>returns the transformed item and list.</summary>
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return { list: list, item: item };
            }
            var id = item.id,
                retList = $.grep(list, function (element) {
                    return id !== element.id;
                });
            return {
                list: retList,
                item: {
                    action: "destroy",
                    type: "todo",
                    id: id
                }
            };
        }, initiate: function (list, item) {
            /// <param name="list" type="Array">The todo list. Initiated from storage.</param>
            if (item.type !== "todoList") {
                return { list: list, item: item };
            }
            return {
                list: null,
                item: {
                    action: "fill",
                    type: "todoList",
                    value: list
                }
            }
        }, clearcompleted: function (list, item) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todoList") {
                return { list: list, item: item };
            }
            var ret = [], retList = $.grep(list, function (element) {
                if (element.done) {
                    ret.push({
                        action: "destroy",
                        type: "todo",
                        id: element.id
                    });
                    return false;
                }
                return true;
            });
            return {
                list: retList,
                item: ret
            };
        }, markall: function (list, item) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todoList") {
                return { list: list, item: item };
            }
            var ret = [], retList = $.map(list, function (element) {
                var doneObj = { done: item.value };
                if (element.done !== item.value) {
                    ret.push({
                        action: "update",
                        type: "todo",
                        id: element.id,
                        value: doneObj
                    });
                    return $.extend({}, element, doneObj);
                }
                return element;
            });
            return {
                list: retList,
                item: ret
            };
        }
    }, storageTransformation = (function () {
        var list = null;
        return function (updates) {
            /// <param name="updates" type="Array"/>
            var should = false,
                transformed = [].concat.apply([], $.map(updates, function (item, i) {
                    /// <summary>Updates the list and returns the item per iteration.</summary>
                    /// <param name="val" type="Object"/>
                    // Do something
                    var temp;
                    if (!item) {
                        return [];
                    }
                    if (item.action in storageActionMap) {
                        list = list || AppStorage.read();
                        temp = storageActionMap[item.action](list, item);
                        if (temp.list) {
                            list = temp.list;
                            should = true;
                        }
                        return temp.item || [];
                    }
                    return item;
                })), d = $.Deferred();
            if (should) {
                AppStorage.write(list);
            }
            setTimeout(function () {
                d.resolve(should ? transformed.concat({
                    type: "todoList",
                    action: "update",
                    value: list
                }) : transformed);
            }, 1);
            return d.promise();
        };
    })(), getHashSub = function (hash) {
        return hash.replace(/^#(?:!\/)?/, "");
    }, hashTest = function (done) {
        /// <param name="done" type="Boolean"/>
        switch (getHashSub(location.hash)) {
            case "completed":
                return done;
            case "remaining":
                return !done;
        }
        return true;
    }, modelTransformation = (function () {
        var list = [];
        return function (updates) {
            /// <summary>Update model and computed properties.</summary>
            /// <param name="updates" type="Array"/>
            var count, doneCount, ret = {
                action: "update",
                type: "counter"
            }, should = false, prevList = list, retUpdates;
            $.each(updates, function (index, item) {
                if (/^(?:fill|update)$/.test(item.action) && item.type === "todoList") {
                    list = item.value;
                    if (item.action === "update") {
                        AppEvents.trigger("save");
                    }
                    return false;
                }
            });
            retUpdates = [].concat.apply([], $.map(updates, function (update) {
                var todoItem, prevItem;
                if (update.type === "todo") {
                    if (update.id) {
                        todoItem = $.grep(list, function (todo, i) {
                            return todo.id === update.id;
                        })[0];
                    }
                    switch (update.action) {
                        case "cancel":
                            return {
                                type: "todo",
                                action: "update",
                                id: update.id,
                                value: {
                                    editing: false,
                                    content: todoItem && todoItem.content
                                }
                            };
                        case "create":
                            if (!hashTest(update.value.done)) {
                                return [];
                            }
                            break; // never fall through.
                        case "update":
                            if (todoItem && !hashTest(todoItem.done)) {
                                return {
                                    type: "todo",
                                    action: "viewremove",
                                    id: update.id
                                };
                            }
                            if (("done" in update.value) && hashTest(update.value.done)) {
                                prevItem = $.grep(prevList, function (todo, i) {
                                    return todo.id === update.id;
                                })[0];
                                if (!hashTest(prevItem.done)) {
                                    return {
                                        type: "todo",
                                        action: "viewinsert",
                                        value: todoItem,
                                        id: update.id
                                    };
                                }
                            }
                    }
                }

                if (update.action === "update" && update.type === "hash") {
                    return [update, {
                        type: "todoList",
                        action: "viewfill",
                        value: $.grep(list, function (item, index) {
                            return hashTest(item.done);
                        })
                    }];
                }

                return update;
            }));
            AppModel.todoList = list;
            count = list.length;
            doneCount = $.grep(list, function (item) {
                return item.done;
            }).length;
            retUpdates.push({
                type: "allDone",
                action: "update",
                value: count > 0 && (doneCount === count)
            });
            if (count !== AppModel.count) {
                AppModel.count = count;
                should = true;
                ret.count = count;
            }
            if (doneCount !== AppModel.doneCount) {
                AppModel.doneCount = doneCount;
                should = true;
                ret.doneCount = doneCount;
            }
            return should ? retUpdates.concat(ret) : retUpdates;
        };
    })(), viewElements = {
        todoForm: $("#todoForm"),
        todoItemTemplate: $($("#todoItemSource").html()),
        listArea: $("#listArea"),
        clearCompleted: $("#clearCompleted"),
        linkArea: $("#hashLinks"),
        allMarker: $("#markAll"),
        indicator: $("#indicator")
    }, viewActionMaps = (function () {
        var makeTodoElement = function (itemValue) {
            var item = viewElements.todoItemTemplate.clone();
            item.attr("data-todo-id", itemValue.id);
            if (itemValue.content) {
                item.find("[data-role=content]").text(itemValue.content);
                item.find("[data-role=todoInput]").val(itemValue.content);
            }
            if (itemValue.done) {
                item.addClass("todo-item--done");
                item.find("[data-role=doneCheck]").prop("checked", true);
            }
            return item.get(0);
        };
        return {
            form: {
                update: function (update) {
                    var formInput = viewElements.todoForm.find("[data-role=formInput]");
                    // alert(formInput.val());
                    formInput.val(update.value);
                    return update;
                }
            }, todo: {
                create: function (update) {
                    viewElements.listArea.prepend($(makeTodoElement(update.value)).addClass("todo-item--animate").get(0));
                }, viewinsert: function (update) {
                    var el = makeTodoElement(update.value), justOlder = viewElements.listArea.find("[data-todo-id]").filter(function () {
                        return update.id >= +$(this).attr("data-todo-id");
                    }).get(0);
                    if (justOlder) {
                        $(justOlder).before(el);
                    } else {
                        viewElements.listArea.prepend(el);
                    }
                }, destroy: function (update) {
                    var el = viewElements.listArea.find("[data-todo-id=" + update.id + "]").addClass("todo-item--removing");
                    setTimeout(function () {
                        el.remove();
                    }, 400);
                }, viewremove: function (update) {
                    viewElements.listArea.find("[data-todo-id=" + update.id + "]").remove();
                }, update: function (update) {
                    var updateValue = update.value,
                        elementUpdated = viewElements.listArea.find("[data-todo-id=" + update.id + "]");
                    if ("done" in updateValue) {
                        elementUpdated[updateValue.done ? "addClass" : "removeClass"]("todo-item--done");
                        elementUpdated.find("[data-role=doneCheck]").prop("checked", updateValue.done);
                    }
                    if ("editing" in updateValue) {
                        elementUpdated[updateValue.editing ? "addClass" : "removeClass"]("todo-item--editing");
                        if (updateValue.editing) {
                            elementUpdated.find("[data-role=todoInput]").each(function () {
                                this.focus();
                            });
                        }
                    }
                    if ("content" in updateValue) {
                        elementUpdated.find("[data-role=content]").text(updateValue.content);
                        elementUpdated.find("[data-role=todoInput]").val(updateValue.content);
                    }
                }
            }, todoList: {
                viewfill: function (update) {
                    var items = update.value.slice(0);
                    items.sort(function (x, y) {
                        return y.id - x.id;
                    });
                    $($.map(items, function (todo, index) {
                        return makeTodoElement(todo);
                    })).prependTo(viewElements.listArea.empty());
                }
            }, counter: {
                update: function (update) {
                    if ("doneCount" in update) {
                        viewElements.clearCompleted.text("Clear " + update.doneCount + " completed")[update.doneCount ? "show" : "hide"]();
                    }
                    if ("count" in update) {
                        viewElements.allMarker.parent("label")[update.count ? "show" : "hide"]();
                    }
                }
            }, hash: {
                update: function () {
                    var match = getHashSub(location.hash) || "all";
                    viewElements.linkArea.find("[data-hash-link]").each(function (i, el) {
                        $(this)[$(this).attr("data-hash-link") === match ? "addClass" : "removeClass"]("todo-status__link--current");
                    });
                }
            }, allDone: {
                update: function (update) {
                    viewElements.allMarker.prop("checked", update.value);
                }
            }
        };
    })(), viewTransformation = function (updates) {
        /// <param name="updates" type="Array"/>
        return $.map(updates, function (update, index) {
            var subMap = viewActionMaps[update.type], action = subMap && subMap[update.action];
            if (action) {
                return action(update);
            }
            return update;
        });
    }, performTransformations = combineTransformations([
        storageTransformation,
        modelTransformation,
        viewTransformation
    ]);

    viewElements.todoForm.on("submit", function () {
        // alert(1);
        var inputValue = $.trim($(this).find("[data-role=formInput]").val());
        if (inputValue) {
            performTransformations([
                {
                    action: "update",
                    type: "form",
                    value: ""
                }, {
                    action: "precreate",
                    type: "todo",
                    value: {
                        content: inputValue,
                        done: false
                    }
                }
            ]);
        }
        return false;
    });

    viewElements.allMarker.on("change", function () {
        performTransformations([
            {
                type: "todoList",
                action: "markall",
                value: $(this).prop("checked")
            }
        ]);
    });

    viewElements.clearCompleted.on("click", function () {
        performTransformations([
            {
                action: "clearcompleted",
                type: "todoList"
            }
        ]);
        return false;
    });

    viewElements.listArea.on("click", "[data-role=destroyTodo]", function () {
        var todoId = +$(this).parents("[data-todo-id]").attr("data-todo-id");
        performTransformations([
            {
                action: "predestroy",
                type: "todo",
                id: todoId
            }
        ]);
    }).on("change", "[data-role=doneCheck]", function () {
        var todoId = +$(this).parents("[data-todo-id]").attr("data-todo-id");
        performTransformations([
            {
                action: "preupdate",
                type: "todo",
                id: todoId,
                value: {
                    done: $(this).prop("checked")
                }
            }
        ]);
    }).on("dblclick", "[data-role=content]", function () {
        var todoId = +$(this).parents("[data-todo-id]").attr("data-todo-id");
        performTransformations([
            {
                action: "update", // Update without syncing to storage
                type: "todo",
                id: todoId,
                value: {
                    editing: true
                }
            }
        ]);
    }).on("keyup", "[data-role=todoInput]", function (e) {
        /// <param name="e" type="KeyboardEvent"/>
        var todoId = +$(this).parents("[data-todo-id]").attr("data-todo-id"), that = this;
        if (e.keyCode === 13) {
            this.blur();
        } if (e.keyCode === 27) {
            $(this).data("canceled", true);
            performTransformations([
                {
                    action: "cancel",
                    type: "todo",
                    id: todoId
                }
            ]).then(function () {
                that.blur();
                setTimeout(function () {
                    $(that).data("canceled", false);
                }, 0);
            });
        }
    }).on("blur", "[data-role=todoInput]", function (e) {
        var todoId = +$(this).parents("[data-todo-id]").attr("data-todo-id"), inputValue = $.trim($(this).val());
        if ($(this).data("canceled")) {
            return;
        }
        performTransformations(inputValue ? [
             {
                 action: "preupdate",
                 type: "todo",
                 id: todoId,
                 value: {
                     content: inputValue
                 }
             }, {
                 action: "update",
                 type: "todo",
                 id: todoId,
                 value: {
                     editing: false
                 }
             }
        ] : [
                {
                    action: "cancel",
                    type: "todo",
                    id: todoId
                }
        ]);
    });

    performTransformations([
        {
            type: "todoList",
            action: "initiate"
        }
    ]);

    AppEvents.on("beforesave", function () {
        viewElements.indicator.addClass("indicator--loading");
    }).on("save", function () {
        setTimeout(function () {
            viewElements.indicator.removeClass("indicator--loading");
        }, 1000);
    });

    $(window).on("hashchange", function () {
        performTransformations([
            {
                type: "hash",
                action: "update"
            }
        ]);
    }).trigger("hashchange");
});
