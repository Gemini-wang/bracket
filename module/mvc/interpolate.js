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