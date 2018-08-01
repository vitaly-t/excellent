# Excellent.js

<img align="left" width="220" height="220" src="./.github/images/burns.gif">

## DOM-fiddling library :)

[![Build Status](https://travis-ci.org/vitaly-t/excellent.svg?branch=master)](https://travis-ci.org/vitaly-t/excellent)
[![Join Chat](https://badges.gitter.im/vitaly-t/excellent.svg)](https://gitter.im/vitaly-t/excellent)

If you like working with DOM directly, this tiny (2Kb compressed) library gives you the tools for organizing
all your JavaScript code in such a way that's highly reusable, easy to maintain and distribute.

See [Wiki Pages] for all the details.

---

You get the essential element-to-controller bindings:

```html
<div e-bind="message, awesome"></div>
```

That gives your code isolation and reusability:

```js
app.addController('message', function() {
    this.node.innerHTML = 'This is awesome! :)'; // this.node = your DOM element
});

app.addController('awesome', function() {
    this.node.className = 'green-box'; // css class for a green box
});
```

<a href="https://github.com/vitaly-t/excellent/wiki"><img align="left" width="260" height="40" src="./.github/images/awesome.png" alt="awesome"></a>
<br/>
<br/>
Then it gets out of your way, lets you work with DOM directly, while [Modules], [Services] and [Inheritance] enable you to build large-scale apps and high-performance reusable component libraries with this simple framework.

[Wiki Pages]:https://github.com/vitaly-t/excellent/wiki
[Modules]:https://github.com/vitaly-t/excellent/wiki/Modules
[Services]:https://github.com/vitaly-t/excellent/wiki/Services
[Inheritance]:https://github.com/vitaly-t/excellent/wiki/Inheritance
