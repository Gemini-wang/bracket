/**
 * Created by 柏子 on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  var addCompiler=require('mvc.register').addCompiler;
  addCompiler({
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
  addCompiler({
    name:'br-src',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brSrc'],function(newClass){
        if(newClass) element.setAttribute('src',newClass)
      })
    }
  });
  addCompiler({
    name:'br-show',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brShow'],function(show){
         element.style.display=show? '':'none';
      })
    }
  });
  addCompiler({
    name:'br-disabled',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brDisabled'],function(disabled){
        disabled? element.setAttribute('disabled','1'):element.removeAttribute('disabled');
      })
    }
  });
  addCompiler({
    name:'br-checked',
    link:function(ctrl,element,attr){
      ctrl.$bind(attr['brChecked'],function(checked){
        checked? element.setAttribute('checked','1'):element.removeAttribute('checked');
      })
    }
  })
});