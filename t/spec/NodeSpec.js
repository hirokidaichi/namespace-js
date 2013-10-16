var Namespace = require('../../src/namespace.js');

describe("node module of namespace.js format", function() {
    // node module of namespace.js format
    // @example
    // Namespace('sample')
    // .define(function(ns){
    //     ns.provide({
    //         foo: function(){}
    //     })
    // });

    it("apply", function(){
        require('./sample_namespace_format.js');
        Namespace
        .use('sample foo')
        .apply(function(ns){
            expect(ns.foo()).toEqual("foo");
        });
    });
});

describe("node module of hash object to module.exports", function() {
    // node module of hash object to module.exports
    // @example
    // module.exports = {
    //     bar: function(){}
    // };

    it("apply", function(){
        Namespace.loadFile('./sample_module_exports_hashobject.js');
        Namespace
        .use('sample_module_exports_hashobject bar')
        .apply(function(ns){
            expect(ns.bar()).toEqual("bar");
        });
    });

    it("custom namespace apply", function(){
        Namespace.loadFile('./sample_module_exports_hashobject.js', 'custom_namespace');
        Namespace
        .use('custom_namespace bar')
        .apply(function(ns){
            expect(ns.bar()).toEqual("bar");
        });
    });
});

describe("node module of 'not' hash object to module.exports", function() {
    // node module of "not" hash object to module.exports
    // @example
    // module.exports = function(){}; // 1234 , "sample" , [] , Regexp , new Hoge() ...etc

    it("apply", function(){
        Namespace('npm').import('./sample_module.js');
        Namespace
        .use('npm sample_module')
        .apply(function(ns){
            expect(ns.sample_module).toEqual("sample");
        });
    });
});
