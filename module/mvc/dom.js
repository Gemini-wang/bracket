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
      map[normalizeAttrName(node.name)]=node.value;
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