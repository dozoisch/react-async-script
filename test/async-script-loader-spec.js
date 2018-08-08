import React from "react";
import ReactDOM from "react-dom";
import ReactTestUtils from "react-dom/test-utils";
import makeAsyncScriptLoader from "../src/async-script-loader";

class MockedComponent extends React.Component {
  static callsACallback(fn) {
    fn();
  }

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
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );
    documentLoadScript(URL);

    assert.ok(ReactTestUtils.isCompositeComponent(instance));
    assert.ok(ReactTestUtils.isCompositeComponentWithType(instance, ComponentWrapper));
    assert.isNotNull(ReactTestUtils.findRenderedComponentWithType(instance, MockedComponent));
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
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    assert.equal(hasScript(URL), false, "Url not in document");
    assert.equal(asyncScriptOnLoadCalled, true, "asyncScriptOnLoad callback called");
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    delete window[globalName];
  });

  it("should accept a function for scriptURL", () => {
    const URL = "http://example.com/?url=function";
    const ComponentWrapper = makeAsyncScriptLoader(() => URL)(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );

    assert.equal(hasScript(URL), true, "Url in document");
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
  });

  it("should expose statics", (done) => {
    const URL = "http://example.com/?functions=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    ComponentWrapper.callsACallback(done);
  });

  it("should not remove tag script on removeOnUnmount option not set", () => {
    const URL = "http://example.com/?removeOnUnmount=notset";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
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
      <ComponentWrapper />
    );

    assert.equal(hasScript(URL), true, "Url in document");
    const unmounted = ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance).parentNode);
    assert.equal(unmounted, true, "successfully unmounted");
    assert.equal(hasScript(URL), false, "Url not in document after unmounting");
  });

  it("should allow you to access methods on the wrappedComponent via getComponent", (done) => {
    class MockedComponentMethod extends React.Component {
      callsACallback(fn) {
        assert.equal(this.constructor.name, "MockedComponentMethod");
        fn();
      }
      render() { return <span/>; }
    }
    const URL = "http://example.com/?getComponent=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponentMethod);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    const wrappedComponent = instance.getComponent();

    assert.equal(hasScript(URL), true, "Url in document");
    wrappedComponent.callsACallback(done);
  });
});
