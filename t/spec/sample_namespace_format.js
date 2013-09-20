var Namespace = (typeof(window) !== "undefined") && "Namespace" in window ? Namespace : require('../../src/namespace.js');

Namespace('sample')
.define(function(ns){
    ns.provide({
        foo: function(){
            return "foo";
        }
    });
});
