/**
 * Created by Administrator on 2015/3/15.
 */
bracket.define('mvc.debug',function(r,e,module){
  var enabled=false;
  module.exports={
    enable:function(enable){
      return enabled=(enable!==false);
    },
    stop:function(){
     if(enabled)debugger;
    },
    error:function(err){
      throw err;
    }
  }
});