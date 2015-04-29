/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define('mvc.register',['mvc.interpolate'],function(require,e,module){
  var util=require('mvc.util'),isFunc=util.isFunc,controllerDep={};
  var handlers=[];
  function register(opt){
    var linkFunc=opt.link,handler,ctrlName;
    util.arrInsert(handlers,handler={
      priority:opt.priority||0,
      name:normalizeHandlerName(opt.name),
      template:opt.template,
      templateSelector:opt.templateSelector,
      replace:opt.replace,
      controller:ctrlName=opt.controller,
      restrict:(opt.restrict||'AE').toUpperCase()
    },'priority',1);
    if(isFunc(linkFunc)){
      handler.link=linkFunc;
      linkFunc.priority=handler.priority;
    }
    if(typeof ctrlName=="string")
      controllerDep[ctrlName]=depSelectors(handler.name,handler.restrict)
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
    },
    getDependencies:function(element,ret){
      ret=ret||[];
      util.forEach(controllerDep,function(selectors,depName){
        if(selectors.some(function(sle){return element.querySelector(sle)}))
          util.arrAdd(ret,depName);
      });
      return ret;
    }
  };
  function depSelectors(dirName,restrict){
    var ret;
    ret= restrict.indexOf('A')? namePrefix.map(function(pre){return '*['+ pre+dirName+']'}):[];
    if(restrict.indexOf('E')>-1)ret.push(dirName);
    return ret;
  }
  function normalizeHandlerName(name){
    return name.replace(/[A-Z]/g,function(str){return '-'+str})
  }
});