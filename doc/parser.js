/**
 * Created by Administrator on 2015/3/16.
 */
/*
this was a top down parser for the expression
replaced by parser2.js
it doesn't support binary an unary operation like :+ - * / == != > <

you can get property or invoke a function:
 foo.a
 bar(3)
 add(items[0],items[1])
 "abc".substring(1)
*/
bracket.define('!mvc.parser',['mvc.ast'],function(require,exports){
  var ast=require('mvc.ast'),uid=require('mvc.util').uid;
  var punctuation='.[]();\'",',
    whitespaceExp=/^[\s\t\r\n\f]+/,
    constRegExp=/^(ture|false|null|undefined)/,
    numberExp=/^(\d+|\d*\.\d+)/,
    idRegExp=/^[a-z_$][a-z0-9_$]*/i,
    strExp=/^('|").*?\1/;
  var TokenType={
    'const':1,
    punc:2,
    id:3,
    end:4
  },cache={};
  exports.token=token;
  exports.parse=function(input,ignoreCache){
    var ret;
    input=input.trim();
    if(ignoreCache||!(ret=cache[input]))
       ret=parse(input);
    if(!ignoreCache)cache[input]=ret;
    ret.id=uid('expression');
    return ret;
  };
  function token(input){
    var len=input.length,tokens=[],match,matched;
    while(skipWhitespace()){
      if(isString())
        addToken(TokenType.const,matched.substring(1,matched.length-1),matched);
      else if(isConst())
        addToken(TokenType.const,convertConst(),matched);
      else if(isNumber())
        addToken(TokenType.const,+matched,matched);
      else if(isIdentifier())
        addToken(TokenType.id,matched);
      else if(isPunctuation()){
        addToken(matched==';'?TokenType.end:TokenType.punc,matched);
      }
      else throw Error('unsupported string:'+input+' in '+curInput);
    }
    return tokens;
    function skipWhitespace(){
      return input=input.replace(whitespaceExp,'');
    }
    function isConst(){
      return  (match=input.match(constRegExp))&&(matched=match[0]);
    }
    function convertConst(){
      switch (matched){
        case 'false':return false;
        case 'true':return true;
        case 'null':return null;
        case 'undefined':return undefined;
        default:throw '';
      }
    }
    function isIdentifier(){
      return (match=input.match(idRegExp))&&(matched=match[0]);
    }
    function isNumber(){
      return (match=input.match(numberExp))&&(matched=match[0]);
    }
    function isString(){
      return (match=input.match(strExp))&&(matched=match[0]);
    }
    function isPunctuation(){
      return punctuation.indexOf(input[0])>-1&&!/^\.\d/.test(input)&&(matched=input[0]);
    }
    function addToken(type,value,replace){
      tokens.push({type:type,value:value,index:len-input.length });
      input=input.replace(replace||value,'');
    }
  }
  var curInput;
  function parseError(index){
    throw Error('parse error:'+curInput+' ; at:'+index);
  }
  function parse(input){
    var tokens=token(curInput=input);
    return reduce(tokens);
  }

  /*
  *
  * statement:
  *    exp
  *    |statement \; exp
  *    |exp EOF
  *    ;
  * value:
  *    const
  *    |id
  *    |[ value ]
  *    |value . value
  *    |value [ value ]
  *    ;
  * invoke:
  *    value \( value*(,value)* \)
  *    ;
  *
  * */
  /**
   *
   * @param tokens
   * @returns {mvc.Statement}
   */

  function reduce(tokens){
    var curToken,statement=new ast.Statement(),pending=[],preToken,tokenValue,curExp=new ast.This();
    while(next()){
      act();
    }
    newLine();
    return statement.reduce();
    function act(){
      switch (curToken.type){
        case TokenType.punc:case TokenType.end:
          if(tokenValue=='.')reducePropertyAccess();
          else if(tokenValue==';')newLine();
          else if(tokenValue=='(')reduceInvoke(close('(',')'));
          else if(tokenValue=='[')reduceIndex(close('[',']',1));
          else parseError(curToken.index);
          break;
        case TokenType.const:
          reduceConst(1);
          break;
        case TokenType.id:
        shift();break;
        default :parseError(curToken.index);
      }
    }
    function operate(act,right){
      return curExp=curExp.operate(act,right).reduce();
    }
    function close(left,right,throwZero,array){
      var results=[],dis=1,token;
      array=array||tokens;
      for(var i= 0,len=array.length;i<len&&dis!=0;i++){
        if((token=array.shift()).value==left)dis++;
        else if(token.value==right)dis--;
        if(dis==0)return (throwZero&&results.length==0)? parseError(token.index):results;
        results.push(token);
      }
      throw Error('expect '+right +"after: "+curInput.substring(token.index-10,token.index))
    }
    function reducePropertyAccess(){
      var len=pending.length;
      if(len>1)
        parseError(curToken.index);
      else if(len==1)
      operate('.' ,new ast.Const(pending.pop().value));
    }
    function reduceConst(throwIfPending){
      if(throwIfPending&&pending.length)parseError(curToken.index);
      newLine();
      curExp=new ast.Const(curToken.value);
    }
    function newLine(){
      reducePropertyAccess();
      if(!(curExp instanceof ast.This))
        statement.add(curExp);
      return curExp=new ast.This();
    }
    function shift(){
      pending.push(preToken=curToken);
    }
    function next(){
      if(curToken=tokens.shift())
      {
        tokenValue=curToken.value;
        return true;
      }
      return false
    }
    function reduceIndex(tokens){
      reducePropertyAccess();
      operate('.',reduce(tokens));
    }
    function reduceInvoke(paramTokens){
      var params=[],last;
      for(var start= 0,end= 0,len=paramTokens.length, t,pts;end<len;end++){
        if((t=paramTokens[end].value)==','){
          params.push(reduce(paramTokens.slice(start,end)));
          start=end+1;
        }
        else if(t=='('){
          pts=close('(',')',0,paramTokens.slice(end+1));
          params.push(reduce(paramTokens.slice(end-1,start=pts.length+end+2)));
          end=start;
        }
      }
      if((last=paramTokens.slice(start)).length)
        params.push(reduce(last));
      return operate('call',new ast.Invoke(pending.pop().value,params));
    }
  }

});