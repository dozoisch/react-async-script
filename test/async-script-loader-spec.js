import React from "react";
import ReactDOM from "react-dom";
import ReactTestUtils from "react-dom/test-utils";
import * as ReactIs from "react-is";
import makeAsyncScriptLoader from "../src/async-script-loader";

class MockedComponent extends React.Component {
  render() {
    return <span />;
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
};

const hasScript = URL => getScript(URL, true);

const documentLoadScript = URL => {
  const script = getScript(URL);
  script.onload();
};

const documentErrorScript = URL => {
  const script = getScript(URL);
  script.onerror();
};

describe("AsyncScriptLoader", () => {
  it("should be imported successfully", () => {
    expect(makeAsyncScriptLoader).not.toBeNull();
  });

  it("should return a component that contains the passed component and fire asyncScriptOnLoad", () => {
    const URL = "http://example.com/?default=true";
    let asyncScriptOnLoadCalled = false;
    let scriptErrored = false;
    let scriptLoaded = false;
    const asyncScriptOnLoadSpy = entry => {
      scriptLoaded = entry.loaded;
      scriptErrored = entry.errored;
      asyncScriptOnLoadCalled = true;
    };
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    expect(ComponentWrapper.displayName).toEqual(
      "AsyncScriptLoader(MockedComponent)"
    );
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );
    documentLoadScript(URL);

    expect(ReactIs.isValidElementType(ComponentWrapper)).toEqual(true);
    expect(ReactIs.isForwardRef(<ComponentWrapper />)).toEqual(true);
    expect(hasScript(URL)).toEqual(true);
    expect(asyncScriptOnLoadCalled).toEqual(true);
    expect(scriptLoaded).toEqual(true);
    expect(scriptErrored).toEqual(undefined);
  });

  it("should fire asyncScriptOnLoad on errored script load", () => {
    const URL = "http://example.com/?errored=true";
    let asyncScriptOnLoadCalled = false;
    let scriptErrored = false;
    let scriptLoaded = false;
    const asyncScriptOnLoadSpy = entry => {
      scriptErrored = entry.errored;
      scriptLoaded = entry.loaded;
      asyncScriptOnLoadCalled = true;
    };
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );
    documentErrorScript(URL);

    expect(hasScript(URL)).toEqual(true);
    expect(asyncScriptOnLoadCalled).toEqual(true);
    expect(scriptErrored).toEqual(true);
    expect(scriptLoaded).toEqual(false);
  });

  it("should handle successfully already loaded global object and fire asyncScriptOnLoad", () => {
    const URL = "http://example.com/?global=true";
    const globalName = "SomeGlobal";
    window[globalName] = {};
    let asyncScriptOnLoadCalled = false;
    const asyncScriptOnLoadSpy = () => {
      asyncScriptOnLoadCalled = true;
    };
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      globalName: globalName
    })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    expect(hasScript(URL)).toEqual(false);
    expect(asyncScriptOnLoadCalled).toEqual(true);
    delete window[globalName];
  });

  it("should accept a function for scriptURL", () => {
    const URL = "http://example.com/?url=function";
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(() => URL)(MockedComponent);
    ReactTestUtils.renderIntoDocument(<ComponentWrapper />);

    expect(hasScript(URL)).toEqual(true);
  });

  it("should add a id to the script tag", () => {
    const URL = "http://example.com/?has_an_id=true";
    const scriptId = "SOME_SCRIPT_ID";

    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL, { scriptId })(
      MockedComponent
    );
    ReactTestUtils.renderIntoDocument(<ComponentWrapper />);

    expect(hasScript(URL)).toEqual(true);
    const script = getScript(URL);
    expect(script.id).toEqual(scriptId);
  });

  it("should expose statics", done => {
    class MockedComponentWithStatic extends React.Component {
      static callsACallback(fn) {
        fn();
      }
      render() {
        return <span />;
      }
    }
    const URL = "http://example.com/?functions=true";
    const ComponentWrapper = makeAsyncScriptLoader(URL)(
      MockedComponentWithStatic
    );
    ComponentWrapper.callsACallback(done);
  });

  it("should not remove tag script on removeOnUnmount option not set", () => {
    const URL = "http://example.com/?removeOnUnmount=notset";
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL)(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <div>
        <ComponentWrapper />
      </div>
    );

    expect(hasScript(URL)).toEqual(true);
    const unmounted = ReactDOM.unmountComponentAtNode(
      ReactDOM.findDOMNode(instance).parentNode
    );
    expect(unmounted).toEqual(true);
    expect(hasScript(URL)).toEqual(true);
  });

  it("should remove tag script on removeOnUnmount option set to true", () => {
    const URL = "http://example.com/?removeOnUnmount=true";
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      removeOnUnmount: true
    })(MockedComponent);
    const instance = ReactTestUtils.renderIntoDocument(
      <div>
        <ComponentWrapper />
      </div>
    );

    expect(hasScript(URL)).toEqual(true);
    const unmounted = ReactDOM.unmountComponentAtNode(
      ReactDOM.findDOMNode(instance).parentNode
    );
    expect(unmounted).toEqual(true);
    expect(hasScript(URL)).toEqual(false);
  });

  it("should allow you to access methods on the wrappedComponent via ref callback", done => {
    // internal component with method we want access to
    class InternalComponent extends React.Component {
      internalCallsACallback(fn) {
        fn();
      }
      render() {
        return <div className="bob" />;
      }
    }
    const URL = "http://example.com/?ref=true";
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL)(InternalComponent);

    // wrapping component that applies a ref to our AsyncHOC(InternalComponent)
    // eslint-disable-next-line no-unused-vars
    class WrappingComponent extends React.Component {
      render() {
        return (
          <div>
            <ComponentWrapper ref={r => (this._internalRef = r)} />
          </div>
        );
      }
    }
    const instance = ReactTestUtils.renderIntoDocument(<WrappingComponent />);

    expect(hasScript(URL)).toEqual(true);
    expect(instance._internalRef.internalCallsACallback).toBeTruthy();
    instance._internalRef.internalCallsACallback(done);
  });

  it("should allow you to access methods on the wrappedComponent via createRef", done => {
    // internal component with method we want access to
    class InternalComponent extends React.Component {
      internalCallsACallback(fn) {
        fn();
      }
      render() {
        return <div className="bob" />;
      }
    }
    const URL = "http://example.com/?createRef=true";
    // eslint-disable-next-line no-unused-vars
    const ComponentWrapper = makeAsyncScriptLoader(URL)(InternalComponent);

    // wrapping component that applies a ref to our AsyncHOC(InternalComponent)
    // eslint-disable-next-line no-unused-vars
    class WrappingComponent extends React.Component {
      constructor(props) {
        super(props);
        this._internalRef = React.createRef();
      }
      render() {
        return (
          <div>
            <ComponentWrapper ref={this._internalRef} />
          </div>
        );
      }
    }
    const instance = ReactTestUtils.renderIntoDocument(<WrappingComponent />);

    expect(hasScript(URL)).toEqual(true);
    expect(instance._internalRef.current.internalCallsACallback).toBeTruthy();
    instance._internalRef.current.internalCallsACallback(done);
  });

  it("should expose global callback", () => {
    const callbackName = 'exampleCallback';
    const URL = `http://example.com/?callback=${callbackName}`;
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      callbackName
    })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper />
    );

    expect(typeof window[callbackName]).toBe('function');
    delete window[callbackName];
  })

  it("should call loaded if global callback called before onLoad", () => {
    const callbackName = 'exampleCallbackBeforeOnload';
    const URL = `http://example.com/?callback=${callbackName}`;
    let asyncScriptOnLoadCalled = false;
    const asyncScriptOnLoadSpy = () => {
      asyncScriptOnLoadCalled = true;
    };
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      callbackName
    })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    window[callbackName]();
    expect(asyncScriptOnLoadCalled).toEqual(true);
    delete window[callbackName];
  })

  it("should call loaded only once if global callback then onload", () => {
    const callbackName = 'exampleCallbackThenOnload';
    const URL = `http://example.com/?callback=${callbackName}`;
    let asyncScriptOnLoadCalled = false;
    let callCount = 0;
    const asyncScriptOnLoadSpy = () => {
      asyncScriptOnLoadCalled = true;
      callCount++;
    };
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      callbackName
    })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    window[callbackName]();
    expect(asyncScriptOnLoadCalled).toEqual(true);
    documentLoadScript(URL);
    expect(callCount).toEqual(1);
    delete window[callbackName];
  })

  it("should call loaded only once if onload then global callback", () => {
    const callbackName = 'exampleOnloadThenCallback';
    const URL = `http://example.com/?callback=${callbackName}`;
    let asyncScriptOnLoadCalled = false;
    let callCount = 0;
    const asyncScriptOnLoadSpy = () => {
      asyncScriptOnLoadCalled = true;
      callCount++;
    };
    const ComponentWrapper = makeAsyncScriptLoader(URL, {
      callbackName
    })(MockedComponent);
    ReactTestUtils.renderIntoDocument(
      <ComponentWrapper asyncScriptOnLoad={asyncScriptOnLoadSpy} />
    );

    documentLoadScript(URL);
    expect(asyncScriptOnLoadCalled).toEqual(true);
    window[callbackName]();
    expect(callCount).toEqual(1);
    delete window[callbackName];
  })
});
