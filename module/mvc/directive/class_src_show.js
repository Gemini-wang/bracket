/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  require('mvc.register').addCompiler({
    name:'br-class',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brClass'],function(newClass,oldClass){
        if(oldClass)
          element.classList.remove(oldClass);
        if(newClass)
          element.classList.add(newClass);
      })
    }
  });
  require('mvc.register').addCompiler({
    name:'br-src',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brSrc'],function(newClass){
        if(newClass) element.setAttribute('src',newClass)
      })
    }
  });
  require('mvc.register').addCompiler({
    name:'br-show',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brShow'],function(show){
         element.style.display=show? 'initial':'none';
      })
    }
  })
});