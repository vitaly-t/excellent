The IT industry is continuously re-shaped by newcomers.

And every new developer is faced with the choice of learning at least one of those huge frameworks.

But which one to choose? The Internet is flooded by subjective views on those, so reading them isn't
going to make it any more objective.

One has to make an educated choice, which requires first of all that you at least understand the basics.

Learning the basics, of DOM manipulation in our case, is the only sensible way to get started.

And once you have mastered the basics well, you will be able to see your choices clearly, and make
a better choice of ...

---

So Angular.JS has its own complex parser: `ASTInterpreter($filter)`, which parses complex strings,
before those can be data-bound. And that's the slow and over-complex bit.

The parser creates a binding function on its output, so what if, instead of all that complexity,
I just assume that where more than simple variable is needed (like in loops), we are simply
binding to a function directly?

Then we can just have a single type of binding, which can at run time var/function determine which
one it is?

```html
e-bind="myvar.value"

e-bind="myvar.myfunc"
or
e-bind="myvar.myfunc()" // i don't like this one
```

Using var-only syntax is better, as it is more clear that way.

---

Shadow DOM... where we create a shadow element for each real elements. And as long as the shadow DOM is
used to update the real DOM, we do not need to monitor the real DOM. In th real DOM changes...

I would have `class = [cls1, cls2,...]`, for example, `style=[style1, style2, etc...]`

Easy methods for addChild, removeChild, findChild, like: children.add|remove|find|clone|copy

But when an element changes, must the change be propagated, or do we update the value when `get` is called?

Usage example:

```js
var e = excellent.find(/* search criteria */);

var s = excellent.shadow(e, scope); // scope is optional, only if we want to use evaluations inside the element.

// problem here - when we start with the root element, we do not want recursion!
// so:
var s = excellent.shadow(e, {scope, recursive: false|true|0|1|2...});
```

Q: How the binding will work then?
A: The binding within shadow will be converted into a callback function that returns the value,
   while the actual DOM element will receive the initial value from it.
   A two-way watch will be set up on such element+DOM to synchronize any change.
   Binding type: once-off, one-way, two-way

NOTE: If no scope is specified, but binding is still used, the binding is then against the global scope.
      Maybe? Or maybe throwing an error is a better idea?

In addition, on every element we can do `e.bind('evaluation expression')`, same on any attribute, which means
we do not need any special syntax like `{eval exp}`, which is great!

Method `bind(exp, [direction])` is the key, as it lets us specify both the full expression, plus the optional
direction. The default direction should be `two-way`. Good direction values: 0,1 and 2, to represent bindings.

We can also use: `bind(obj, propName, [direction])`.

It is great that we can fully exclude any kind of HTML-contained evaluation/binding!!!

NEXT: In two-way binding, when a DOM element updates our property, we need to be able to respond and to change
other things. For this ween to be able to watch and bind to those properties.

Plus, how to specify standard event handlers?, like `onClick=callback()`. Answer: Like this:
`attr.bind(exp, [direction])`.

Considering that there are too many standard event handlers, perhaps I should have a separate API:
`element.on(event, handler)`, and then `attr.bind(exp, [direction])` will require a value only?

---

Ideas for the search logic: `.find({name, id, class, attribute})`, with each property accepting both
text string and an array of strings.
