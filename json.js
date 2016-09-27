;(function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.JSON = factory();
  }

}(this, function(require, exports, module) {
    function isArray(obj) { 
        return ({}).toString.call(obj) === '[object Array]'; 
    }
    function expend(r) {
        var getRef = function(o,$ref){  //获取$ref索引对象
            var t = $ref.split(".");
            if(t.length <= 1){
                return o
            }else{
                var m = $ref.match(/^(.*?)\.([^.]+)$/);
                return arguments.callee(o,m[1])[m[2]];
            }
        };

        (function(o){
            for(var k in o){
                if(o[k] && typeof o[k].$ref === 'string'){
                    o[k] = getRef(r,o[k].$ref.replace(/\[(\d+)\]/g,'.$1')); //有数组格式的数据要转化一下。
                }else if(typeof o[k] === 'object'){
                    arguments.callee(o[k]);
                }
            }
        })(r);
        return r;
    }
    function toFunction(r){
        (function(o){
            for(var k in o){
                if( ({}).hasOwnProperty.call(o,k) ){
                    var m;
                    if( typeof o[k] === 'string' ){
                        if( m = o[k].match(/javascript:function\s*\(\s*(.*?)\s*\)\s*\{([\s\S]*?)\}$/) ){
                            m.shift();
                            o[k] = Function.apply(this,m);
                        }
                    }else if(typeof o[k] === 'object'){
                        arguments.callee(o[k]);
                    }
                }
            }
        })(r);
        return r;
    }
    
    var objs = [], refs = [];

    var _JSON = {
        /**
         * 自定义stringify方法, 默认会将function 转化成"javascript:function" 打头的字符串
         * @param  {[JSON]} o       [源对象]
         * @param  {[String]} format  [格式化缩进]
         * @param  {[String]} ref [是否对循环引用对象使用 $ref 转换]
         * @param  {boolean} withFunction [是否使用function转换]
         * @return {[String]}
         */
        stringify : function(o, format, ref, withFunction){
            var tp = (null === o) ? 'undefined' : typeof o,
                callee = arguments.callee;

            if( this.stringify === callee ){    //如果是第一次的非递归调用, 初始化objs
                objs = [];
                refs = [];
            }
            switch(tp){
                case 'undefined':
                case 'number':
                case 'boolean': return o; 
                case 'string': return '"' + o.replace(/\\/g,'\\\\').replace(/"/g,'\"') + '"'; 
                case 'function': return withFunction ? ('"javascript:' + o.toString().replace(/\"/,'\\"').replace(/[\s\n\r]+/g,' ') + '"') : '{}';
                case 'object':
                    // 跟原生的JSON.stringify一样,对于循环调用的JSON抛出异常
                    for (var i = 0; i < objs.length; i++) {
                        if( objs[i] === o ){
                            if(!ref){
                                throw new Error("Converting circular structure to JSON");
                            }else{
                                return '{"$ref":"'+refs[i]+'"}';
                            }
                        }
                    }
                    objs.push(o);
                    refs.push(ref);
                default : 
                    if( isArray(o) ){
                        return (function(o){
                            var res = [];
                            for(var k = 0; k < o.length; k++){
                                res.push( callee( o[k],format, ref ? (ref+'.'+k):'', withFunction ) )
                            }
                            return format ? '[\n'+format+res.join(',\n').replace(/\n/g,'\n'+format)+'\n]' : '['+res.join(',')+']'
                        })(o);
                    }else{
                        return (function(o){
                            var res = [];
                            for(var k in o){
                                if( ({}).hasOwnProperty.call(o,k) ){
                                    res.push( "\"" + k + "\":" + callee( o[k],format, ref ? (ref+'.'+k):'', withFunction ) )
                                }
                            }
                            return format ? '{\n'+format+res.join(',\n').replace(/\n/g,'\n'+format)+'\n}' : '{'+res.join(',')+'}'
                        })(o);
                    }
                        
            }
        }
    };

    /**
     * 為jQuery-ajax中的get/post方法提供dataType:refJson支持
     */
    if(this.jQuery){
        jQuery.each( [ "get", "post" ], function( i, method ) {
            jQuery[ method ] = function( url, data, callback, type ) {
                // shift arguments if data argument was omitted
                if ( jQuery.isFunction( data ) ) {
                    type = type || callback;
                    callback = data;
                    data = undefined;
                }

                var _callback = callback;
                if ( type === 'refJson' && typeof callback === 'function' ){
                    type = 'json';
                    _callback = function(){
                        arguments[0] = expend(arguments[0]);
                        callback.apply(jQuery,arguments);
                    };
                }

                return jQuery.ajax({
                    url: url,
                    type: method,
                    dataType: type,
                    data: data,
                    success: _callback
                });
            };
        });
    }

    return {
        stringify: _JSON.stringify,
        parse: function (str, withFun) {
            var obj = JSON.parse(str);
            withFun && (obj = toFunction(obj));
            str.match(/"\$ref"\:/) && (obj = expend(obj));
            return obj;
        }
    };
}));