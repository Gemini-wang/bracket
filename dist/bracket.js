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

/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.binding',['mvc.parser'],function(require){
  var util=require('mvc.util'),parser=require('mvc.parser'),arrAdd=util.arrAdd,isFunc=util.isFunc;
  function Binding(expression){
    if(!(this instanceof Binding))return new Binding(expression);
    if(typeof expression==="string")
      expression=parser.parse(expression);
    this.expression=expression;
    this.$$actions=[];
  }
  Binding.prototype={
    get id(){
      return this.expression.id
    },
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
      if(binding.id!==this.id)throw Error('cannot merge binding of different ids');
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
   var util=require('mvc.util'),Binding=require('mvc.binding'),isFunc=util.isFunc,forEach=util.forEach,observe;
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
    $upward:function(name,args){
      var p=this.$$parent;
      if(p){
        util.objEmit(p,name,args);
        p.$upward(name,args);
      }
      return this;
    },
    $broadcast:function(name,args){
      this.$$children.forEach(function(child){
        util.objEmit(child,name,args);
        child.$broadcast(name,args);
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
      var b;
      if(typeof binding=='string')
        binding=new Binding(binding);
      b=(b=this.$$bingdings[binding.id])? b.merge(binding): (this.$$bingdings[binding.id]=binding);
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
    this.params=paramAsts.slice();
    this.name=nameAst;
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
  Ast.prototype={
    get:function(context){},
    reduce:function(){return this;},
    operate:function(action,right){
      return new BinaryAst(this,action,right);
    },
    type:'ast'
  };

  inherit(ThisAst,{
      type:'this',
      get:function(context){
      return this.thisObj||context
    }}
  );
  inherit(ConstAst,{
    get:function(){return this.value},
    type:'const'
  });
  inherit(AccessAst,{
    get:function(context){
      var ret=context;
      for(var i= 0,names=this.propertyNames,name=names[0];name!==undefined&&ret!==undefined;name=names[++i])
        if((ret=ret[name])===undefined)break;
      return ret;
    },
    addProperty:function(name){
      this.propertyNames.push(name);
      return this
    },
    type:'access'
  });
  inherit(InvokeAst,{
    get:function(context,caller){
      var callee,ret;
      caller=caller||context;
      if(isFunc(callee=caller[this.name])){
        try{
          ret=callee.apply(caller,this.params.map(function(exp){return exp.get(context)}));
        }catch (ex){
          ret=ex;
        }
      }
      return ret;
    },
    type:'invoke'
  });
  inherit(BinaryAst,{
    type:'binary',
    get:function(context){
      var left=this.left.get(context),right,act;
      if(left!==undefined){
        if((act=this.action)==='call'){
          return this.right.get(context,left)
        }
        else if(right=this.right.get(context)){
          switch (act){
            case '.':return left[right];
            case '+':return left+right;
            case '-':return left-right;
            case '*':return left*right;
            case '/':return left/right;
            default: throw Error('unsupported action');
          }
        }
      }
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
  exports.Statement=StatementAst;
});
/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.compile',['mvc.register'],function(require,exports){
  var domQuery=require('mvc.dom'),util=require('mvc.util'),interpolate=require('mvc.interpolate').interpolateElement,isFunc=util.isFunc;
  var handlers=require('mvc.register').compilers;
  function compileElement(element,controller){
    var attr=domQuery.attrMap(element),eleCtrl;
    if(eleCtrl=initController(attr['bracketController'],controller)||controller){
      handlers.forEach(link);
      interpolate(eleCtrl,element,attr);
    }
    util.mkArr(element.children).forEach(function(child){
      compileElement(child,eleCtrl)
    });
    return {controller:eleCtrl,element:element,attributes:attr};
    function link(compiler){
      var name=compiler.name;
      if(attr.hasOwnProperty(name)){
        compiler.link(eleCtrl,element,attr);
        delete compiler[name];
      }
    }
  }
  function initController(node,parentController){
    var ctrlFunc,ret,ctrlName;
    if(node&&(ctrlName=node.value)){
      ctrlFunc=require(ctrlName);
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
  require('mvc.register').addCompiler({
    name:'bracket-class',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['bracketClass'].value,function(newClass,oldClass){
        if(oldClass)
          element.classList.remove(oldClass);
        if(newClass)
          element.classList.add(newClass);
      })
    }
  });
  require('mvc.register').addCompiler({
    name:'bracket-src',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['bracketSrc'].value,function(newClass){
        if(newClass) element.setAttribute('src',newClass)
      })
    }
  });
  var showExp=/display\:none/g;
  require('mvc.register').addCompiler({
    name:'bracket-show',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['bracketShow'].value,function(show){
        var style=element.getAttribute('style')||'';
        if(show)
          style=style.replace(showExp,'');
        else if(!showExp.test(style))
          style+=';display:none';
        else return;
        element.setAttribute('style',style)
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
      name:'bracket-'+name,
      link:function(ctrl,element,attr){
        try{
          var exp=getExp(attr['bracket'+capital(name)].value);
          function invoke(e){
            ctrl.$event=e;
            exp.get(ctrl);
            ctrl.$event=null;
            ctrl.$update();
          }
          element.addEventListener(name,invoke);
          //should remove event listener?
        }
        catch (ex){
          console.error(ex);
        }
      }
    });
  }
});
/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define(['mvc.compile'],function(require){
  var compiler=require('mvc.compile'),util=require('mvc.util'),dom=require('mvc.dom');
  function insertAfter(end,eles,removeEles){
    var parent=end.parentElement, i,pre=end,ele;
    for(i= eles.length-1;i>=0;i--){
      if(!parent.contains(ele=eles[i]))
        parent.insertBefore(ele,pre);
      pre=ele;
    }
    if(removeEles)
      removeEles.forEach(function(ele){if(ele)parent.removeChild(ele)});
  }
  function createComment(element,exp){
    var end,p=element.parentElement;
    p.insertBefore(document.createComment('bracket-repeat '+exp),element);
    p.insertBefore(end=document.createComment('bracket-repeat end'),element.nextSibling);
    return end;
  }
  require('mvc.register').addCompiler({
    name:'bracket-repeat',
    priority:1000,
    link:function(parentCtrl,ele,attr){
      var exp=attr['bracketRepeat'].value,match= exp.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
      if(!match) throw Error('repeat exp should like: item in items (track by item.id)');
      var endNode=createComment(ele,exp),template=ele.cloneNode(true);
      dom.removeAttribute(template,'bracket-repeat');
      ele.parentElement.removeChild(ele);
      var watchExp=match[2],itemExp=match[1],trackExp=match[3],lastBlock={},lastEles=[];
      parentCtrl.$bind(watchExp,function(newCollection,old){
        newCollection=util.mkArr(newCollection)||[];
        var curBlock={},elements=newCollection.map(function(model,i){
         //require('mvc.debug').stop();
          if((last=lastBlock[i])&&last.model===model)
          {
            result=last;
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
        insertAfter(endNode,elements,lastEles);
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
  function normalizeEleAttr(element){
    return util.arrReduce(element.attributes,function(map,node){
      map[normalizeAttrName(node.name)]=node;
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
    forEach(attr,function(attrNode){
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
/**
 * Created by Administrator on 2015/3/16.
 */
/*
it don't support binary an unary operation like :+ - * / == != > <
and not support arrow construct :[1,2,3]
you can get property or invoke a function:
 foo.a
 bar(3)
 add(items[0],items[1])
 "abc".substring(1)
*/
bracket.define('mvc.parser',['mvc.ast'],function(require,exports){
  var ast=require('mvc.ast'),uid=require('mvc.util').uid;
  var punctuation='.[]();\'",',
    whitespaceExp=/^[\s\t\r\n\f]+/,
    constRegExp=/^(ture|false|null|undefined)/,
    numberExp=/^(\d+|\d*\.\d+)/,
    idRegExp=/^[a-z_$][a-z0-9_$]*/i,
    strExp=/^('|").*?\1/;
  var TokenType={
    'const':1,
    punc:2,
    id:3,
    end:4
  },cache={};
  exports.token=token;
  exports.parse=function(input,ignoreCache){
    var ret;
    input=input.trim();
    if(ignoreCache||!(ret=cache[input]))
       ret=parse(input);
    if(!ignoreCache)cache[input]=ret;
    ret.id=uid('expression');
    return ret;
  };
  function token(input){
    var len=input.length,tokens=[],match,matched;
    while(skipWhitespace()){
      if(isString())
        addToken(TokenType.const,matched.substring(1,matched.length-1),matched);
      else if(isConst())
        addToken(TokenType.const,convertConst(),matched);
      else if(isNumber())
        addToken(TokenType.const,+matched,matched);
      else if(isIdentifier())
        addToken(TokenType.id,matched);
      else if(isPunctuation()){
        addToken(matched==';'?TokenType.end:TokenType.punc,matched);
      }
      else throw Error('unsupported string:'+input+' in '+curInput);
    }
    return tokens;
    function skipWhitespace(){
      return input=input.replace(whitespaceExp,'');
    }
    function isConst(){
      return  (match=input.match(constRegExp))&&(matched=match[0]);
    }
    function convertConst(){
      switch (matched){
        case 'false':return false;
        case 'true':return true;
        case 'null':return null;
        case 'undefined':return undefined;
        default:throw '';
      }
    }
    function isIdentifier(){
      return (match=input.match(idRegExp))&&(matched=match[0]);
    }
    function isNumber(){
      return (match=input.match(numberExp))&&(matched=match[0]);
    }
    function isString(){
      return (match=input.match(strExp))&&(matched=match[0]);
    }
    function isPunctuation(){
      return punctuation.indexOf(input[0])>-1&&!/^\.\d/.test(input)&&(matched=input[0]);
    }
    function addToken(type,value,replace){
      tokens.push({type:type,value:value,index:len-input.length });
      input=input.replace(replace||value,'');
    }
  }
  var curInput;
  function parseError(index){
    throw Error('parse error:'+curInput+' ; at:'+index);
  }
  function parse(input){
    var tokens=token(curInput=input);
    return reduce(tokens);
  }

  /*
  *
  * statement:
  *    exp
  *    |statement \; exp
  *    |exp EOF
  *    ;
  * value:
  *    const
  *    |id
  *    |[ value ]
  *    |value . value
  *    |value [ value ]
  *    ;
  * invoke:
  *    value \( value*(,value)* \)
  *    ;
  *
  * */
  /**
   *
   * @param tokens
   * @returns {mvc.Statement}
   */

  function reduce(tokens){
    var curToken,statement=new ast.Statement(),pending=[],preToken,tokenValue,curExp=new ast.This();
    while(next()){
      act();
    }
    newLine();
    return statement.reduce();
    function act(){
      switch (curToken.type){
        case TokenType.punc:case TokenType.end:
          if(tokenValue=='.')reducePropertyAccess();
          else if(tokenValue==';')newLine();
          else if(tokenValue=='(')reduceInvoke(close('(',')'));
          else if(tokenValue=='[')reduceIndex(close('[',']',1));
          else parseError(curToken.index);
          break;
        case TokenType.const:
          reduceConst(1);
          break;
        case TokenType.id:
        shift();break;
        default :parseError(curToken.index);
      }
    }
    function operate(act,right){
      return curExp=curExp.operate(act,right).reduce();
    }
    function close(left,right,throwZero,array){
      var results=[],dis=1,token;
      array=array||tokens;
      for(var i= 0,len=array.length;i<len&&dis!=0;i++){
        if((token=array.shift()).value==left)dis++;
        else if(token.value==right)dis--;
        if(dis==0)return (throwZero&&results.length==0)? parseError(token.index):results;
        results.push(token);
      }
      throw Error('expect '+right +"after: "+curInput.substring(token.index-10,token.index))
    }
    function reducePropertyAccess(){
      var len=pending.length;
      if(len>1)
        parseError(curToken.index);
      else if(len==1)
      operate('.' ,new ast.Const(pending.pop().value));
    }
    function reduceConst(throwIfPending){
      if(throwIfPending&&pending.length)parseError(curToken.index);
      newLine();
      curExp=new ast.Const(curToken.value);
    }
    function newLine(){
      reducePropertyAccess();
      if(!(curExp instanceof ast.This))
        statement.add(curExp);
      return curExp=new ast.This();
    }
    function shift(){
      pending.push(preToken=curToken);
    }
    function next(){
      if(curToken=tokens.shift())
      {
        tokenValue=curToken.value;
        return true;
      }
      return false
    }
    function reduceIndex(tokens){
      reducePropertyAccess();
      operate('.',reduce(tokens));
    }
    function reduceInvoke(paramTokens){
      var params=[],last;
      for(var start= 0,end= 0,len=paramTokens.length, t,pts;end<len;end++){
        if((t=paramTokens[end].value)==','){
          params.push(reduce(paramTokens.slice(start,end)));
          start=end+1;
        }
        else if(t=='('){
          pts=close('(',')',0,paramTokens.slice(end+1));
          params.push(reduce(paramTokens.slice(end-1,start=pts.length+end+2)));
          end=start;
        }
      }
      if((last=paramTokens.slice(start)).length)
        params.push(reduce(last));
      return operate('call',new ast.Invoke(pending.pop().value,params));
    }
  }

});
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