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