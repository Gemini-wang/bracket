/**
 * Created by Administrator on 2015/3/20.
 */
bracket.define('mvc.parser2',['mvc.ast'],function(require,exports){
  /*
  * transform form jison https://github.com/zaach/jison
  * LR(1) Parser
  *
  */
  var ast=require('mvc.ast'),uid=require('mvc.util').uid,util=require('mvc.util'),
    TOKEN={CONST:'CONST',PUNC:"OPT",SEP:";",ID:"ID",EOF:'EOF'};
  var puncExp=/^(\[|\]|\(|\)|,|\!\={1,2}|\={2,3}|\&\&|\?|\:|\|\||\.)/,
    sep=';',
    whitespaceExp=/^[\s\t\r\n\f]+/,
    constRegExp=/^(ture|false|null|undefined)/,
    numberExp=/^(\d+|\d*\.\d+)/,
    idRegExp=/^[a-z_$][a-z0-9_$]*/i,
    strExp=/^('|").*?\1/;

  function convertConst(str){
    switch (str){
      case 'false':return false;
      case 'true':return true;
      case 'null':return null;
      case 'undefined':return void 0;
      default:throw '';
    }
  }
  function Token(value,type,index,symbol){
    this.value=value;
    this.type=type;
    this.index=index;
    this.symbol=symbol;
    this.done=false;
  }
  Token.prototype={
   toString:function(){return this.value+''}
 };
  function Tokenizer(input){
    this.currentInput=this.input=input;
  }
  Tokenizer.prototype={
    error:function(){
      throw Error('parse error in:'+this.input.slice(0,this.input.length-this.currentInput.length))
    },
    getIndex:function(){
      return this.input.length-this.currentInput.length;
    },
    lex:function(){
      var match,matched,input,self=this;
      while(!this.end()){
        input=this.skip();
        if(isConst())return getToken(TOKEN.CONST,convertConst(matched));
        else if(isIdentifier()) return getToken(TOKEN.ID);
        else if(isString()) return getToken(TOKEN.CONST);
        else if(isNumber()) return getToken(TOKEN.CONST,+match);
        else if(isPunctuation())return getToken(TOKEN.PUNC,matched);
        else if(isSeparator())return getToken(TOKEN.SEP,';');
        else this.error();
      }
      this.done?  matched='$end':this.done=!!(matched='EOF');
      return getToken(TOKEN.EOF,matched);
      function getToken(type,value,symbol){
        self.currentInput=input.substr(matched.length);
        return new Token(value||matched,type,self.getIndex(),type===TOKEN.PUNC? value:type)
      }
      function matchReg(reg){
        return (match=input.match(reg))&&(matched=match[0]);
      }
      function isConst(){
        return matchReg(constRegExp);
      }
      function isIdentifier(){
        return matchReg(idRegExp)
      }
      function isNumber(){
        return matchReg(numberExp)
      }
      function isString(){
        return matchReg(strExp);
      }
      function isPunctuation(){
        return matchReg(puncExp)
      }
      function isSeparator(){
        return input[0]==';'&&matched==';';
      }
    },
    end:function(){
      return this.currentInput.length==0;
    },
    skip:function(){
      return this.currentInput=this.currentInput.replace(whitespaceExp,'');
    }
  };
  function parse(input,Tokenizer){
    var tokenizer=new Tokenizer(input), state,vstack=[],stack=[0],token,len,action,symbol,ret;
    while(1){
      state=stack[stack.length-1];
      if(!(action=defaultActions[state])){
        if(isNaN(symbol))
          symbol=symbols.indexOf((token=tokenizer.lex()).symbol);
        action=table[state]&& table[state][symbol];
      }
      if(!action||!action.length||!action[0])
        error(token);
      if(action[0]==1){//shift
        stack.push(symbol);
        vstack.push(token.value);
        stack.push(action[1]);
        symbol=NaN;
      }
      else if(action[0]==2){ //reduce
        len=productions[action[1]][1];
        ret=performAction(action[1],vstack)||vstack[vstack.length-len];
        if(len){
          stack=stack.slice(0,-1*len*2);
          vstack=vstack.slice(0,-1*len);
        }
        stack.push(productions[action[1]][0]);
        vstack.push(ret);
        stack.push(table[stack[stack.length-2]][stack[stack.length-1]]);
      }
      else
        return ret;
    }
    function error(){
      throw Error('parse error in:'+ input.substr(token.index-5,5));
    }
    function performAction(state,$$){
      var $0=$$.length-1;
      switch (state){
        case 2:
          return $$[$0];
        case 3:
          return $$[$0-2]+$$[$0];
        case 4:
          return $$[$0-2]-$$[$0];
        case 5:
         return $$[$0-1];
      }
    }
  }
  exports.parse=function(input,tokenizer){
     return parse(input,util.isFunc(tokenizer)? tokenizer:Tokenizer);
  };
  exports.token=function(){

  };
  var symbols=["$accept", "$end", "error", "exp", "value", "EOF", "number", "+", "-", "(", ")"],
    table,productions=[0,[3,2],[4,1],[4,3],[4,3],[4,3]],
    defaultActions={5:[2,1]};
  (function(){
    var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,3],$V1=[1,4],$V2=[1,6],$V3=[1,7],$V4=[5,7,8,10];
    table=[{3:1,4:2,6:$V0,9:$V1},{1:[3]},{5:[1,5],7:$V2,8:$V3},o($V4,[2,2]),{4:8,6:$V0,9:$V1},{1:[2,1]},{4:9,6:$V0,9:$V1},{4:10,6:$V0,9:$V1},{7:$V2,8:$V3,10:[1,11]},o($V4,[2,3]),o($V4,[2,4]),o($V4,[2,5])];
  })()
});