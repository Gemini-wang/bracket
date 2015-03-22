/**
 * Created by Administrator on 2015/3/20.
 */
bracket.define('mvc.parser',['mvc.ast'],function(require,exports){
  /*
  * transform form jison https://github.com/zaach/jison
  * LL(0) Parser
  */
  var ast=require('mvc.ast'),util=require('mvc.util'),cache={},
    TOKEN={CONST:'CONST',PUNC:"OPT",SEP:";",ID:"ID",EOF:'EOF'};
  var puncExp=/^(\[|]|\(|\)|,|!={0,2}|={2,3}|&{1,2}|\?|:|\|{1,2}|\.|<=?|>=?)/,
    sep=';',
    whitespaceExp=/^[\s\t\r\n\f]+/,
    constRegExp=/^(true|false|null|undefined)/,
    numberExp=/^(\-?(\d*\.\d+|\d+))/,
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
      throw Error('parse error in:'+this.input.slice(0,this.input.length-this.currentInput.length+1))
    },
    getIndex:function(){
      return this.input.length-this.currentInput.length;
    },
    lex:function(){
      var match,matched,input,self=this;
      while(!this.end()&&(input=this.skip())){
        if(isConst())return getToken(TOKEN.CONST,convertConst(matched));
        else if(isIdentifier()) return getToken(TOKEN.ID,matched);
        else if(isString())return getToken(TOKEN.CONST,matched.substr(1,matched.length-2));
        else if(isNumber()) return getToken(TOKEN.CONST,+matched);
        else if(isPunctuation()) return getToken(TOKEN.PUNC,matched);
        else if(isSeparator())return getToken(TOKEN.SEP,';');
        else this.error();
      }
      this.done?  matched='$end':this.done=!!(matched='EOF');
      return new Token(matched,TOKEN.EOF,self.getIndex(),matched);
      function getToken(type,value){
        self.currentInput=input.substr(matched.length);
        // symbol: == != !== === >= <= > <  && ||
        // "OPT" for all
        // symbol: ,! () [] ? : ,
        // the same with their literal
        return new Token(value,type,self.getIndex(),type===TOKEN.PUNC? (symbols.indexOf(value)==-1?TOKEN.PUNC:value):type)
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
  function parse(input,TokenizerFunc){
    var tokenizer=new TokenizerFunc(input), state,vstack=[],stack=[0],token,len,action,symbol,ret;
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
      var $0 = $$.length - 1;
      switch (state) {
        case 2:
          return new ast.Const($$[$0]);
        case 3:
          return new ast.Access($$[$0]);
        case 5:
          return $$[$0-2].operate('.',new ast.Const($$[$0]));
        case 6:
          return $$[$0-3].operate('.',$$[$0-1]);
        case 7:
          return $$[$0].operate('!');
        case 8:
          return $$[$0-2].operate($$[$0-1],$$[$0]);
        case 9:
          return new ast.Alter($$[$0-4],$$[$0-2],$$[$0]);
        case 10:
          return $$[$0-1];
        case 11:
          return [$$[$0]];
        case 12:
          $$[$0-2].push($$[$0]);
          break;
        case 13:
          return new ast.Invoke($$[$0-2]);
        case 14:
          return new ast.Invoke($$[$0-3],$$[$0-1]);
      }
    }
  }

  exports.parse=function(input){
    var statement=cache[input=input.trim()];
    if(!statement){
      statement=new ast.Statement();
      input.split(/;/g).forEach(function(expInput){
        if(expInput=expInput.trim())
          statement.add(parse(expInput,Tokenizer))
      });
      cache[input]=statement=statement.reduce();
      statement.id=input;
    }
    return statement
  };

  exports.token=function(input){
    var results=[],tokenizer=new Tokenizer(input);
    while(!tokenizer.done)results.push(tokenizer.lex());
    return results;
  };
  var symbols=["$accept", "$end", "error", "exp", "value", "EOF", "CONST", "ID", "func", ".", "[", "]", "!", "OPT", "?", ":", "(", ")", "params", ","],
    table,productions=[0,[3,2],[4,1],[4,1],[4,1],[4,3],[4,4],[4,2],[4,3],[4,5],[4,3],[18,1],[18,3],[8,3],[8,4]],
    defaultActions={8:[2,1]};
  (function(){
    var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,3],$V1=[1,4],$V2=[1,6],$V3=[1,7],$V4=[1,9],$V5=[1,10],$V6=[1,11],$V7=[1,12],$V8=[1,13],$V9=[5,9,10,11,13,14,15,16,17,19],$Va=[5,11,13,14,15,17,19],$Vb=[17,19];
    table=[{3:1,4:2,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{1:[3]},{5:[1,8],9:$V4,10:$V5,13:$V6,14:$V7,16:$V8},o($V9,[2,2]),o($V9,[2,3]),o($V9,[2,4]),{4:14,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:15,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{1:[2,1]},{7:[1,16]},{4:17,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:18,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:19,6:$V0,7:$V1,8:5,12:$V2,16:$V3},{4:22,6:$V0,7:$V1,8:5,12:$V2,16:$V3,17:[1,20],18:21},o($Va,[2,7],{9:$V4,10:$V5,16:$V8}),{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8,17:[1,23]},o($V9,[2,5]),{9:$V4,10:$V5,11:[1,24],13:$V6,14:$V7,16:$V8},o($Va,[2,8],{9:$V4,10:$V5,16:$V8}),{9:$V4,10:$V5,13:$V6,14:$V7,15:[1,25],16:$V8},o($V9,[2,13]),{17:[1,26],19:[1,27]},o($Vb,[2,11],{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8}),o($V9,[2,10]),o($V9,[2,6]),{4:28,6:$V0,7:$V1,8:5,12:$V2,16:$V3},o($V9,[2,14]),{4:29,6:$V0,7:$V1,8:5,12:$V2,16:$V3},o([5,11,14,15,17,19],[2,9],{9:$V4,10:$V5,13:$V6,16:$V8}),o($Vb,[2,12],{9:$V4,10:$V5,13:$V6,14:$V7,16:$V8})]
  })()
});