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
    this.act=BinaryOperation[this.action=action];
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
  var BinaryOperation={
    '||':function(left,right){return right},
    '&&':function(left,right){return left&&right},
    '!=':function(left,right){return left!=right},
    '!==':function(left,right){return left!==right},
    '===':function(left,right){return left===right},
    '==':function(l,r){return l==r},
    '.':function(l,r){return l[r]},
    '>':function(l,r){return l>r},
    '>=':function(l,r){return l>=r},
    '<':function(l,r){return l<r},
    '<=':function(l,r){return l<=r}
  };
  inherit(BinaryAst,{
    type:'binary',
    get:function(context){
      var left=this.left.get(context),right=this.right,act=this.action;
      if(act==='||'&&left)return left;
      else if(act=='!')return !left;
      right=right.get(context);
      return this.act(left,right);
    },
    act:function(){
      throw Error('not support operation:'+this.action)
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
      },1)
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