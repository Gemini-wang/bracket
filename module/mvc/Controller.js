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