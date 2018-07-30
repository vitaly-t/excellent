# Excellent.js

<img align="left" width="220" height="220" src="./.github/images/burns.gif">

## DOM-fiddling library :)

<a href="https://gitter.im/vitaly-t/excellent"><img align="left" width="90" height="20" src="./.github/images/chat.png" alt="Join Chat"></a>
<br/>

If you like working with DOM directly, this tiny (2Kb compressed) library gives you the essential
tools for organizing all your JavaScript code in such a way that's highly reusable, easy to maintain and distribute.

See [Wiki Pages] for all the details.

---

You get the basic element-to-controller binding:

```html
<div e-bind="hello, awesome"></div>
```

To give your code component-like isolation:

```js
app.addController('hello', function() {
    this.node.innerHTML = 'This is awesome! :)';
});

app.addController('awesome', function() {
    this.node.className = 'awesome';
});
```

And to get out of your way, let you use DOM directly.

<img align="left" width="260" height="40" src="./.github/images/awesome.png" alt="awesome">

[Wiki Pages]:https://github.com/vitaly-t/excellent/wiki
