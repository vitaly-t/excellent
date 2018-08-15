# Excellent.js

<img align="left" width="170" height="170" src="./.github/images/burns.gif" alt="Excellent!">

## DOM Component Framework

[![Build Status](https://travis-ci.org/vitaly-t/excellent.svg?branch=master)](https://travis-ci.org/vitaly-t/excellent)
[![Coverage Status](https://coveralls.io/repos/github/vitaly-t/excellent/badge.svg?branch=master)](https://coveralls.io/github/vitaly-t/excellent?branch=master)
[![Join Chat](https://badges.gitter.im/vitaly-t/excellent.svg)](https://gitter.im/vitaly-t/excellent)

If you like working with DOM directly, this tiny (2Kb gzip) library makes it productive, giving you the tools
for writing reusable DOM components. See [WiKi] for details.

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

Such controllers can easily find each other, either among children:

* [EController.find]
* [EController.findOne]

or globally / document-wide:

* [ERoot.find]
* [ERoot.findOne]

and access methods and properties in found controllers directly:

```js
app.addController('myCtrl', function(ctrl) {
    // this = ctrl

    this.onInit = function() {
        // find child controller childCtrl, and call its method:
        ctrl.findOne('childCtrl').someMethod();

        // find global controllers globCtrl, and call a method:
        app.find('globCtrl').forEach(function(c) {
            c.someMethod();
        });
    };
});
```

Other features include:

* Both global and local dynamic binding, with [ERoot.bind] and [EController.bind].
* Controllers can extend / inherit each other's functionality, see [Inheritance].
* [Modules] empower greater reusability and simpler redistribution of controllers.
* [Services] share functionality across all controllers.

You can create whole libraries of reusable components that will work seamlessly with any
UI framework, or on their own.

#### Quick Links: &nbsp;[Examples]&nbsp; |&nbsp; [WiKi]&nbsp; |&nbsp; [API]

[API]:https://vitaly-t.github.io/excellent/
[Examples]:https://github.com/vitaly-t/excellent/wiki/Examples
[WiKi]:https://github.com/vitaly-t/excellent/wiki
[Modules]:https://github.com/vitaly-t/excellent/wiki/Modules
[Services]:https://github.com/vitaly-t/excellent/wiki/Services
[Inheritance]:https://github.com/vitaly-t/excellent/wiki/Inheritance

[EController.find]:https://vitaly-t.github.io/excellent/EController.html#find
[EController.findOne]:https://vitaly-t.github.io/excellent/EController.html#findOne
[ERoot.find]:https://vitaly-t.github.io/excellent/ERoot.html#find
[ERoot.findOne]:https://vitaly-t.github.io/excellent/ERoot.html#findOne
[ERoot.bind]:https://vitaly-t.github.io/excellent/ERoot.html#bind
[EController.bind]:https://vitaly-t.github.io/excellent/EController.html#bind