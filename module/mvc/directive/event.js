/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define(['mvc.register'],function(require){
  var util=require('mvc.util'),isFunc=util.isFunc,addCompiler=require('mvc.register').addCompiler,getExp=require('mvc.parser').parse;
  'click dblclick mousedown mouseup mouseover mouseout mousemove mouseenter mouseleave keydown keyup keypress submit focus blur copy cut paste'.split(' ').forEach(function(evt){
    defineEvent(evt,true);
  });
  function capital(word){
    return word[0].toUpperCase()+word.slice(1)
  }
  function defineEvent(name,autoUpdate){
    addCompiler({
      name:'bracket-'+name,
      link:function(ctrl,element,attr){
        try{
          var exp=getExp(attr['bracket'+capital(name)].value);
          function invoke(e){
            ctrl.$event=e;
            exp.get(ctrl);
            ctrl.$event=null;
            ctrl.$update();
          }
          element.addEventListener(name,invoke);
          //should remove event listener?
        }
        catch (ex){
          console.error(ex);
        }
      }
    });
  }
});