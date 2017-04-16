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

const hasScript = () => {
  const scripTags = document.getElementsByTagName("script");
  for (let i = 0; i < scripTags.length; i += 1) {
    if (scripTags[i].src.indexOf("http://example.com") > -1) {
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
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com");
    assert.equal(ComponentWrapper.displayName, "AsyncScriptLoader(MockedComponent)");
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.ok(ReactTestUtils.isCompositeComponent(instance));
    assert.ok(ReactTestUtils.isCompositeComponentWithType(instance, ComponentWrapper));
    assert.isNotNull(ReactTestUtils.findRenderedComponentWithType(instance, MockedComponent));
  });
  it("should handle successfully already loaded global object", () => {
    let globalName = "SomeGlobal";
    window[globalName] = {};
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com", { globalName: globalName });
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    delete window[globalName];
  });

  it("should expose functions with scope correctly", (done) => {
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com", {
      exposeFuncs: ["callsACallback"],
    });
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    instance.callsACallback(done);
  });
  it("should not remove tag script on removeOnUnmount option not set", () => {
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com");
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.equal(hasScript(), true);
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    assert.equal(hasScript(), true);
  });
  it("should remove tag script on removeOnUnmount option set to true", () => {
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com", { removeOnUnmount: true });
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.equal(hasScript(), true);
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(instance));
    instance.componentWillUnmount();
    assert.equal(hasScript(), false);
  });
});
