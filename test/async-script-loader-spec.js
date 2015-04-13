import React from "react";
import ReactTestUtils from "react/lib/ReactTestUtils";
import makeAsyncScriptLoader from "../src/async-script-loader";

describe("AsyncScriptLoader", () => {
  it("should be imported successfully", () => {
    assert.isNotNull(makeAsyncScriptLoader);
  });
});
