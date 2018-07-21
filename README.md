# dome

Dome parsing playground

Trying to implement basic data watching + binding, like only the best things from Angular.js 1.x,
only much simpler and faster.

--------------------------------------------------

# enumerating dome

https://stackoverflow.com/questions/4256339/javascript-how-to-loop-through-all-dom-elements-on-a-page

# analyzing attributes

I can use logic similar to pg-promise parser to parse nested property names. It is under a question,
whether functions should be supported.

Maybe something like `lib.rootScope={}` will contain all other scopes.

Attribute names must be easy to distinguish from everything else, which means a good prefix is needed.

If I call it Dollar.js, then `$` would be used:

```
$onClick/$click, $bind, $value, $options
```

# unknowns

1. Two-way binding - how will this work?
2. Custom elements, custom attributes, seems essential, but how?
3. Modules, separation of concerns

A module would contain its own custom elements + attributes. Those would need to implement
own properties + events, to be able to process any situation, and manipulate the dome and the
element they belong to.

How to exchange data between elements/attributes?

* Excellent.js, with `e-` on everything, and Mr. Burns as the main theme.
  Can use funny words, like `villainy`, `scam`, `release the hounds!` - to re-scan the dome
  Available names: `excellent.js` and `ejs`, so I can use `@ejs/core`, for example.

* Dumb.js, with `d-` or `da-`. NO, it is dumb indeed.
