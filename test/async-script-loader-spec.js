import React from "react";
import ReactDOM from "react-dom";
import ReactTestUtils from "react-dom/test-utils";
import * as ReactIs from "react-is";
import makeAsyncScriptLoader from "../src/async-script-loader";

class MockedComponent extends React.Component {
  render() {
    return <span/>;
  }
}

const getScript = (URL, toBoolean = false) => {
  const scripTags = document.getElementsByTagName("script");
  for (let i = 0; i < scripTags.length; i += 1) {
    if (scripTags[i].src.indexOf(URL) > -1) {
      return toBoolean ? true : scripTags[i];
    }
  }
  return toBoolean ? false : undefined;
}

const hasScript = (URL) => getScript(URL, true)

const documentLoadScript = (URL) => {
  const script = getScript(URL);
  script.onload();
}

const documentErrorScript = (URL) => {
  const script = getScript(URL);
  script.onerror();
}

describe("AsyncScriptLoader", () => {
  it("should be imported successfully", () => {
    assert.isNotNull(makeAsyncScriptLoader);
  });

  it("should return a component that contains the passed component and fire asyncScriptOnLoad", () => {
    const URL = "http://example.com/?default=true";
    let asyncScriptOnLoadCalled = false;
    let scriptErrored = false;
    let scriptLoaded = false;
    const asyncScriptOnLoadSpy = (entry) => {
      scriptLoaded = entry.loaded;
      scriptErrored = entry.errored;
      asyncScriptOnLoadCalled = true;
    }
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    assert.equal(ComponentWrapper.displayName, "AsyncScriptLoader(MockedComponent)");
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );
    documentLoadScript(URL);

    assert.equal(ReactIs.isValidElementType(ComponentWrapper), true, "is valid elemnt type");
    assert.equal(ReactIs.isForwardRef(<ComponentWrapper />), true, "is valid forwardRef");
    assert.equal(hasScript(URL), true, "Url in document");
    assert.equal(asyncScriptOnLoadCalled, true, "asyncScriptOnLoad callback called");
    assert.equal(scriptLoaded, true, "script loaded state set");
    assert.equal(scriptErrored, undefined, "script errored state unset");
  });

  it("should fire asyncScriptOnLoad on errored script load", () => {
    const URL = "http://example.com/?errored=true";
    let asyncScriptOnLoadCalled = false;
    let scriptErrored = false;
    let scriptLoaded = false;
    const asyncScriptOnLoadSpy = (entry) => {
      scriptErrored = entry.errored;
      scriptLoaded = entry.loaded;
      asyncScriptOnLoadCalled = true;
    }
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );
    documentErrorScript(URL);

    assert.equal(hasScript(URL), true, "Url in document");
    assert.equal(asyncScriptOnLoadCalled, true, "asyncScriptOnLoad callback called");
    assert.equal(scriptErrored, true, "script errored state set");
    assert.equal(scriptLoaded, false, "script loaded state set");
  });

  it("should handle successfully already loaded global object and fire asyncScriptOnLoad", () => {
    const URL = "http://example.com/?global=true";
    const globalName = "SomeGlobal";
    window[globalName] = {};
    let asyncScriptOnLoadCalled = false;
    const asyncScriptOnLoadSpy = () => {
      asyncScriptOnLoadCalled = true;
    }
    const ComponentWrapper = makeAsyncScriptLoader(URL, { globalName: globalName })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    assert.equal(hasScript(URL), false, "Url not in document");
    assert.equal(asyncScriptOnLoadCalled, true, "asyncScriptOnLoad callback called");
    delete window[globalName];
  });

  it("should accept a function for scriptURL", () => {
    const URL = "http://example.com/?url=function";
    const ComponentWrapper = makeAsyncScriptLoader(() => URL)(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );

    assert.equal(hasScript(URL), true, "Url in document");
  });

  it("should expose statics", (done) => {
    class MockedComponentWithStatic extends React.Component {
      static callsACallback(fn) { fn(); }
      render() { return <span/>; }
    }
    const URL = "http://example.com/?functions=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponentWithStatic);
    ComponentWrapper.callsACallback(done);
  });

  it("should not remove tag script on removeOnUnmount option not set", () => {
    const URL = "http://example.com/?removeOnUnmount=notset";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <div>
        <ComponentWrapper />
      </div>
    );

    assert.equal(hasScript(URL), true, "Url in document");
    const unmounted = ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance).parentNode);
    assert.equal(unmounted, true, "successfully unmounted");
    assert.equal(hasScript(URL), true, "Url still in document after unmounting");
  });

  it("should remove tag script on removeOnUnmount option set to true", () => {
    const URL = "http://example.com/?removeOnUnmount=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL, { removeOnUnmount: true })(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <div>
        <ComponentWrapper />
      </div>
    );

    assert.equal(hasScript(URL), true, "Url in document");
    const unmounted = ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance).parentNode);
    assert.equal(unmounted, true, "successfully unmounted");
    assert.equal(hasScript(URL), false, "Url not in document after unmounting");
  });

  it("should allow you to access methods on the wrappedComponent via ref callback", (done) => {
    // internal component with method we want access to
    class InternalComponent extends React.Component {
      internalCallsACallback(fn) { fn(); }
      render() { return ( <div className='bob' /> )}
    }
    const URL = "http://example.com/?ref=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(InternalComponent);

    // wrapping component that applies a ref to our AsyncHOC(InternalComponent)
    class WrappingComponent extends React.Component {
      render() { return (<div><ComponentWrapper ref={(r) => this._internalRef = r} /></div>)}
    }
    const instance = ReactTestUtils.renderIntoDocument(
      <WrappingComponent />
    );

    assert.equal(hasScript(URL), true, "Url in document");
    assert.isOk(instance._internalRef.internalCallsACallback, "internal components method available");
    instance._internalRef.internalCallsACallback(done);
  });

  it("should allow you to access methods on the wrappedComponent via createRef", (done) => {
    // internal component with method we want access to
    class InternalComponent extends React.Component {
      internalCallsACallback(fn) { fn(); }
      render() { return ( <div className='bob' /> )}
    }
    const URL = "http://example.com/?createRef=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(InternalComponent);

    // wrapping component that applies a ref to our AsyncHOC(InternalComponent)
    class WrappingComponent extends React.Component {
      constructor(props) {
        super(props);
        this._internalRef = React.createRef();
      }
      render() { return (<div><ComponentWrapper ref={this._internalRef} /></div>)}
    }
    const instance = ReactTestUtils.renderIntoDocument(
      <WrappingComponent />
    );

    assert.equal(hasScript(URL), true, "Url in document");
    assert.isOk(instance._internalRef.current.internalCallsACallback, "internal components method available");
    instance._internalRef.current.internalCallsACallback(done);
  });
});
