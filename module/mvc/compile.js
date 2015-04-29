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