/**
 * Created by 柏子 on 2015/2/2.
 */
(
  function(){
    function moduleScope(){
      var resolved={},unresolved={},has=[],pending=[],resolving=[];
      function define(name,requires,func){
        if(arguments.length==1){
          func=arguments[0];
          requires=[];
          name='';
        }
        else if(arguments.length==2&&typeof arguments[1]=="function"){
          func=arguments[1];
          if(typeof arguments[0]=="string"){
            name=arguments[0];
            requires=[];
          }
          else {
            requires=arguments[0];
            name='';
          }
        }
        else if(arguments.length<3)throw Error('invalid arguments');
        tryResolve(func,name,requires);
      }
      define.require=function(name){
        return (!resolved.hasOwnProperty(name)&&!unresolved.hasOwnProperty(name))?undefined:require(name)
      };
      define.newContext=moduleScope;
      define.conflict=function(){
        console.log(pending);
      };
      function resolvePending(){
        var con=true,ex;
        while(con){
          con=false;
          pending=pending.filter(function(def){
            if(canResolve(def.requires)){
              try{
                resolve(def.invoke,def.name);
                con=true;
              }
              catch (err){
                ex=err;
              }
              return false;
            }
            return true;
          });
          if(ex)throw ex;
        }
      }
      function tryResolve(invoke,name,requires){
        if(canResolve(requires))
        {
          resolve(invoke,name);
          resolvePending();
        }
        else{
          var def={invoke:invoke,requires:requires,name:name};
          if(name)unresolved[name]=def;
          pending.push(def);
        }
      }
      function resolve(invoke,name){
        var exports={},module={},definition,ret;
        if(!invoke){
          if(definition=unresolved[name])
            invoke=definition.invoke;
          else throw  Error('can not find module:'+name);
        }
        if(name){
          if(resolving.indexOf(name)>-1)
            throw Error('circular dependencies:',resolving.join('->'));
          resolving.push(name);
        }
        try{
          return ret=invoke(require,exports,module)||module.exports||exports;
        }
        catch (ex){
          throw ret=ex;
        }
        finally{
          if(definition)
            delete unresolved[name];
          if(name){
            resolving.splice(resolving.indexOf(name),1);
            has.push(name);
            resolved[name]=ret;
          }
        }
      }
      function canResolve(requires){
        return requires.every(function(name){
          return has.indexOf(name)>-1
        })
      }
      function require(name){
        return resolved[name]||resolve(null,name);
      }
      return define
    }
    window.bracket={
      define:moduleScope()
    }
  }
)();
