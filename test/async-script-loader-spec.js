"use strict";
import React from "react";
import ReactTestUtils from "react/lib/ReactTestUtils";
import makeAsyncScriptLoader from "../src/async-script-loader";

const MockedComponent = React.createClass({
  displayName: "MockedComponent",
  render() {
    return <span/>;
  }
});

describe("AsyncScriptLoader", () => {
  it("should be imported successfully", () => {
    assert.isNotNull(makeAsyncScriptLoader);
  });

  it("should return a component that contains the passed component", () => {
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com");
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    assert.ok(ReactTestUtils.isCompositeComponent(instance));
    assert.ok(ReactTestUtils.isCompositeComponentWithType(instance, ComponentWrapper));
    assert.isNotNull(ReactTestUtils.findRenderedComponentWithType(instance, MockedComponent));
  });
  it("should unmount successfully", () => {
    let ComponentWrapper = makeAsyncScriptLoader(MockedComponent, "http://example.com");
    let instance = ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );
    React.unmountComponentAtNode(document);
  });
});
