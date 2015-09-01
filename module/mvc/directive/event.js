/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  var util=require('mvc.util'),addCompiler=require('mvc.register').addCompiler,getExp=require('mvc.parser').parse;
  'click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste change'.split(' ').forEach(function(evt){
    defineEvent(evt,true);
  });
  function capital(word){
    return word[0].toUpperCase()+word.slice(1)
  }
  function defineEvent(name,autoUpdate){
    addCompiler({
      name:'br-'+name,
      link:function(ctrl,element,attr){
        try{
          var exp=getExp(attr['br'+capital(name)]);
          function invoke(e){
            ctrl.$event=e;
            exp.get(ctrl);
            ctrl.$event=null;
            ctrl.$update();
          }
          element.addEventListener(name,invoke);
          //should remove event listener?
          element.addEventListener('unload',function(){
            element.removeEventListener(name,invoke)
          });
        }
        catch (ex){
          console.error(ex);
        }
      }
    });
  }
});