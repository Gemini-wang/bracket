/**
 * Created by Administrator on 2015/3/20.
 */
bracket.define('parser2',['mvc.ast'],function(){
  var ast=require('mvc.ast'),uid=require('mvc.util').uid,
    TOKEN={CONST:'CONST',PUNC:"OPT",SEP:";",ID:"ID"};
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
    token:function(){
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
      function getToken(type,value,symbol){
        self.currentInput=input.slice(matched.length);
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
  var symbols=[0,1,'error','exp','value',';'],table=[],productions=[];
  function parse(input){
    var tokenizer=new Tokenizer(input),state,vstack=[],stack=[0],token,statement=new ast.Statement(),exp,len,action,symbol,ret;
    while(1){
      state=stack[stack.length-1];
      if(isNaN(symbol))
        symbol= symbols.indexOf((token=tokenizer.token()).symbol);
      action=table[state]&& table[state][symbol];
      if(!action||!action.length||!action[0]) error();
      switch (action[0]){
        case 1:
          stack.push(symbol);
          vstack.push(symbol.value);
          stack.push(action[1]);
          symbol=null;break;
        case 2:
          len=productions[action[1]][1];
          ret=performAction(action[1],vstack)||ret;
          if(len){
            stack=stack.slice(0,-1*len*2);
            vstack=vstack.slice(0,-1*len);
          }
          stack.push(productions[action[1]][0]);
          vstack.push(ret);
          stack.push(table[stack[stack.length-2]][stack[stack.length-1]]);
          break;
        case 3:
          return ret;
      }
    }
    function error(){

    }
    function performAction(state){

    }
  }
});