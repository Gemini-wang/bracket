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