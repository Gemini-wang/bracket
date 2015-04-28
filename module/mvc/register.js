/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define('mvc.register',['mvc.interpolate'],function(require,e,module){
  var util=require('mvc.util'),isFunc=util.isFunc;
  var handlers=[];
  function register(opt){
    var linkFunc=opt.link,handler;
    util.arrInsert(handlers,handler={
      priority:opt.priority||0,
      name:normalizeHandlerName(opt.name),
      template:opt.template,
      replace:opt.replace,
      restrict:(opt.restrict||'A').toUpperCase()
    },'priority',1);
    if(isFunc(linkFunc)){
      handler.link=linkFunc;
      linkFunc.priority=handler.priority;
    }
  }
  var namePrefix=['data-',''];

  module.exports={
    addCompiler:register,
    collectCompilers:function(element){
      var ret=[];
      handlers.forEach(function(definition){
        var res=definition.restrict,name=definition.name,add;
        if(res.indexOf('E')>-1 && element.tagName.toLowerCase()==name)
          add=1;
        if(!add&&res.indexOf('A')>-1)
          add=namePrefix.some(function(prefix){return element.hasAttribute(prefix+name)});
        if(add) util.arrAdd(ret,definition);
      });
      return ret;
    }
  };
  function normalizeHandlerName(name){
    return name.replace(/[A-Z]/g,function(str){return '-'+str})
  }
});