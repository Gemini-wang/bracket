/**
 * Created by Administrator on 2015/3/19.
 */
bracket.define(['mvc.register'],function(require){
  var bind=require('mvc.binding');
  //it cause trouble when expression is a.b.c
  //no validation before change ctrl
  function convert(val,type){
    switch (type){
      case 'number':return (+val)||'';
      case 'boolean':return !!val;
      default :return val+'';
    }
  }
  require('mvc.register').addCompiler({
    name:'br-model',
    link:function(ctrl,element,attr){
      var exp=attr['brModel'].value,binding=bind(exp),initValue,type;
      if((initValue=binding.get(ctrl))!==undefined)
        type=typeof (element.value=initValue);
      ctrl.$bind(binding,function(val){
        if(val!==undefined)
          ctrl[exp]=element.value=val;
      });
      element.addEventListener('blur',function(){
        if(ctrl[exp]!==element.value){
          ctrl[exp]=convert(element.value,type);
          ctrl.$update();
        }
      })
    }
  })
});