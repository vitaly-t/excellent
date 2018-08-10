# Excellent.js

<img align="left" width="220" height="220" src="./.github/images/burns.gif">

## DOM-fiddling library :)

[![Build Status](https://travis-ci.org/vitaly-t/excellent.svg?branch=master)](https://travis-ci.org/vitaly-t/excellent)
[![Coverage Status](https://coveralls.io/repos/github/vitaly-t/excellent/badge.svg?branch=master)](https://coveralls.io/github/vitaly-t/excellent?branch=master)
[![Join Chat](https://badges.gitter.im/vitaly-t/excellent.svg)](https://gitter.im/vitaly-t/excellent)

If you like working with DOM directly, this tiny (2Kb compressed) library gives you the tools for organizing
all your JavaScript code in such a way that's highly reusable, [very fast], easy to maintain and distribute.

See [Wiki Pages] for all the details.

---

You get the essential element-to-controller bindings:

```html
<div e-bind="awesome, twinkling, message"></div>
```

That gives your code isolation and reusability (see [the plunker](http://plnkr.co/edit/60xPj9MiCIbZlfe0Xp2I?p=preview)):

```js
app.addController('message', function() {
    this.node.innerHTML = 'Awesome twinkling message :)'; // this.node = your DOM element
});

app.addController('awesome', function() {
    this.node.className = 'green-box'; // css class for a green box
});

app.addController('twinkling', function() {
  var s = this.node.style, a = -0.01;
  setInterval(function() {
    a = (s.opacity < 0 || s.opacity > 1) ? -a : a;
    s.opacity = +s.opacity + a;
  }, 40);
});
```
<br/>
Then it gets out of your way, lets you work with DOM directly, while [Modules], [Services] and [Inheritance] enable you to build large-scale apps and reusable component libraries.

### Quick Links: &nbsp;[Examples]&nbsp; |&nbsp; [WiKi]&nbsp; |&nbsp; [API]

[very fast]:https://github.com/vitaly-t/excellent/wiki/Performance
[API]:https://vitaly-t.github.io/excellent/
[Examples]:https://github.com/vitaly-t/excellent/wiki/Examples
[Wiki Pages]:https://github.com/vitaly-t/excellent/wiki
[WiKi]:https://github.com/vitaly-t/excellent/wiki
[Modules]:https://github.com/vitaly-t/excellent/wiki/Modules
[Services]:https://github.com/vitaly-t/excellent/wiki/Services
[Inheritance]:https://github.com/vitaly-t/excellent/wiki/Inheritance
