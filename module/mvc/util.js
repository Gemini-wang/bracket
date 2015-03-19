/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.util',['mvc.debug'],function(require,exports,module){
  var arr=[],isArr=Array.isArray;
  function forEach(object,callback,thisObj){
    var i=0,len;
    if (isObj(object)) {
        if (thisObj === void 0)thisObj = object;
        if(object instanceof Array) object.forEach(callback,thisObj);
        else if(len=object.length){
          for(;i<len;i++)
            callback.call(thisObj,object[i],i);
        }
        else
          for (var names = Object.getOwnPropertyNames(object), name = names[0]; name; name = names[++i])
            callback.call(thisObj,object[name], name);
      }
      return object;
  }
  function isFunc(any){
    return typeof any==="function"
  }
  function isObj(any){
    return any&&(typeof any =="object")
  }
  function inherit(constructor, baseproto, expando, propertyObj) {
    if (typeof  baseproto == "function")baseproto = new baseproto();
    baseproto = baseproto || {};
    var proto = constructor.prototype = Object.create(baseproto), proDes;
    if (expando)
      for (var i in expando) {
        proDes = Object.getOwnPropertyDescriptor(expando, i);
        if (proDes) Object.defineProperty(proto, i, proDes);
        else
          proto[i] = expando[i];
      }
    if (propertyObj)
       forEach(propertyObj, function (key, value) {
         Object.defineProperty(proto, key, value);
      });
    return constructor;
  }
  function arrAdd(array,item,first){
    if(array.indexOf(item)==-1){
      array[first?'unshift':'push'](item);
      return true
    }
  }
  function addEventListener(obj, evtName, handler,once) {
    if (typeof evtName == "string" && evtName && isFunc(handler)) {
      var cbs, hs;
      if (!obj.hasOwnProperty('$$callbacks'))obj.$$callbacks = {};
      cbs = obj.$$callbacks;
      if (!(hs = cbs[evtName]))hs = cbs[evtName] = [];
      return arrAdd(hs, once?warpOnceFunc(handler):handler);
    }
    return false;
  }
  function emitEvent(obj, evtName, argArray, thisObj) {
    var callbacks , handlers;
    if (!(obj.hasOwnProperty('$$callbacks')) || !(handlers = (callbacks = obj.$$callbacks)[evtName]))return false;
    if (!argArray)argArray = [];
    else if (!(argArray instanceof Array)) argArray = [argArray];
    if (thisObj === undefined) thisObj = obj;
    return callbacks[evtName] = handlers.reduce(function (next,call) {
      if(isFunc(call)&&call.apply(thisObj, argArray) !== -1)next.push(call);
      return next;
    },[])
  }
  function removeEventListener(obj, evtName, handler) {
    var cbs, hs,i;
    if (evtName === undefined)obj.$$callbacks={};
    else if ((cbs = obj.$$callbacks) && (hs = cbs[evtName]) && hs) {
      if (handler) {
        if((i=hs.indexOf(handler))>-1)
          hs[i]=null;
      }
      else cbs[evtName]=[];
    }
    return obj;
  }
  function warpOnceFunc(func){
    return function(){
      func.apply(this,arguments);
      return -1;
    }
  }
  function arrMapFun(f){
    var t=typeof f;
    if(t==='string'){
      return function(item){return item[f]}
    }else if(t==="function")return f;
    return function(item){return item}
  }
  function arrHas(arr,value,compare,looseEqual,thisObj){
    compare=arrMapFun(compare);
    return mkArr(arr).some(looseEqual?leq:seq,thisObj);
    function leq(item){return value==compare(item)}
    function seq(item){return value===compare(item)}
  }
  function arrFirst(arr,filter,thisObj){
    var ret,index;
    return mkArr(arr).some(function(item,i){
      if(filter(item)){
        ret=item;
        index=i;
        return true;
      }
    },thisObj)? {index:index,value:ret}:undefined
  }
  function arrInsert(arr,item,compare,des){
    var value=(compare=arrMapFun(compare))(item),info,retIndex=-1;
    if(info=arrFirst(arr,des?de:asc))
      arr.splice(retIndex=info.index,0,item);
    else if(!isArr(arr)||arr.indexOf(item)==-1)
      arr[retIndex=arr.length]=item;
    return retIndex;
    function asc(item){
      return value<compare(item)
    }
    function de(item){
      return value> compare(item)
    }
  }
  function mkArr(arrlike){
   return  isArr(arrlike)?arrlike: arr.slice.call(arrlike);
  }
  var uidCache={};
  function uid(key){
    return uidCache[key]? (uidCache[key]=++uidCache[key]):(uidCache[key]=1);
  }
  module.exports={
    inherit:inherit,
    forEach:forEach,
    isObj:isObj,
    isFunc:isFunc,
    arrAdd:arrAdd,
    objOn:addEventListener,
    objOff:removeEventListener,
    objEmit:emitEvent,
    arrHas:arrHas,
    arrInsert:arrInsert,
    arrFirst:arrFirst,
    uid:uid,
    arrRemove:function(arr,item,all){
      var i;
      do{
        if((i=arr.indexOf(item))>-1)
          arr.splice(i,1);
        else break;
      }while(all);
    },
    equals:function(a,b){
      if(a===b){
        var ta=typeof a;
        //function is not equal because it can return different value
        return ta==="string"||ta==="number"
      }
      return false
    },
    empty:function(val){
      return !!val&&Object.getOwnPropertyNames(val).length==0
    },
    mkArr:mkArr
  };
  forEach(Array.prototype,function(func,name){
    var funcName;
    if(isFunc(func)){
      funcName='arr'+name[0].toUpperCase()+name.slice(1);
      module.exports[funcName]=function(){
        return func.apply(arguments[0],arr.slice.apply(arguments,[1]));
      }
    }
  })
});