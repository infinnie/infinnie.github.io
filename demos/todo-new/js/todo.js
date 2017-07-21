/// <reference path="/js/jquery-1.8.0.min.js"/>
jQuery(function ($) {
    "use strict";
    var AppStorage = (function () {
        var read = function () {
            /// <returns type="Array"/>
            console.log("Reading from localStorage.");
            return JSON.parse(localStorage.getItem("todoList-New") || "null") || [];
        }, write = function (newList) {
            console.log("Writing to localStorage.");
            localStorage.setItem("todoList-New", JSON.stringify(newList));
        }, writeOne = function (update) {
            var d = $.Deferred();
            pendingList.push(d);
            if (!curTimeout) {
                curTimeout = setTimeout(writeUpdates, 0);
            }
            switch (update.action) {
                case "create":
                    creations.push(update.value);
                    break;
                case "update":
                    updates[update.id] = $.extend({}, updates[update.id] || {}, update.value);
                    break;
                case "destroy":
                    deletions[update.id] = true;
                    break;
            }
            return d.promise();
        }, writeUpdates = function () {
            var resolveList = pendingList.slice(0);
            curTimeout = 0;
            curList = $.map($.grep(curList, function (todo, index) {
                return !(todo.id in deletions);
            }), function (todo, index) {
                if (todo.id in updates) {
                    return $.extend({}, todo, updates[todo.id]);
                }
                return todo;
            }).concat(creations);
            write(curList);
            creations = [];
            updates = {};
            deletions = {};
            pendingList = [];
            setTimeout(function () {
                $.each(resolveList, function (i, d) {
                    /// <param name="d" type="$.Deferred"/>
                    d.resolve();
                });
            }, 0);
        }, curList = null, creations = [], updates = {}, deletions = {}, curTimeout = 0, pendingList = [];
        return {
            read: function () {
                /// <returns type="Array"/>
                curList = read();
                return curList;
            }, create: function (value) {
                return writeOne({ action: "create", value: value });
            }, update: function (id, value) {
                return writeOne({ action: "update", id: id, value: value });
            }, destroy: function (id) {
                return writeOne({ action: "destroy", id: id });
            }, markAll: function (done) {
                var d = $.Deferred(), ret = [];
                curList = $.map(curList, function (todo) {
                    if (todo.done !== done) {
                        ret.push(todo.id);
                        return $.extend({}, todo, { done: done });
                    }
                    return todo;
                });
                write(curList);
                setTimeout(function () {
                    d.resolve(ret);
                }, 0);
                return d.promise();
            }, clearCompleted: function () {
                var d = $.Deferred(), ret = [];
                curList = $.grep(curList, function (todo) {
                    if (todo.done) {
                        ret.push(todo.id);
                        return false;
                    }
                    return true;
                });
                write(curList);
                setTimeout(function () {
                    d.resolve(ret);
                }, 0);
                return d.promise();
            }
        };
    })(), AppModel = {
        todoList: null,
        count: null,
        doneCount: null,
        remainCount: 0,
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
        precreate: function (item, storage) {
            /// <summary>returns the transformed item and list.</summary>
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return item;
            }
            var val = item.value,
                obj = { id: +new Date() };
            $.extend(obj, val);
            return storage.create(obj).then(function () {
                return {
                    action: "create",
                    value: obj,
                    id: obj.id,
                    type: "todo"
                };
            });
        }, preupdate: function (item, storage) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return item;
            }
            return storage.update(item.id, item.value).then(function () {
                return {
                    action: "update",
                    value: item.value,
                    id: item.id,
                    type: "todo"
                };
            });
        }, predestroy: function (item, storage) {
            /// <summary>returns the transformed item and list.</summary>
            AppEvents.trigger("beforesave");
            if (item.type !== "todo") {
                return item;
            }
            return storage.destroy(item.id).then(function () {
                return {
                    action: "destroy",
                    id: item.id,
                    type: "todo"
                };
            });
        }, initiate: function (item, storage) {
            if (item.type !== "todoList") {
                return item;
            }
            return {
                action: "fill",
                type: "todoList",
                value: storage.read()
            };
        }, clearcompleted: function (item, storage) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todoList") {
                return item;
            }
            return storage.clearCompleted().then(function (idList) {
                return $.map(idList, function (id) {
                    return {
                        type: "todo",
                        action: "destroy",
                        id: id
                    };
                });
            });
        }, markall: function (item, storage) {
            AppEvents.trigger("beforesave");
            if (item.type !== "todoList") {
                return item;
            }
            return storage.markAll(item.value).then(function (idList) {
                return $.map(idList, function (id) {
                    return {
                        type: "todo",
                        action: "update",
                        id: id,
                        value: { done: item.value }
                    }
                });
            });
        }
    }, storageTransformation = (function (storage) {
        return function (updates) {
            /// <param name="updates" type="Array"/>
            return $.when.apply($, $.map(updates, function (update) {
                if (!update) {
                    return [];
                }
                if (update.action in storageActionMap) {
                    return storageActionMap[update.action](update, storage) || [];
                }
                return update;
            })).then(function () {
                AppEvents.trigger("save");
                return [].concat.apply([], arguments);
            });
        };
    })(AppStorage), getHashSub = function (hash) {
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
            var count, doneCount, remainCount,
                ret = {
                    action: "update",
                    type: "counter"
                }, should = false, hasHashUpdate = false, retUpdates = [],
                creations = [], updateList = {}, deletions = {}, cancelList = {};
            $.each(updates, function (index, item) {
                if (item.action === "fill" && item.type === "todoList") {
                    list = item.value;
                    return false;
                }
            });
            $.each(updates, function (index, update) {
                if (update.type === "todo") {
                    switch (update.action) {
                        case "create":
                            creations.push(update);
                            return;
                        case "update":
                            if (updateList[update.id]) {
                                updateList[update.id].value = $.extend({}, updateList[update.id].value || {}, update.value);
                            } else {
                                updateList[update.id] = $.extend({}, update);
                            }
                            return;
                        case "destroy":
                            deletions[update.id] = update;
                            return;
                        case "cancel":
                            cancelList[update.id] = true;
                    }
                }
                retUpdates.push(update);
                if (update.action === "update" && update.type === "hash") {
                    hasHashUpdate = true;
                }
            });
            list = [].concat.apply([], $.map(list, function (todo) {
                var curUpdate, ret;
                if (todo.id in deletions) {
                    if (hashTest(todo.done)) {
                        retUpdates.push(deletions[todo.id]);
                    }
                    return [];
                }
                if (todo.id in updateList) {
                    curUpdate = updateList[todo.id];
                    ret = $.extend({}, todo, curUpdate.value);
                    if (hashTest(todo.done)) {
                        if (!("done" in curUpdate.value) || hashTest(curUpdate.value.done)) {
                            retUpdates.push(curUpdate);
                        } else {
                            retUpdates.push({
                                type: "todo",
                                action: "viewremove",
                                id: todo.id
                            });
                        }
                    } else {
                        if (("done" in curUpdate.value) && hashTest(curUpdate.value.done)) {
                            retUpdates.push({
                                type: "todo",
                                action: "viewinsert",
                                value: ret,
                                id: todo.id
                            });
                        }
                    }
                    return ret;
                }
                if (todo.id in cancelList) {
                    retUpdates.push({
                        type: "todo",
                        action: "update",
                        value: {
                            editing: false,
                            content: todo.content
                        },
                        id: todo.id
                    });
                }
                return todo;
            }).concat($.map(creations, function (created) {
                var todo = created.value;
                if (hashTest(todo.done)) {
                    retUpdates.push(created);
                }
                return todo;
            })));

            if (hasHashUpdate) {
                retUpdates.push({
                    type: "todoList",
                    action: "viewfill",
                    value: $.grep(list, function (item, index) {
                        return hashTest(item.done);
                    })
                });
            }
            count = list.length;
            doneCount = $.grep(list, function (item) {
                return item.done;
            }).length;
            remainCount = count - doneCount;
            retUpdates.push({
                type: "allDone",
                action: "update",
                value: count > 0 && (remainCount === 0)
            });
            if (count !== AppModel.count) {
                AppModel.count = count;
                should = true;
                ret.count = count;
            }
            if (remainCount !== AppModel.remainCount) {
                AppModel.remainCount = remainCount;
                should = true;
                ret.remainCount = remainCount;
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
        indicator: $("#indicator"),
        todoStatusText: $("#todoStatusText"),
        todoStatusArea: $("#todoStatus")
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
                        viewElements.listArea.append(el);
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
                        viewElements.clearCompleted[update.doneCount ? "removeClass" : "addClass"]("todo-status__clearLink--hidden");
                    }
                    if ("remainCount" in update) {
                        viewElements.todoStatusText.text(update.remainCount + (update.remainCount === 1 ? " item left." : " items left."));
                    }
                    if ("count" in update) {
                        viewElements.todoStatusArea[update.count ? "show" : "hide"]();
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
