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
        return define;
      }
      define.define=define;
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

/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.binding',['mvc.parser'],function(require){
  var util=require('mvc.util'),parser=require('mvc.parser'),arrAdd=util.arrAdd;
  function Binding(expression){
    if(!(this instanceof Binding))return new Binding(expression);
    if(typeof expression==="string")
      expression=parser.parse(expression);
    this.expression=expression;
    this.$$actions=[];
  }
  Binding.prototype={
    update:function(controller){
      var cur=this.$$currentValue=this.get(controller),last=this.$$lastValue;
      if(!util.equals(cur,last))
        util.objEmit(this,'update',[cur,last,controller],null);
      return this.$$lastValue=this.$$currentValue;
    },
    get:function(controller){
      return this.expression.get(controller);
    },
    addAction:function(actFunc,once){
      util.objOn(this,'update',actFunc,once);
      return this;
    },
    merge:function(binding){
      if(binding.expression.id!==this.expression.id)
        throw Error('cannot merge binding of different ids');
      var actions=this.$$actions;
      binding.$$actions.forEach(function(action){arrAdd(actions,action)});
      return this;
    }
  };
  Binding.global=window;
  return Binding;
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.controller',['mvc.binding'],function(require){
   var util=require('mvc.util'),Binding=require('mvc.binding'),parser=require('mvc.parser'),isFunc=util.isFunc,forEach=util.forEach,observe;
   function Controller(opt){
     if(!(this instanceof Controller))return new Controller(opt);
     opt=opt||{};
     this.$$bingdings={};
     this.$$parent=opt.parent;
     this.$$children=[];
     this.$$root=opt.root||this;
     this.$$phrase='valid';
     this.$this=this;
     this.$update();
     observe(this);
   }
  Controller.prototype={
    $on:function(name,handler){
      return util.objOn(this,name,handler)
    },
    $$get:function(exp){
      return ensureExp(exp).get(this)
    },
    $$set:function(exp,value){
      this.$update();
      return ensureExp(exp).set(this,value);
    },
    $upward:function(name,args){
      var p=this.$$parent;
      if(p){
        util.objEmit(p,name,args);
        p.$upward(name,args);
      }
      return this;
    },
    $broadcast:function(name,args){
      this.$$children.forEach(function(childCtrl){
        util.objEmit(childCtrl,name,args);
        childCtrl.$broadcast(name,args);
      });
      return this;
    },
    $destroy:function(){
      var root=this.$$root,parent=this.$$parent;
      if(this.$$phrase!=='destroyed'){
        if(parent){
          util.arrRemove(parent.$$children,this);
          this.$$parent=null;
          this.$$phrase='destroyed';
        }
        if(root)root.$update();
      }
    },
    $$new:function(){
      var child=Object.create(this);
      Controller.call(child,{parent:this,root:this.$$root});
      this.$$children.push(child);
      return child;
    },
    $bind:function(binding,watchFunc,once){
      var b,expId;
      if(typeof binding=='string')
        binding=new Binding(binding);
      b=(b=this.$$bingdings[expId=binding.expression.id])? b.merge(binding): (this.$$bingdings[expId]=binding);
      b.addAction(watchFunc,once);
      return this;
    },
    $update:function(){
      if(this.$$phrase=='valid'){
        var p;
        this.$$phrase='invalid';
        if((p=this.$$root)==this)
          window.requestAnimationFrame(function(){refreshController(p)});
        else if(p){
          p.$update();
        }
      }
    }
  };
  function ensureExp(exp){
    if(exp instanceof Binding)return exp.expression;
    if(typeof exp==="string")return parser.parse(exp);
    return exp;
  }
  function refreshController(ctrl){
    ctrl.$$phrase='updating';
    forEach(ctrl.$$bingdings,function(binding){ binding.update(ctrl); });
    ctrl.$$children.forEach(refreshController);
    ctrl.$$phrase='valid';
  }
  var ignoreProperties='$$phrase';

  observe=isFunc(Object.observe)?function(obj){
      Object.observe(obj,function(changelist){
     if(changelist.some(function(change){return ignoreProperties.indexOf(change.name)==-1}))
       obj.$update();
    })
  }:function noop(){ };
  return Controller;


});
/**
 * Created by Administrator on 2015/3/16.
 */
bracket.define('mvc.ast',['mvc.util'],function(require,exports){
  var util=require('mvc.util'),isFunc=util.isFunc;
  function inherit(Constructor,proto){
    util.inherit(Constructor,Ast.prototype,proto);
  }
  function Ast(){
  }
  function ThisAst(thisObj){
    this.thisObj=thisObj;
  }
  function ConstAst(value){
    this.value=value;
  }
  function InvokeAst(nameAst,paramAsts){
    this.params=paramAsts?paramAsts.slice():[];
    var bin=asBinary(nameAst);
    this.caller=bin.caller;
    this.callee=bin.callee;
  }
  function AccessAst(proName){
    this.propertyNames=proName?(proName instanceof Array?proName.slice():[proName]):[];
  }
  function StatementAst(exp){
    this.asts=exp?[exp]:[];
  }
  function BinaryAst(left,action,right){
    this.left=left||new ThisAst();
    this.right=right;
    this.action=action;
  }
  function AlternativeAst(condition,assert,reject){
    this.condition=condition;
    this.assert=assert;
    this.reject=reject;
  }
  Ast.prototype={
    get:function(){},
    reduce:function(){return this;},
    operate:function(action,right,third){
      return new BinaryAst(this,action,right);
    },
    set:function(){},
    type:'ast'
  };

  inherit(AlternativeAst,{
    type:'alter',
    get:function(context){
      return this.condition.get(context)? this.assert.get(context):this.reject.get(context)
    }
  });
  inherit(ThisAst,{
      type:'this',
      get:function(context){
      return this.thisObj||context
    }});
  inherit(ConstAst,{
    get:function(){return this.value},
    toString:function(){return this.value+''},
    type:'const'
  });
  inherit(AccessAst,{
    get:function(context){
      return getContextProperty(context,this.propertyNames);
    },
    addProperty:function(name){
      this.propertyNames.push(name);
      return this
    },
    operate:function(action,right){
      return  action=='.'&& right instanceof ConstAst?
       this.addProperty(right.value):  new BinaryAst(this,action,right);
    },
    set:function(context,value){
      var pros=this.propertyNames, target,len;
      if((len=pros.length)&&(target=getContextProperty(context,pros.slice(0,len-1))))
       return target[pros[len-1]]=value;
    },
    type:'access'
  });
  function asBinary(ast){
    var caller,callee,pros,right;
    if(ast instanceof BinaryAst && ast.action=='.'){
      caller=ast.left;
      callee=(right=ast.right) instanceof ConstAst? new AccessAst(right.value):right;
    }else if(ast instanceof AccessAst&& (pros=ast.propertyNames).length>1){
      caller=new AccessAst(pros.slice(0,pros.length-1));
      callee=new AccessAst(pros[pros.length-1])
    }else{
      caller=new ThisAst();
      callee=ast;

    }
    return {caller:caller,callee:callee}
  }
  inherit(InvokeAst,{
    get:function(context){
      var caller=this.caller.get(context),callee;
      if(caller&&isFunc(callee=this.callee.get(caller)))
        return callee.apply(caller,this.params.map(function(exp){return exp.get(context)}));
    },
    type:'invoke'
  });
  inherit(BinaryAst,{
    type:'binary',
    get:function(context){
      var left=this.left.get(context),right=this.right,act=this.action;
      if(act==='||'&&left)return left;
      else if(act=='!')return !left;
      right=right.get(context);
      switch (act=this.action){
        case '||':return right;
        case  '&&':return left&&right;
        case '!=':return left!=right;
        case  '!==':return left!==right;
        case '===':return left===right;
        case '==':return left==right;
        case '.':return left[right];
        case '>':return left> right;
        case '<': return left <right;
        case '<=': return left<=right;
        case '>=':return left>=right;
        default :throw Error('not support:'+act);
      }
    },
    set:function(context,value){
      var left;
      if(this.action==='.'&&(left=this.left.get(context)))
       return left[this.right.get(context)]=value;
    },
    reduce:function(){return reduceBinaryAst(this)}
  });
  inherit(StatementAst,{
    add:function(ast){
      if(ast=ast.reduce())
        this.asts.push(ast);
      return this;
    },
    get:function(context){
      return this.asts.reduce(function(pre,ast){
        return ast.get(context);
      })
    },
    reduce:function(){
      return reduceStatement(this)
    }
  });
  function getContextProperty(context,proNames){
    var ret=context;
    for(var i= 0,names=proNames,name=names[0];name!==undefined&&ret!==undefined;name=names[++i])
      if((ret=ret[name])===undefined)break;
    return ret;
  }
  function reduceStatement(statement){
    var asts=statement.asts=statement.asts.map(function(a){return a.reduce()}).filter(function(a){return a}),len=asts.length;
    if(len) return len==1?asts[0]:statement;
  }
  function reduceBinaryAst(ast){
    var right=ast.right,left=ast.left,ret=ast,act=ast.action;
    if(right instanceof BinaryAst)right=reduceBinaryAst(right);
    if(left instanceof BinaryAst)left=reduceBinaryAst(left);
    if(act=='.'){
      if(left instanceof AccessAst&&right instanceof ConstAst)
        ret=new AccessAst(left.propertyNames).addProperty(right.value);
      else if(left instanceof ThisAst&&!left.thisObj){
        if(right instanceof ConstAst)ret=new AccessAst(right.value);
        else if(right instanceof AccessAst) ret=new AccessAst(right.propertyNames);
      }
    }
    return ret;
  }
  exports.Ast=Ast;
  exports.This=ThisAst;
  exports.Binary=BinaryAst;
  exports.Const=ConstAst;
  exports.Invoke=InvokeAst;
  exports.Access=AccessAst;
  exports.Alter=AlternativeAst;
  exports.Statement=StatementAst;
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.compile',['mvc.register'],function(require,exports){
  var domQuery=require('mvc.dom'),util=require('mvc.util'),interpolate=require('mvc.interpolate').interpolateElement,isFunc=util.isFunc;
  var getCompilers=require('mvc.register').collectCompilers;
  function compileElement(element,controller){
    var attr=domQuery.attrMap(element),eleCtrl,linkFns=[],compilers=getCompilers(element);
    if(eleCtrl=initController(attr['brController'],controller)||controller){
      compilers.forEach(compile);
      linkFns.sort(function(a,b){return b.priority-a.priority}).forEach(function(link){link(eleCtrl,element,attr) });
      interpolate(eleCtrl,element,attr);
    }
    util.mkArr(element.children).forEach(function(child){
      compileElement(child,eleCtrl,element)
    });
    if(element.$$shouldRemove)
      element.parentElement.removeChild(element);
    return {controller:eleCtrl,element:element,attributes:attr};
    function compile(compiler){
      var val,linkFunc;
      if(val=compiler.templateSelector){
        val=document.querySelector(val);
        if(!val) throw Error('templateSelector:'+compiler.templateSelector+' not found matched element');
        compiler.template=val.innerHTML;
        compiler.templateSelector=null;
      }
      if(val=compiler.template){
        if(compiler.replace){
          var e=document.createElement('div'),replacedElement;
          e.innerHTML=val;
          if(e.children.length!==1) throw Error('should be replaced with one element');
          replacedElement=e.children[0];
          compilers.push.apply(compilers,getCompilers(replacedElement));//not sort
          element.parentElement.replaceChild(replacedElement,element);
          element=replacedElement;
        }
        else element.innerHTML=val;
      }
      eleCtrl=initController(compiler.controller,eleCtrl)||eleCtrl;
      if(isFunc(linkFunc=compiler.link))
        linkFns.push(linkFunc);
    }
  }
  function initController(ctrlNameOrFunc,parentController){
    var ctrlFunc,ret;
    if(ctrlNameOrFunc){
      ctrlFunc=isFunc(ctrlNameOrFunc)? ctrlNameOrFunc:require(ctrlNameOrFunc);
      if(!isFunc(ctrlFunc))throw Error('controller must be a function');
      ctrlFunc.call(ret=parentController.$$new(),ret);
    }
    return ret;
  }
  exports.compile=compileElement;
});
/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define('mvc.debug',function(r,e,module){
  var enabled=false;
  module.exports={
    enable:function(enable){
      return enabled=(enable!==false);
    },
    stop:function(){
     if(enabled)debugger;
    },
    error:function(err){
      throw err;
    }
  }
});
/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  var addCompiler=require('mvc.register').addCompiler;
  addCompiler({
    name:'br-class',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brClass'],function(newClass,oldClass){
        if(oldClass)
          element.classList.remove(oldClass);
        if(newClass)
          element.classList.add(newClass);
      })
    }
  });
  addCompiler({
    name:'br-src',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brSrc'],function(newClass){
        if(newClass) element.setAttribute('src',newClass)
      })
    }
  });
  addCompiler({
    name:'br-show',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brShow'],function(show){
         element.style.display=show? '':'none';
      })
    }
  });
  addCompiler({
    name:'br-disabled',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brDisabled'],function(disabled){
        disabled? element.setAttribute('disabled',1):element.removeAttribute('disabled');
      })
    }
  })
});
/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  var util=require('mvc.util'),isFunc=util.isFunc,addCompiler=require('mvc.register').addCompiler,getExp=require('mvc.parser').parse;
  'click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste'.split(' ').forEach(function(evt){
    defineEvent(evt,true);
  });
  function capital(word){
    return word[0].toUpperCase()+word.slice(1)
  }
  function defineEvent(name,autoUpdate){
    addCompiler({
      name:'br-'+name,
      link:function(ctrl,element,attr){
        try{
          var exp=getExp(attr['br'+capital(name)]);
          function invoke(e){
            ctrl.$event=e;
            exp.get(ctrl);
            ctrl.$event=null;
            ctrl.$update();
          }
          element.addEventListener(name,invoke);
          //should remove event listener?
          element.addEventListener('unload',function(){
            element.removeEventListener(name,invoke)
          });
        }
        catch (ex){
          console.error(ex);
        }
      }
    });
  }
});
/**
 * Created by Administrator on 2015/3/19.
 */
bracket.define(['mvc.register'],function(require){
  var bind=require('mvc.binding');
  function convert(val,type){
    switch (type){
      case 'number':return (+val)||'';
      case 'boolean':return !!val;
      default :return val+'';
    }
  }
  require('mvc.register').addCompiler({
    name:'br-model',
    link:function(ctrl,element,attr){
      var exp=attr['brModel'],binding=bind(exp),initValue,type;
      if((initValue=binding.get(ctrl))!==undefined)
        type=typeof (element.value=initValue);
      ctrl.$bind(binding,function(val){
        if(val!==undefined)
          ctrl[exp]=element.value=val;
      });
      element.addEventListener('blur',function(){
        var refreshedValue=convert(element.value,type);
        if(ctrl.$$get(binding)!==refreshedValue){
          ctrl.$$set(binding,refreshedValue);
        }
      })
    }
  })
});
/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define(['mvc.compile'],function(require){
  var compiler=require('mvc.compile'),util=require('mvc.util'),dom=require('mvc.dom');

  function createComment(element,exp){
    var end,p=element.parentElement;
    p.insertBefore(document.createComment('bracket-repeat '+exp),element);
    p.insertBefore(end=document.createComment('bracket-repeat end'),element.nextSibling);
    return end;
  }
  require('mvc.register').addCompiler({
    name:'br-repeat',
    priority:1000,
    link:function(parentCtrl,ele,attr){
      var exp=attr['brRepeat'],match= exp.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
      if(!match) throw Error('repeat exp should like: item in items (track by item.id)');
      var endNode=createComment(ele,exp),template=ele.cloneNode(true);
      dom.removeAttribute(template,'br-repeat');
      ele.$$shouldRemove=1;
      var watchExp=match[2],itemExp=match[1],trackExp=match[3],lastBlock={},lastEles=[];
      parentCtrl.$bind(watchExp,function(newCollection,old){
        newCollection=util.mkArr(newCollection)||[];
        var curBlock={},elements=newCollection.map(function(model,i){
         //require('mvc.debug').stop();
          if((last=lastBlock[i])&&last.model===model)
          {
            curBlock[i]=result=last;
            lastEles[i]=undefined;
          }
          else{
            var result=compiler.compile(template.cloneNode(true),parentCtrl.$$new()),ctrl=result.controller;
            if(!ctrl[itemExp])ctrl[itemExp]=model;
            curBlock[ctrl.$index=i]={
              element:result.element,
              controller:result.controller,
              model:model
            };
            if(last){
              last.controller.$destroy();
            }
          }
          return result.element;
        }),last;
        lastBlock=curBlock;
        dom.insertBefore(endNode,elements,lastEles);
        lastEles=elements;
      })
    }
  })
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.dom',['mvc.util'],function(require){
  var util=require('mvc.util'),TEXT_NODE=Node.TEXT_NODE;
  function normalizeAttrName(name){
    return name.toLowerCase().replace(/^data\-/,'').replace(/\-[a-z]/g,function(src){
      return src[1].toUpperCase()
    })
  }
  function insertBefore(end,eles,removeEles){
    var parent=end.parentElement, i,pre=end,ele;
    for(i= eles.length-1;i>=0;i--){
      if(!parent.contains(ele=eles[i]))
        parent.insertBefore(ele,pre);
      pre=ele;
    }
    if(removeEles)
      removeEles.forEach(function(ele){if(ele)parent.removeChild(ele)});
  }
  function normalizeEleAttr(element){
    return util.arrReduce(element.attributes,function(map,node){
      map[normalizeAttrName(node.name)]=node.value;
      return map
    },{})
  }
  function $(slt,element){
    return util.mkArr((element||document).querySelectorAll(slt))
  }
  function expandName(attrName){
    return [attrName,'data-'+attrName]
  }
  function getAttr(element,attrName,more){
    var ret,names=expandName(attrName);
    for(var i= 0,len=more?names.length:1;i<len;i++){
      if((ret=element.getAttribute(names[i]))!==null)return ret;
    }
    return null;
  }
 return{
    $:$,
    getAttr:getAttr,
    removeAttribute:function(ele,name){
      expandName(name).some(function(attrName){
        if(ele.hasAttribute(attrName)){
          ele.removeAttribute(attrName);
          return true;
        }
      })
    },
    attrMap:normalizeEleAttr,
    normalize:normalizeAttrName,
   insertBefore:insertBefore,
    textNodes:function(element){
      return util.arrFilter(element.childNodes,function(node){
        return node.nodeType===TEXT_NODE;
      })
    }
  }
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.interpolate',['mvc.controller','mvc.dom'],function(require,exports){
  var Binding=require('mvc.binding'),forEach=require('mvc.util').forEach,textNodes=require('mvc.dom').textNodes;
  var localBindingRegExp=/\{\{(::)?(.*?)\}\}/g;
  exports.getBinding=function(input){
    var global,exp=input;
    input.replace(localBindingRegExp,function(src,match){
      global=exp=match;
    });
    return Binding(exp);
  };
  exports.interpolateElement=function(controller,element,attr){
    var hasUsedAttrs=Object.getOwnPropertyNames(attr).map(function(name){return attr[name]});
    forEach(element.attributes,function(attrNode){
      if(hasUsedAttrs.indexOf(attrNode)==-1)
        interpolateNode(attrNode,'value');
    });
    textNodes(element).forEach(function(textNode){
     interpolateNode(textNode,'textContent');
    });
    function interpolateNode(node,valuePro){
      var templateValue=node[valuePro];
      if(localBindingRegExp.test(templateValue)){
        forEach(bindingExps(templateValue),function(exp,expSource){
          controller.$bind(exp.expression,function(val){
            if(val!==undefined)
              node[valuePro]=templateValue.split(expSource).join(val);
          },exp.once)
        })
      }
    }
  };
  function bindingExps(input){
    var exps={};
    input.replace(localBindingRegExp,function(src,once,match){
       exps[src]={ once:!!once,expression:match };
    });
   return exps;
  }
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('bracket.mvc',['mvc.compile','mvc.dom'],function(require){
  var domQuery=require('mvc.dom'),util=require('mvc.util'),arrAdd=util.arrAdd,getAttr=domQuery.getAttr,
    compile=require('mvc.compile').compile,define=bracket.define,Controller=require('mvc.controller'),
    getDirDependencies=require('mvc.register').getDependencies;
  var appConfigMap={},waiting={};
  function initApp(appName,callback){
    if(!util.isFunc(callback))callback=noop;
    if(waiting){
      var cbs=waiting[appName]||(waiting[appName]=[]);
      arrAdd(cbs,callback)
    }else{
      var appElement=domQuery.$('*[br-app="!"]'.replace('!',appName))[0],requires;
      if(appElement){
        configApp(appName,{require:getAttr(appElement,'bracket-require',1)});
        requires=appConfigMap[appName].require;
        domQuery.$('*[br-controller]',appElement).forEach(function(child){
          addRequire(requires,getAttr(child,'br-controller'))
        });
        getDirDependencies(appElement,requires);
        define(requires.slice(),function(){
          var ret=compile(appElement,new Controller());
          if(util.isFunc(callback))callback(ret);
        })
      }
      else
        console.warn('element with br-app='+appName+' not found');
    }
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
      if(typeof input=="string")input=input.split(/\b\s+\b/).map(function(s){return s.trim()});
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
  function noop(){}
  document.addEventListener('DOMContentLoaded',function(){
    var pending=waiting;
    waiting=null;
    util.forEach(pending,function(cbs,name){
      initApp(name,function(result){
        cbs.forEach(function(call){call(result)})
      })
    })
  });
  return bracket.mvc={
    init:initApp,
    configApp:configApp
  }
});
/**
 * Created by Administrator on 2015/3/20.
 */
bracket.define('mvc.parser',['mvc.ast'],function(require,exports){
  /*
  * transform form jison https://github.com/zaach/jison
  * LL(0) Parser
  */
  var ast=require('mvc.ast'),util=require('mvc.util'),cache={},
    TOKEN={CONST:'CONST',PUNC:"OPT",SEP:";",ID:"ID",EOF:'EOF'};
  var puncExp=/^(\[|]|\(|\)|,|!={0,2}|={2,3}|&{1,2}|\?|:|\|{1,2}|\.|<=?|>=?)/,
    sep=';',
    whitespaceExp=/^[\s\t\r\n\f]+/,
    constRegExp=/^(true|false|null|undefined)/,
    numberExp=/^(\-?(\d*\.\d+|\d+))/,
    idRegExp=/^[a-z_$][a-z0-9_$]*/i,
    strExp=/^('|").*?\1/;
  function convertConst(str){
    switch (str){
      case 'false':return false;
      case 'true':return true;
      case 'null':return null;
      case 'undefined':return void 0;
      default:throw '';
    }
  }
  function Token(value,type,index,symbol){
    this.value=value;
    this.type=type;
    this.index=index;
    this.symbol=symbol;
  }
  Token.prototype={
   toString:function(){return this.value+''}
 };
  function Tokenizer(input){
    this.currentInput=this.input=input;
  }
  Tokenizer.prototype={
    error:function(){
      throw Error('parse error in:'+this.input.slice(0,this.input.length-this.currentInput.length+1))
    },
    getIndex:function(){
      return this.input.length-this.currentInput.length;
    },
    lex:function(){
      var match,matched,input,self=this;
      while(!this.end()&&(input=this.skip())){
        if(isConst())return getToken(TOKEN.CONST,convertConst(matched));
        else if(isIdentifier()) return getToken(TOKEN.ID,matched);
        else if(isString())return getToken(TOKEN.CONST,matched.substr(1,matched.length-2));
        else if(isNumber()) return getToken(TOKEN.CONST,+matched);
        else if(isPunctuation()) return getToken(TOKEN.PUNC,matched);
        else if(isSeparator())return getToken(TOKEN.SEP,';');
        else this.error();
      }
      this.done?  matched='$end':this.done=!!(matched='EOF');
      return new Token(matched,TOKEN.EOF,self.getIndex(),matched);
      function getToken(type,value){
        self.currentInput=input.substr(matched.length);
        // symbol: == != !== === >= <= > <  && ||
        // "OPT" for all
        // symbol: ,! () [] ? : ,
        // the same with their literal
        return new Token(value,type,self.getIndex(),type===TOKEN.PUNC? (symbols.indexOf(value)==-1?TOKEN.PUNC:value):type)
      }
      function matchReg(reg){
        return (match=input.match(reg))&&(matched=match[0]);
      }
      function isConst(){
        return matchReg(constRegExp);
      }
      function isIdentifier(){
        return matchReg(idRegExp)
      }
      function isNumber(){
        return matchReg(numberExp)
      }
      function isString(){
        return matchReg(strExp);
      }
      function isPunctuation(){
        return matchReg(puncExp)
      }
      function isSeparator(){
        return input[0]==';'&&matched==';';
      }
    },
    end:function(){
      return this.currentInput.length==0;
    },
    skip:function(){
      return this.currentInput=this.currentInput.replace(whitespaceExp,'');
    }
  };
  function parse(input,TokenizerFunc){
    var tokenizer=new TokenizerFunc(input), state,vstack=[],stack=[0],token,len,action,symbol,ret;
    while(1){
      state=stack[stack.length-1];
      if(!(action=defaultActions[state])){
        if(isNaN(symbol))
          symbol=symbols.indexOf((token=tokenizer.lex()).symbol);
        action=table[state]&& table[state][symbol];
      }
      if(!action||!action.length||!action[0])
        error(token);
      if(action[0]==1){//shift
        stack.push(symbol);
        vstack.push(token.value);
        stack.push(action[1]);
        symbol=NaN;
      }
      else if(action[0]==2){ //reduce
        len=productions[action[1]][1];
        ret=performAction(action[1],vstack)||vstack[vstack.length-len];
        if(len){
          stack=stack.slice(0,-1*len*2);
          vstack=vstack.slice(0,-1*len);
        }
        stack.push(productions[action[1]][0]);
        vstack.push(ret);
        stack.push(table[stack[stack.length-2]][stack[stack.length-1]]);
      }
      else
        return ret;
    }
    function error(){
      throw Error('parse error in:'+ input.substr(token.index-5,5));
    }
    function performAction(state,$$){
      var $0 = $$.length - 1;
      switch (state) {
        case 2:
          return new ast.Const($$[$0]);
        case 3:
          return new ast.Access($$[$0]);
        case 5:
          return $$[$0-2].operate('.',new ast.Const($$[$0]));
        case 6:
          return $$[$0-3].operate('.',$$[$0-1]);
        case 7:
          return $$[$0].operate('!');
        case 8:
          return $$[$0-2].operate($$[$0-1],$$[$0]);
        case 9:
          return new ast.Alter($$[$0-4],$$[$0-2],$$[$0]);
        case 10:
          return $$[$0-1];
        case 11:
          return [$$[$0]];
        case 12:
          $$[$0-2].push($$[$0]);
          break;
        case 13:
          return new ast.Invoke($$[$0-2]);
        case 14:
          return new ast.Invoke($$[$0-3],$$[$0-1]);
      }
    }
  }

  exports.parse=function(input){
    var statement=cache[input=input.trim()];
    if(!statement){
      statement=new ast.Statement();
      input.split(/;/g).forEach(function(expInput){
        if(expInput=expInput.trim())
          statement.add(parse(expInput,Tokenizer))
      });
      cache[input]=statement=statement.reduce();
      statement.id=input;
    }
    return statement
  };

  exports.token=function(input){
    var results=[],tokenizer=new Tokenizer(input);
    while(!tokenizer.done)results.push(tokenizer.lex());
    return results;
  };
  var symbols=["$accept", "$end", "error", "exp", "value", "EOF", "CONST", "ID", "func", ".", "[", "]", "!", "OPT", "?", ":", "(", ")", "params", ","],
    table,productions=[0,[3,2],[4,1],[4,1],[4,1],[4,3],[4,4],[4,2],[4,3],[4,5],[4,3],[18,1],[18,3],[8,3],[8,4]],
    defaultActions={8:[2,1]};
  (function(){
    var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,3],$V1=[1,4],$V2=[1,6],$V3=[1,7],$V4=[1,9],$V5=[1,10],$V6=[1,11],$V7=[1,12],$V8=[1,13],$V9=[5,9,10,11,13,14,15,16,17,19],$Va=[5,11,13,14,15,17,19],$Vb=[17,19];
    table=[{3:1,4:2,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{1:[3]},{5:[1,8],9:$V4,10:$V5,13:$V6,14:$V7,16:$V8},o($V9,[2,2]),o($V9,[2,3]),o($V9,[2,4]),{4:14,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:15,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{1:[2,1]},{7:[1,16]},{4:17,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:18,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:19,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:22,6:$V0,7:$V1,8:5,12:$V2,16:$V3,17:[1,20],18:21},o($Va,[2,7],{9:$V4,10:$V5,16:$V8}),{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8,17:[1,23]},o($V9,[2,5]),{9:$V4,10:$V5,11:[1,24],13:$V6,14:$V7,16:$V8},o($Va,[2,8],{9:$V4,10:$V5,16:$V8}),{9:$V4,10:$V5,13:$V6,14:$V7,15:[1,25],16:$V8},o($V9,[2,13]),{17:[1,26],19:[1,27]},o($Vb,[2,11],{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8}),o($V9,[2,10]),o($V9,[2,6]),{4:28,6:$V0,7:$V1,8:5,12:$V2,16:$V3},o($V9,[2,14]),{4:29,6:$V0,7:$V1,8:5,12:$V2,16:$V3},o([5,11,14,15,17,19],[2,9],{9:$V4,10:$V5,13:$V6,16:$V8}),o($Vb,[2,12],{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8})]
  })()
});
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