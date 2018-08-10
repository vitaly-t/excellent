# Excellent.js

<img align="left" width="155" height="155" src="./.github/images/burns.gif">

## DOM-fiddling library :)

[![Build Status](https://travis-ci.org/vitaly-t/excellent.svg?branch=master)](https://travis-ci.org/vitaly-t/excellent)
[![Coverage Status](https://coveralls.io/repos/github/vitaly-t/excellent/badge.svg?branch=master)](https://coveralls.io/github/vitaly-t/excellent?branch=master)
[![Join Chat](https://badges.gitter.im/vitaly-t/excellent.svg)](https://gitter.im/vitaly-t/excellent)

If you like working with DOM directly, this tiny (2Kb pkzip) library makes it productive, giving you the tools
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
  }, 40);
});
```

And then you work with DOM directly, while [Modules], [Services] and [Inheritance] let you build whole libraries
of highly reusable components that can seamlessly work with any UI framework, or on their own.

#### Quick Links: &nbsp;[Examples]&nbsp; |&nbsp; [WiKi]&nbsp; |&nbsp; [API]

[API]:https://vitaly-t.github.io/excellent/
[Examples]:https://github.com/vitaly-t/excellent/wiki/Examples
[WiKi]:https://github.com/vitaly-t/excellent/wiki
[Modules]:https://github.com/vitaly-t/excellent/wiki/Modules
[Services]:https://github.com/vitaly-t/excellent/wiki/Services
[Inheritance]:https://github.com/vitaly-t/excellent/wiki/Inheritance
