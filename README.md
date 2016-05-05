# React Async Script Loader

[![Build Status][travis.img]][travis.url]
[![npm version][npm.img]][npm.url]
[![Dependencies][deps.img]][deps.url]
[![Dev Dependencies][devdeps.img]][devdeps.url]

A React composition mixin for loading 3rd party scripts asynchronously. This component allows you to wrap component
that needs 3rd party resources, like reCAPTCHA or Google Maps, and have them load the script asynchronously.

With React 0.13, mixins are getting deprecated in favor of composition.

After reading this article, [Mixins Are Dead. Long Live Composition][dan_abramov],
I decided push react-script-loader a bit further and make a composition function that wraps component.

## Usage

The api is very simple `makeAsyncScriptLoader(Component, scriptUrl, options)`. Where options can contain exposeFuncs, callbackName and globalName.

- Component: The component to wrap.
- scriptUrl: the full of the script tag.
- options *(optional)*:
    - exposeFuncs: Array of String. It'll create a function that will call the child component with the same name. It passes arguments and return value.
    - callbackName: If the scripts calls a global function when loaded, provide the callback name here. It'll be autoregistered on the window.
    - globalName: If wanted, provide the globalName of the loaded script. It'll be injected on the component with the same name *(ex: "grecaptcha")*

You can retrieve the child component using the fonction called `getComponent()`.

### Example

See https://github.com/dozoisch/react-google-recaptcha

```js

// recaptcha-wrapper.js
"use strict";
import React from "react";

import ReCAPTCHA from "./recaptcha";
import makeAsyncScriptLoader from "./react-async-script";

const callbackName = "onloadcallback";
const URL = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
const globalName = "grecaptcha";

export default makeAsyncScriptLoader(ReCAPTCHA, URL, {
  callbackName: callbackName,
  globalName: globalName,
});

// main.js
"use strict";
import React from "react";
import ReCAPTCHAWrapper from "./recaptcha-wrapper.js"

function onLoad() {
  console.log("script loaded");
}

let reCAPTCHAprops = {
  siteKey: "xxxxxxx",
  //...
};

React.render(
  <ReCAPTCHAWrapper asyncScriptOnLoad={onLoad} {...reCAPTCHAprops} />,
  document.body
);
```

## Expose Functions

This is really useful if the child component has some utility functions (like `getValue`) that you would like the wrapper to expose.

You can still retrieve the child component using `getComponent()`.

### Example

```js
const MockedComponent = React.createClass({
  displayName: "MockedComponent",

  callsACallback(fn) {
    fn();
  },

  render() {
    return <span/>;
  }
});

let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com", {
  exposeFuncs: ["callsACallback"]
});
let instance = ReactTestUtils.renderIntoDocument(
  <ComponentWrapper />
);
instance.callsACallback(function () { console.log("Called from child", this.constructor.displayName); });
```

---

*Inspired by [react-script-loader][sl]*

*The build tools are highly inspired by [react-bootstrap][rb]*

[travis.img]: https://travis-ci.org/dozoisch/react-async-script.svg?branch=master
[travis.url]: https://travis-ci.org/dozoisch/react-async-script
[npm.img]: https://badge.fury.io/js/react-async-script.svg
[npm.url]: http://badge.fury.io/js/react-async-script
[deps.img]: https://david-dm.org/dozoisch/react-async-script.svg
[deps.url]: https://david-dm.org/dozoisch/react-async-script
[devdeps.img]: https://david-dm.org/dozoisch/react-async-script/dev-status.svg
[devdeps.url]: https://david-dm.org/dozoisch/react-async-script#info=devDependencies

[dan_abramov]: https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750
[sl]: https://github.com/yariv/ReactScriptLoader
[rb]: https://github.com/react-bootstrap/react-bootstrap/
