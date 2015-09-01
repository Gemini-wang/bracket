/**
 * Created by Administrator on 2015/3/19.
 */
bracket.define(['mvc.register'],function(require){
  var bind=require('mvc.binding');
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
      var exp=attr['brModel'],binding=bind(exp),initValue,type,inputType=element.type;
      if((initValue=binding.get(ctrl))!==undefined)
        type=typeof (element.value=initValue);
      ctrl.$bind(binding,function(val){
        if(val!==undefined)
          ctrl[exp]=element.value=val;
      });
      element.addEventListener(inputType =='checkbox'?'change':'blur',function(){
        var refreshedValue= inputType=='checkbox'? element.checked:convert(element.value,type);
        if(ctrl.$$get(binding)!==refreshedValue){
          ctrl.$$set(binding,refreshedValue);
        }
      })
    }
  })
});