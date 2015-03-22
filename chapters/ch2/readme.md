#实现绑定
### 万能胶水
下面的代码实现一个最简单的绑定
view:

```` html
<p>{{content}}</p>
<button br-click="addNum()"> you clicked {{num}} times</button>
````

controller

```` javascript
function simpleController(ctrl){
 ctrl.content='binding is amazing';
 ctrl.num=0;
 ctrl.addNum=function(){
  ctrl.num++;
 }
}
````

view层定义了两个元素,p元素显示controller的content内容,button元素显示点击button的次数,每次点击button时,点击次数+1.
view和controller之间的关系已经很明显了,现在要做的就是用"万能胶水"把他们粘起来,在jQuery时代,我们需要手动地去写类似的代码

```` javascript
$('p').html(ctrl.content);
$('button').html(ctrl.num);
````
其实这些代码大同小异,变化的无非是属性的名称和元素,如果能把这两个抽出来形成方法,那么会避免一些麻烦,假设有下面的代码

```` javascript
//controller 监视自身的属性,一旦发生变化,启动回调函数
controller.$watch(property,function(value){//value代表被监视的属性值
 element.innerHTML=value;//回调函数修改元素
})
controller.$update()//controller触发所有监视,在angular中是$digest
````
从上可以看出,遍历元素的innerHTML和attributes,只要其中包含类似于`{{property}}`的表达式,就可以建立起监视器.
监视器做的事情比较简单,在"特定的时候"比较目前property的值和上一次property的值,一旦两次不同,触发回调函数,
回调函数去修改DOM元素或者执行其他逻辑.
### "特定的时候"
很明显,在上面的例子中,用户不点击button,controller永远不会变化,反过来说,一旦用户点击,controller有很大概率会发生变化.
为了保持controller和view一致,要么我们显示的调用update方法,要么在每次点击之后,自动地调用update方法.这两个效果是相同的,
我觉得在处理类似于`br-click`这样的标签时,在调用controller方法之后最好隐式调用update,避免一些不必要的麻烦.
同理,angular在$timeout,$interval,$http等service的调用中都隐式地加入了更新操作,当我们不用这些service但是却修改controller时,
就需要显示地去同步controller和view
### 双向绑定

view
```` html
<input br-model="name" />
<p>your name is {{name}}</p>
````
controller

````
function(ctrl){
    ctrl.name='foo';
}
````

每次修改input的值,controller.name会随之改变,同时view也会显示同样的name值,
要实现这样的功能,只要再给input添加一个监听就可以了
```` javascript
function linkModel(input,ctrl,property){
    input.addEventListener('blur',function(){
        ctrl[property]=input.value;
        ctrl.$update();
    });
    ctrl.$watch(property,function(proValue){
       if(input.value!==proValue)
        input.value=proValue;
    }
}
````
不过呢,在将ctrl的property和input的value同步时,还要考虑到数据类型和数据验证,
angular中整合了表单验证,在实际生产中非常方便
### 接下来...
如果你仔细地阅读到这里,那么可能发现了一个小问题`br-click="addNum()"`准确来说这不是property,而是一次函数调用.调用函数怎么实现呢?
```` javascript
eval('ctrl.addNum()')
//or
new Function("","ctrl.addNum()")()
````
看似很好,不过并不是所有情况下eval和new Function都能被执行,JS引擎可以因为安全原因限制其运行,为了绕过这样的限制,我们可能需要用其他的手段,
比如`用js写一个js引擎`,你有没有觉得这是一个很棒的挑战呢?






