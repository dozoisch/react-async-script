import React from "react";
import ReactDOM from "react-dom";
import ReactTestUtils from "react-dom/test-utils";
import makeAsyncScriptLoader from "../src/async-script-loader";

class MockedComponent extends React.Component {
  callsACallback(fn) {
    assert.equal(this.constructor.name, "MockedComponent");
    fn();
  }

  render() {
    return <span/>;
  }
}

const hasScript = (URL) => {
  const scripTags = document.getElementsByTagName("script");
  for (let i = 0; i < scripTags.length; i += 1) {
    if (scripTags[i].src.indexOf(URL) > -1) {
      return true;
    }
  }
  return false;
}

describe("AsyncScriptLoader", () => {
  it("should be imported successfully", () => {
    assert.isNotNull(makeAsyncScriptLoader);
  });

  it("should return a component that contains the passed component", () => {
    const URL = "http://example.com";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    assert.equal(ComponentWrapper.displayName, "AsyncScriptLoader(MockedComponent)");
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.ok(ReactTestUtils.isCompositeComponent(instance));
    assert.ok(ReactTestUtils.isCompositeComponentWithType(instance, ComponentWrapper));
    assert.isNotNull(ReactTestUtils.findRenderedComponentWithType(instance, MockedComponent));
    assert.equal(hasScript(URL), true);
  });
  it("should handle successfully already loaded global object", () => {
    const URL = "http://example.com";
    const globalName = "SomeGlobal";
    window[globalName] = {};
    const ComponentWrapper = makeAsyncScriptLoader(URL, { globalName: globalName })(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.equal(hasScript(URL), true);
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
    assert.equal(hasScript(URL), true);
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
  });

  it("should expose functions with scope correctly", (done) => {
    const ComponentWrapper = makeAsyncScriptLoader("http://example.com/", {
      exposeFuncs: ["callsACallback"],
    })(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    instance.callsACallback(done);
  });
  it("should not remove tag script on removeOnUnmount option not set", () => {
    const URL = "http://example.com/?removeOnUnmount=notset";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.equal(hasScript(URL), true);
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    assert.equal(hasScript(URL), true);
  });
  it("should remove tag script on removeOnUnmount option set to true", () => {
    const URL = "http://example.com/?removeOnUnmount=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL, { removeOnUnmount: true })(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.equal(hasScript(URL), true);
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    assert.equal(hasScript(URL), false);
  });
});
