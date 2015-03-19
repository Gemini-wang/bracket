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