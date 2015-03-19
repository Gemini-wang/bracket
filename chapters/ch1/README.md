#项目简介
 最初被Angular吸引是因为它强大的[ng-repeat](https://docs.Angularjs.org/api/ng/directive/ngRepeat)以及
 [ng-model](https://docs.Angularjs.org/api/ng/directive/ngModel),在后面的学习中越发觉得Angular是一个极其
 优秀的框架,用得根本停不下来.直到出现了极高的性能要求......

 Angular是一个大系统,基本上提供了前端所有的工具,当开发一个大项目的时候,这些工具会很有用,
 可是强大的背后是庞大,
 如果只是想简单的享受ng-repeat,ng-show,ng-click的便利.这时会遇到两难问题,要么退回去写dom和数据的绑定,要么加载庞大的AngularJS.

 Angular改变了我的编程模式,把我从频繁的DOM操作中拯救出来,更专注于业务逻辑.也加快了开发速度
 于是我试着模仿一个Angular,这个"山寨"Angular会有如下特点:

* 小,保留最主要的功能,尽量的减小文件
* 实现绑定,模拟Angular的MVVM模式
* js模块化,使得代码易维护
* 基于HTML5的API,对于DOM操作使用原生代码,不引入JQuery或者JQLite

在每章的文件夹下会有示例代码,如果你不熟悉Angular,有些概念需要参考Angular的指南(可能要翻墙),如有错误也希望得到指正