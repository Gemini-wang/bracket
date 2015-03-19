/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('bracket.mvc',['mvc.compile','mvc.dom'],function(require){
  var domQuery=require('mvc.dom'),util=require('mvc.util'),arrAdd=util.arrAdd,trim=require('mvc.parser').trim,
    getAttr=domQuery.getAttr,compile=require('mvc.compile').compile,define=bracket.define,Controller=require('mvc.controller');
  var appConfigMap={ };
  function initApp(appName,callback){
    var appElement=domQuery.$('*[bracket-app="!"]'.replace('!',appName))[0],requires;
    if(appElement){
      configApp(appName,{require:getAttr(appElement,'bracket-require',1)});
      requires=appConfigMap[appName].require;
      domQuery.$('*[bracket-controller]',appElement).forEach(function(child){
        addRequire(requires,getAttr(child,'bracket-controller'))
      });
      define(requires.slice(),function(){
        var ret=compile(appElement,new Controller());
        if(util.isFunc(callback))callback(ret);
      })
    }
    else
      console.warn('element with bracket-app='+appName+' not found');
  }
  function configApp(appName,config){
    var appConfig=getAppConfig(appName);
    if(appConfig&&config){
      addRequire(appConfig.require,config.require);
    }
    return appConfig;
  }
  function addRequire(arr,input){
    if(arr){
      if(typeof input=="string")input=input.split(/\b\s+\b/).map(trim);
      if( input instanceof Array) input.forEach(function(item){arrAdd(arr,item)})
    }
    return arr;
  }
  function getAppConfig(appName){
    if(appName){
      var appConfig=appConfigMap[appName];
      if(!appConfig){
        appConfig=appConfigMap[appName]={
          require:[]
        }
      }
      return appConfig
    }

  }
  return bracket.mvc={
    init:initApp,
    configApp:configApp
  }
});