/* namespace-js Copyright (c) 2010 @hiroki_daichi */
var Namespace = (function(){
    /* utility */
    var merge = function(aObj,bObj){
        for( var p in bObj ){
            if( bObj.hasOwnProperty( p ) ){
                aObj[p] = bObj[p];
            }
        }
        return aObj;
    };
    var _assertValidFQN = function(fqn){
        if( !fqn.match(/^[a-z][a-z0-9.]*[a-z0-9]?$/) ){
            throw('Invalid namespace');
        }
    };
    /* Namespace Class */
    var Namespace = (function(){
        var nsCache = {};
        var nsList  = [];
        /* constructor*/
        var Klass = function _Private_Class_Of_Namespace(fqn){
            this.stash   = {
                CURRENT_NAMESPACE : fqn
            };
            this.name = fqn;
            this.contexts = [];
            this.isLoading = false;
            this.callbacks = [];
        };
        
        (function(){
            var justThrow = function(){
                throw('do not call provide twice');
            };
            this.merge = function(obj){
                merge(this.stash,obj);
                return this;
            };
            this.appendContext = function(context,callback){
                this.contexts.push({
                    context :context , callback : callback
                });
            };
            this.load = function(finishedCallback){
                this.callbacks.push(finishedCallback);
                if(this.isLoading) return;

                this.isLoading = true;
                this._load();
                
            };
            this.dispatch = function(){
                this.isLoading = false;
                for(var i = 0,l= this.callbacks.length;i<l;i++)
                    this.callbacks[i]();

                this.callbacks=[];
            };
            this._load = function(){
                var _self = this;
                var unused = this.contexts[0];
                if( !unused )
                    return this.dispatch();

                var callback = unused.callback;
                var context  = unused.context;
                context.load(function(ns){
                    ns.provide = function(obj){
                        ns.provide = justThrow;
                        _self.contexts.shift();
                        _self.merge(obj)._load();
                    };
                    callback(merge(ns,_self.stash));
                });
            };
        }).apply(Klass.prototype); 
         
        var _loadStash = function(ns){
            if(!nsCache[ns]) throw('undefined namespace:' + ns);
            return nsCache[ns].stash;
        };
        var _loadStashItem = function(ns,itemName){
            var nsStash = _loadStash(ns);
            if( typeof(nsStash[itemName]) === 'undefined' )
                throw('undefined item:' + ns + '#' + itemName);

            return nsStash[itemName];
        }
        return {
            loadStash     : _loadStash,
            loadStashItem : _loadStashItem,
            create :function(fqn){
                _assertValidFQN(fqn);
                if( nsCache[fqn] )
                    return nsCache[fqn];
                var ns = nsCache[fqn] = new Klass(fqn);
                return ns;
            }
        };
    })();
    /* NamespaceContext Class */
    var NamespaceContext = (function(){
        var Klass = function _Private_Class_Of_NamespaceContext(namespaceObject){
            this.namespaceObject = namespaceObject;
            this.callbacks = [];
            this.requires  = [];
            this.useList   = [];
        };
        var _mergeUseData = (function(){
            var _loadImport = function(ns,imports){
                var retStash = {};
                for(var i = 0,l=imports.length;i<l;i++){
                    var importSyntax = imports[i];
                    if( importSyntax === '*' ) return Namespace.loadStash(ns);
                    retStash[importSyntax] = Namespace.loadStashItem(ns,importSyntax);
                }
                return retStash;
            };
            var _mergeWithNS = function(stash,ns){
                var nsList = ns.split(/\./);
                var current = stash;

                for(var i = 0,l=nsList.length;i<l-1;i++){
                    if( !current[nsList[i]] ) current[nsList[i]] = {};
                    current = current[nsList[i]];
                }

                var lastLeaf = nsList[nsList.length-1];
                if( current[lastLeaf] )
                    return merge( current[lastLeaf] , Namespace.loadStash(ns) );

                return current[lastLeaf] = Namespace.loadStash(ns);
            };
            return function(stash,useData){
                if( useData.imports ){
                    merge( stash , _loadImport(useData.ns,useData.imports));
                }else{
                    _mergeWithNS(stash,useData.ns);
                }
            };
        })();

        (function(){
            this.use = function(syntax){
                var splittedUseSyntax = syntax.split(/\s/);
                var fqn = splittedUseSyntax[0];
                var imp = splittedUseSyntax[1];
                var importNames = (imp) ? imp.split(/,/): null;

                _assertValidFQN(fqn);
                this.requires.push(Namespace.create(fqn));

                this.useList.push({ ns: fqn,imports: importNames });
                return this;
            };
            this.createContextualObject = function(){
                var useList = this.useList;
                var retObj  = {};
                for(var i=0,l=useList.length;i<l;i++) {
                    _mergeUseData(retObj,useList[i])
                }
                return retObj;
            };
            this.define = function(callback){
                var namespaceObject = this.namespaceObject;
                namespaceObject.appendContext(this,callback);
                return this.namespaceObject;
            };
            this.load = function(callback){
                var _self    = this;
                if( this.requires.length == 0 )
                    return callback( _self.createContextualObject() );
                
                var length = this.requires.length;
                var used   = 0;
                for(var i = 0;i<length;i++)(function(require){
                    require.load(function(){
                        if( length <= ++used )
                            callback( _self.createContextualObject() );
   
                    });
                })( this.requires[i] );

            };
            this.apply = function(callback){
                var namespaceObject = this.namespaceObject;
                this.use( [namespaceObject.name,'*'].join(' '));
                this.load(callback);
            };
        }).apply(Klass.prototype);
        return Klass;
    })();

    return function(nsString){
        return new NamespaceContext(Namespace.create(nsString || 'main'));
    };
})();
Namespace.use = function(useSyntax){ return Namespace().use(useSyntax); }
Namespace.fromInternal = (function(){
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
Namespace.GET = Namespace.fromInternal;
Namespace.fromExternal = (function(){
    var callbacks = {};
    var createScriptElement = function(url,callback){
        var scriptElement = document.createElement('script');
        scriptElement.src = url;
        scriptElement.loaded = false;
        
        scriptElement.onload = function(){
            scriptElement.loaded = true;
            callback();
        };
        scriptElement.onreadystatechange = function(){
            if( ('loaded'  === scriptElement.readyState || 'complete'=== scriptElement.readyState ) 
                && ! scriptElement.loaded ){
                scriptElement.loaded = true;
                callback();
            }                    
        };
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
