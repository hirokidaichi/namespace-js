/* namespace-js Copyright (c) 2010 @hiroki_daichi */
var Namespace = (function(){
    /* utility */
    var merge = function(target, source){
        for(var p in source)
            if(source.hasOwnProperty( p )) target[p] = source[p];
        return target;
    };
    var _assertValidFQN = function(fqn){
        if(!(/^[a-z0-9_.]+/).test(fqn)) throw('invalid namespace');
    };

    var Procedure = function _Private_Class_Of_Proc(){
        merge(this, {
            state  : {},
            steps  : [],
            _status: 'init'
        });
    };
    merge(Procedure.prototype, {
        next: function(state){
            if(state) this.enqueue(state);
            return this;
        },
        isRunning: function(){
            return (this._status === 'running');
        },
        enqueue: function(state){
            this.steps.push(state);
        },
        dequeue: function(){
            return this.steps.shift();
        },
        call: function(initialState,callback){
            if( this.isRunning() )  throw("do not run twice"); 

            this.state = initialState || {};
            this.enqueue(function($c){
                $c();
                if(callback)callback(this);
            });
            this._status = 'running';
            this._invoke();
        },
        _invoke: function(){
            var _self = this;
            var step  = _self.dequeue();
            if( !step ){
                _self._status = 'finished';
                return;
            }
            if( step.call ) {
                return step.call( _self.state,function _cont(state){
                    if( state ) _self.state = state;
                    _self._invoke();
                });
            }
            var finishedProcess = 0;
            if( step.length === 0 ) _self._invoke();
            for(var i =0,l=step.length;i<l;i++){
                step[i].call(_self.state,function _joinWait(){
                    finishedProcess++;
                    if( finishedProcess == l ){
                        _self._invoke();
                    }
                });
            }
        }
    });

    var createProcedure = function(state) {
        return new Procedure().next(state);
    };

    var NamespaceObject = function _Private_Class_Of_NamespaceObject(fqn){
        merge(this, {
            stash: { CURRENT_NAMESPACE : fqn },
            fqn  : fqn,
            proc : createProcedure()
        });
    };
    merge(NamespaceObject.prototype, {
        enqueue: function(context) { 
            this.proc.next(context); 
        },
        call: function(state,callback) { 
            this.proc.call(state, callback); 
        },
        valueOf: function() { 
            return "#NamespaceObject<" + this.fqn + ">"; 
        },
        merge: function(obj) {
            merge(this.stash,obj);
            return this;
        },
        getStash: function() {
            return this.stash;
        },
        getExport: function(importName) {
            if (importName === '*') return this.stash;

            var importNames = importName.split(','),
                retStash    = {};
            for(var i = 0,l=importNames.length;i<l;i++){
                var names = importNames[i].split('=>');
                if (1 < names.length) {
                  retStash[ names[1] ] = this.stash[ names[0] ];
                }
                else {
                  retStash[ importNames[i] ] = this.stash[ importNames[i] ];
                }
            }
            return retStash;
        }
    });
    var NamespaceObjectFactory = (function() {
        var cache = {};
        return {
            create :function(fqn){
                _assertValidFQN(fqn);
                return (cache[fqn] || (cache[fqn] = new NamespaceObject(fqn)));
            }
        };
    })();

    var NamespaceDefinition = function _Private_Class_Of_NamespaceDefinition(nsObj) {
        merge(this, {
            namespaceObject: nsObj,
            requires       : [],
            useList        : [],
            stash          : {},
            defineCallback : undefined
        });
        var _self = this;
        nsObj.enqueue(function($c){ _self.apply($c); });
    };
    merge(NamespaceDefinition.prototype, {
        use: function(syntax){
            this.useList.push(syntax);
            var splitted   = syntax.split(/\s+/);
            var fqn        = splitted[0];
            splitted[0] = '';
            var importName = splitted.join('');
            _assertValidFQN(fqn);
            this.requires.push(function($c){
                var context = this;
                var require = NamespaceObjectFactory.create(fqn);
                require.call(this,function(state){
                    context.loadImport(require,importName);
                    $c();
                });
            });
            return this;
        },
        _mergeStashWithNS: function(nsObj){
            var nsList  = nsObj.fqn.split(/\./);
            var current = this.getStash();

            for(var i = 0,l=nsList.length;i<l-1;i++){
                if( !current[nsList[i]] ) current[nsList[i]] = {};
                current = current[nsList[i]];
            }

            var lastLeaf = nsList[nsList.length-1];
            current[lastLeaf] = merge(current[lastLeaf] || {}, nsObj.getStash());
        },
        loadImport: function(nsObj,importName){
            if( importName ){
                merge( this.stash, nsObj.getExport(importName) );
            }else{
                this._mergeStashWithNS( nsObj );
            }
        },
        define: function(callback){
            var nsDef = this, nsObj = this.namespaceObject;
            this.defineCallback = function($c) {
                var ns = { 
                    provide : function(obj){
                        nsObj.merge(obj);
                        $c();
                    } 
                }; 
                merge(ns, nsDef.getStash());
                merge(ns, nsObj.getStash());
                callback(ns);
            };
        },
        getStash: function(){
            return this.stash;
        },
        valueOf: function(){
            return "#NamespaceDefinition<"+this.namespaceObject+"> uses :" + this.useList.join(',');
        },
        apply: function(callback){
            var nsDef = this;
            createProcedure(nsDef.requires)
            .next(nsDef.defineCallback)
            .call(nsDef,function(){
                callback( nsDef.getStash() );
            });
        }
    });

    var createNamespace = function(fqn){
        return new NamespaceDefinition(
            NamespaceObjectFactory.create(fqn || 'main')
        );
    };
    merge(createNamespace, {
        'Object'  : NamespaceObjectFactory,
        Definition: NamespaceDefinition,
        Proc      : createProcedure
    });
    return createNamespace;
})();

Namespace.use = function(useSyntax){ return Namespace().use(useSyntax); }
Namespace.fromInternal = Namespace.GET = (function(){
    var get = (function(){
        var createRequester = function() {
            var xhr;
            try { xhr = new XMLHttpRequest() } catch(e) {
                try { xhr = new ActiveXObject("Msxml2.XMLHTTP.6.0") } catch(e) {
                    try { xhr = new ActiveXObject("Msxml2.XMLHTTP.3.0") } catch(e) {
                        try { xhr = new ActiveXObject("Msxml2.XMLHTTP") } catch(e) {
                            try { xhr = new ActiveXObject("Microsoft.XMLHTTP") } catch(e) {
                                throw new Error( "This browser does not support XMLHttpRequest." )
                            }
                        }
                    }
                }
            }
            return xhr;
        };
        var isSuccessStatus = function(status) {
            return (status >= 200 && status < 300) || 
                    status == 304 || 
                    status == 1223 ||
                    (!status && (location.protocol == "file:" || location.protocol == "chrome:") );
        };
        
        return function(url,callback){
            var xhr = createRequester();
            xhr.open('GET',url,true);
            xhr.onreadystatechange = function(){
                if(xhr.readyState === 4){
                    if( isSuccessStatus( xhr.status || 0 )){
                        callback(true,xhr.responseText);
                    }else{
                        callback(false);
                    }
                }
            };
            xhr.send('')
        };
    })();

    return function(url,isManualProvide){
        return function(ns){
            get(url,function(isSuccess,responseText){
                if( isSuccess ){
                    if( isManualProvide )
                        return eval(responseText);
                    else
                        return ns.provide( eval( responseText ) );
                }else{
                    var pub = {};
                    pub[url] = 'loading error';
                    ns.provide(pub);
                }
            });
        };
    };
})();

Namespace.fromExternal = (function(){
    var callbacks = {};
    var createScriptElement = function(url,callback){
        var scriptElement = document.createElement('script');

        scriptElement.loaded = false;
        
        scriptElement.onload = function(){
            this.loaded = true;
            callback();
        };
        scriptElement.onreadystatechange = function(){
            if( !/^(loaded|complete)$/.test( this.readyState )) return;
            if( this.loaded ) return;
            scriptElement.loaded = true;
            callback();
        };
        scriptElement.src = url;
        document.body.appendChild( scriptElement );
        return scriptElement.src;
    };
    var domSrc = function(url){
        return function(ns){
            var src = createScriptElement(url,function(){
                var name = ns.CURRENT_NAMESPACE;
                var cb = callbacks[name];
                delete callbacks[name];
                cb( ns );
            });
        }
    };
    domSrc.registerCallback = function(namespace,callback) {
        callbacks[namespace] = callback;
    };
    return domSrc;
})();

try{ module.exports = Namespace; }catch(e){}
