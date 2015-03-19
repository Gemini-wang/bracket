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