/**
 * Created by Administrator on 2015/3/14.
 */
bracket.define('mvc.compile',['mvc.register'],function(require,exports){
  var domQuery=require('mvc.dom'),util=require('mvc.util'),interpolate=require('mvc.interpolate').interpolateElement,isFunc=util.isFunc;
  var getCompilers=require('mvc.register').collectCompilers;
  function compileElement(element,controller){
    var attr=domQuery.attrMap(element),eleCtrl;
    if(eleCtrl=initController(attr['brController'],controller)||controller){
      getCompilers(element).forEach(link);
      interpolate(eleCtrl,element,attr);
    }
    util.mkArr(element.children).forEach(function(child){
      compileElement(child,eleCtrl,element)
    });
    if(element.$$shouldRemove) element.parentElement.removeChild(element);
    return {controller:eleCtrl,element:element,attributes:attr};
    function link(compiler){
      var val;
      if(val=compiler.template){
        if(compiler.replace){
          throw new Error('not supported yet');
         /* var e=document.createElement('div');
          e.innerHTML=val;
          domQuery.insertBefore(element,eles=e.children);
          element.$$shouldRemove=1;
          //element=e.children[0];*/
        }
        else element.innerHTML=val;
      }
      compiler.link(eleCtrl,element,attr);
    }
  }
  function initController(ctrlName,parentController){
    var ctrlFunc,ret;
    if(ctrlName){
      ctrlFunc=require(ctrlName);
      if(!isFunc(ctrlFunc))throw Error('controller must be a function');
      ctrlFunc.call(ret=parentController.$$new(),ret);
    }
    return ret;
  }
  exports.compile=compileElement;
});