var extendObject = function (obj) {
    var args = Array.prototype.slice.call(arguments, 1),
        i, len = args.length, p;
    for (i = 0; i < len; i++) {
        for (p in args[i]) {
            obj[p] = args[i][p];
        }
    }
}, animal = {
    sleep: function () {
        alert("Sleeping!");
    }, body: function () {
        return this;
    }, speciesName: function () {
        return this.genus + "" + this.speciesModifier;
    },
    kingdom: "Animalia",
    genus: "",
    speciesModifier: ""
}, programmable = {
    computer: "",
    program: function () {
        alert("I am programming using " + this.computer);
    }
}, some = {
    doSomething: function () {
        alert("Doing something!");
    }
};
var human = Object.create(animal);
extendObject(human, programmable, some, {
    genus: "Homo",
    speciesModifier: "sapiens",
    computer: "Surface Pro 3"
});

alert(human.speciesName());
human.program();