# Excellent.js

<img align="left" width="170" height="170" src="./.github/images/burns.gif" alt="Excellent!">

## DOM Component Framework

[![Build Status](https://travis-ci.org/vitaly-t/excellent.svg?branch=master)](https://travis-ci.org/vitaly-t/excellent)
[![Coverage Status](https://coveralls.io/repos/github/vitaly-t/excellent/badge.svg?branch=master)](https://coveralls.io/github/vitaly-t/excellent?branch=master)
[![Join Chat](https://badges.gitter.im/vitaly-t/excellent.svg)](https://gitter.im/vitaly-t/excellent)

If you like VanillaJS and working with DOM directly, this tiny (3Kb gzip) library helps
with organizing your code into reusable DOM components. See [WiKi] for details.

<br/>

You get the essential _element-to-controllers_ bindings:

```html
<div e-bind="awesome, twinkling, message"></div>
```

That gives your code isolation and reusability (see [the plunker](http://plnkr.co/edit/60xPj9MiCIbZlfe0Xp2I?p=preview)):

```js
app.addController('message', function() {
    // this.node = your DOM element, to work with directly;
    this.node.innerHTML = 'Awesome twinkling message :)';
});

app.addController('awesome', function() {
    this.node.className = 'green-box';
});

app.addController('twinkling', function() {
  var s = this.node.style, a = -0.01;
  setInterval(function() {
    a = (s.opacity < 0 || s.opacity > 1) ? -a : a;
    s.opacity = +s.opacity + a;
  }, 20);
});
```

Such controllers can easily find each other, either among children, with [EController.find] and [EController.findOne],
or globally, with [ERoot.find] and [ERoot.findOne], and access methods and properties in found controllers directly:

```js
app.addController('myCtrl', function(ctrl) {
    // this = ctrl

    this.onInit = function() {
        // find one child controller, and call its method:
        ctrl.findOne('childCtrl').someMethod();

        // find some global controllers, and call a method:
        app.find('globCtrl').forEach(function(c) {
            c.someMethod();
        });
    };
});
```

Or you can alias + configure controllers at the same time (method [addAlias]), without any search.

**Other features include:**

* Global and local dynamic bindings, with [ERoot.bind] and [EController.bind].
* Controllers can extend / inherit each other's functionality, see [Inheritance].
* Native ES6 classes can be used as controllers, see [Classes].
* [Modules] offer greater reusability and simpler distribution of controllers.
* [Services] share functionality across all controllers.
* [TypeScript] support right out of the box.

You can create whole libraries of reusable components that will work with any UI framework, or on their own.

#### Quick Links: &nbsp;[Examples]&nbsp; |&nbsp; [WiKi]&nbsp; |&nbsp; [API]

[API]:https://vitaly-t.github.io/excellent/
[Examples]:https://github.com/vitaly-t/excellent/wiki/Examples
[WiKi]:https://github.com/vitaly-t/excellent/wiki
[Classes]:https://github.com/vitaly-t/excellent/wiki/Classes
[Modules]:https://github.com/vitaly-t/excellent/wiki/Modules
[Services]:https://github.com/vitaly-t/excellent/wiki/Services
[Inheritance]:https://github.com/vitaly-t/excellent/wiki/Inheritance
[TypeScript]:https://github.com/vitaly-t/excellent/wiki/TypeScript

[EController.find]:https://vitaly-t.github.io/excellent/EController.html#find
[EController.findOne]:https://vitaly-t.github.io/excellent/EController.html#findOne
[ERoot.find]:https://vitaly-t.github.io/excellent/ERoot.html#find
[ERoot.findOne]:https://vitaly-t.github.io/excellent/ERoot.html#findOne
[ERoot.bind]:https://vitaly-t.github.io/excellent/ERoot.html#bind
[EController.bind]:https://vitaly-t.github.io/excellent/EController.html#bind
[addAlias]:https://vitaly-t.github.io/excellent/ERoot.html#addAlias
