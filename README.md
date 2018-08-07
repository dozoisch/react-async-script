# React Async Script Loader

[![Build Status][travis.img]][travis.url] [![npm version][npm.img]][npm.url] [![npm downloads][npm.dl.img]][npm.dl.url] [![Dependencies][deps.img]][deps.url]

A React HOC for loading 3rd party scripts asynchronously. This HOC allows you to wrap a component that needs 3rd party resources, like reCAPTCHA or Google Maps, and have them load the script asynchronously.

## Usage

#### HOC api

`makeAsyncScriptLoader(getScriptUrl, options)(Component)`

- `Component`: The *Component* to wrap.
- `getScriptUrl`: *string* or *function* that returns the full URL of the script tag.
- `options` *(optional)*:
    - `exposeFuncs`: *array of strings* : It'll create a function that will call the child component with the same name. It passes arguments and return value.
    - `callbackName`: *string* : If the script needs to call a global function when finished loading *(for example: `recaptcha/api.js?onload=callbackName`)*. Please provide the callback name here and it will be autoregistered on `window` for you.
    - `globalName`: *string* : If wanted, provide the globalName of the loaded script. It'll be injected on the component with the same name *(ex: "grecaptcha")*
    - `removeOnUnmount`: *boolean* **default=false** : If set to `true` removes the script tag on the component unmount

#### HOC Component props
```
const AsyncScriptComponent = makeAsyncScriptLoader(URL)(Component);
---
<AsyncScriptComponent asyncScriptOnLoad={callAfterScriptLoads} />
```
- `asyncScriptOnLoad`: *function* : called after script loads


#### HOC Instance methods

- `getComponent()`: Using this method call you can retrieve the child component ref instance (the *Component* that is wrapped)


### Example

See https://github.com/dozoisch/react-google-recaptcha

```js

// recaptcha-wrapper.js
import React from "react";

import ReCAPTCHA from "./recaptcha";
import makeAsyncScriptLoader from "./react-async-script";

const callbackName = "onloadcallback";
const URL = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
const globalName = "grecaptcha";

export default makeAsyncScriptLoader(URL, {
  callbackName: callbackName,
  globalName: globalName,
})(ReCAPTCHA);


// main.js
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
class MockedComponent extends React.Component {

  callsACallback(fn) {
    fn();
  },

  render() {
    return <span/>;
  }
};
MockedComponent.displayName = "MockedComponent";

let ComponentWrapper = makeAsyncScriptLoader("http://example.com", {
  exposeFuncs: ["callsACallback"]
})(MockedComponent);

const instance = ReactTestUtils.renderIntoDocument(
  <ComponentWrapper />
);

instance.callsACallback(function () { console.log("Called from child", this.constructor.displayName); });
```

## Notes

Pre `1.0.0` and - `React < 15.5.*` support details in [0.11.1](https://github.com/dozoisch/react-async-script/tree/v0.11.1).

---

[travis.img]: https://travis-ci.org/dozoisch/react-async-script.svg?branch=master
[travis.url]: https://travis-ci.org/dozoisch/react-async-script
[npm.img]: https://badge.fury.io/js/react-async-script.svg
[npm.url]: http://badge.fury.io/js/react-async-script
[npm.dl.img]: https://img.shields.io/npm/dm/react-async-script.svg
[npm.dl.url]: https://www.npmjs.com/package/react-async-script
[deps.img]: https://david-dm.org/dozoisch/react-async-script.svg
[deps.url]: https://david-dm.org/dozoisch/react-async-script
