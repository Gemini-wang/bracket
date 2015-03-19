/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define('mvc.register',['mvc.interpolate'],function(require,e,module){
  var util=require('mvc.util'),isFunc=util.isFunc,domQuery=require('mvc.dom');
  var handlers=[];//require('mvc.store').compileHandlers;
  function register(opt){
    var name=domQuery.normalize(opt.name);
    util.arrInsert(handlers,{
      priority:opt.priority||0,
      name:name,
      link:isFunc(opt.link)?opt.link:noop
    },'priority');
  }

  module.exports={
    addCompiler:register,
    compilers:handlers
  };
  function noop(){

  }
});