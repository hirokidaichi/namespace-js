namespace-js
===========

namespace-jsは遅延評価可能なシンプルなネームスペースライブラリです。
名前空間の定義、Dot Syntaxによる名前空間の階層表現、モジュールのエクスポートを行えます。

Example
--------
### 名前空間の定義

Namespaceオブジェクトに名前空間名を定義します

```javascript
Namespace('namespace.string')
```

defineメソッドに上記名前空間に定義する処理を記述します

```javascript
.define(function(namespaceObject))
```

```javascript:sample_namespace.js
Namespace('com.example.application')
.define(function(ns){
    // 処理
    ns.provide({
        foo: function(){return "foo"},
        bar: function(){return "bar"}
    });
});
```

### 実行

applyをすることで評価されます。
使用するネームスペースはuseメソッドを実行することでNamespaceObjectにattachが行われます

```javascript:apply_namespace.js
Namespace
.use('com.example.application foo,bar')
.apply(function(ns){
    console.log(ns.foo());
    console.log(ns.bar());
});
```

attachする要素を定義しない場合、Namespace のDot Syntaxで操作が可能になります

```javascript:apply_namespace2.js
Namespace
.use('com.example.application')
.apply(function(ns){
    console.log(ns.com.example.application.foo());
    console.log(ns.com.example.application.bar());
});
```

Download
--------


