import React from "react";
import PropTypes from "prop-types";

let SCRIPT_MAP = {};

// A counter used to generate a unique id for each component that uses the function
let idCount = 0;

export default function makeAsyncScript(Component, getScriptURL, options) {
  options = options || {};
  const wrappedComponentName =
    Component.displayName || Component.name || "Component";

  class AsyncScriptLoader extends React.Component {
    constructor() {
      super();
      this.state = {};
      this.__scriptURL = "";
    }

    asyncScriptLoaderGetScriptLoaderID() {
      if (!this.__scriptLoaderID) {
        this.__scriptLoaderID = "async-script-loader-" + idCount++;
      }
      return this.__scriptLoaderID;
    }

    setupScriptURL() {
      this.__scriptURL =
        typeof getScriptURL === "function" ? getScriptURL() : getScriptURL;
      return this.__scriptURL;
    }

    getComponent() {
      return this.__childComponent;
    }

    asyncScriptLoaderHandleLoad(state) {
      this.setState(state, this.props.asyncScriptOnLoad);
    }

    asyncScriptLoaderTriggerOnScriptLoaded() {
      let mapEntry = SCRIPT_MAP[this.__scriptURL];
      if (!mapEntry || !mapEntry.loaded) {
        throw new Error("Script is not loaded.");
      }
      for (let obsKey in mapEntry.observers) {
        mapEntry.observers[obsKey](mapEntry);
      }
      delete window[options.callbackName];
    }

    componentDidMount() {
      const scriptURL = this.setupScriptURL();
      const key = this.asyncScriptLoaderGetScriptLoaderID();
      const { globalName, callbackName } = options;
      if (globalName && typeof window[globalName] !== "undefined") {
        SCRIPT_MAP[scriptURL] = { loaded: true, observers: {} };
      }

      if (SCRIPT_MAP[scriptURL]) {
        let entry = SCRIPT_MAP[scriptURL];
        if (entry && (entry.loaded || entry.errored)) {
          this.asyncScriptLoaderHandleLoad(entry);
          return;
        }
        entry.observers[key] = entry => this.asyncScriptLoaderHandleLoad(entry);
        return;
      }

      let observers = {};
      observers[key] = entry => this.asyncScriptLoaderHandleLoad(entry);
      SCRIPT_MAP[scriptURL] = {
        loaded: false,
        observers,
      };

      let script = document.createElement("script");

      script.src = scriptURL;
      script.async = true;

      let callObserverFuncAndRemoveObserver = func => {
        if (SCRIPT_MAP[scriptURL]) {
          let mapEntry = SCRIPT_MAP[scriptURL];
          let observersMap = mapEntry.observers;

          for (let obsKey in observersMap) {
            if (func(observersMap[obsKey])) {
              delete observersMap[obsKey];
            }
          }
        }
      };

      if (callbackName && typeof window !== "undefined") {
        window[callbackName] = () =>
          this.asyncScriptLoaderTriggerOnScriptLoaded();
      }

      script.onload = () => {
        let mapEntry = SCRIPT_MAP[scriptURL];
        if (mapEntry) {
          mapEntry.loaded = true;
          callObserverFuncAndRemoveObserver(observer => {
            if (callbackName) {
              return false;
            }
            observer(mapEntry);
            return true;
          });
        }
      };
      script.onerror = event => {
        let mapEntry = SCRIPT_MAP[scriptURL];
        if (mapEntry) {
          mapEntry.errored = true;
          callObserverFuncAndRemoveObserver(observer => {
            observer(mapEntry);
            return true;
          });
        }
      };

      // (old) MSIE browsers may call "onreadystatechange" instead of "onload"
      script.onreadystatechange = () => {
        if (this.readyState === "loaded") {
          // wait for other events, then call onload if default onload hadn't been called
          window.setTimeout(() => {
            const mapEntry = SCRIPT_MAP[scriptURL];
            if (mapEntry && mapEntry.loaded !== true) {
              script.onload();
            }
          }, 0);
        }
      };

      document.body.appendChild(script);
    }

    componentWillUnmount() {
      // Remove tag script
      const scriptURL = this.__scriptURL;
      if (options.removeOnUnmount === true) {
        const allScripts = document.getElementsByTagName("script");
        for (let i = 0; i < allScripts.length; i += 1) {
          if (allScripts[i].src.indexOf(scriptURL) > -1) {
            if (allScripts[i].parentNode) {
              allScripts[i].parentNode.removeChild(allScripts[i]);
            }
          }
        }
      }
      // Clean the observer entry
      let mapEntry = SCRIPT_MAP[scriptURL];
      if (mapEntry) {
        delete mapEntry.observers[this.asyncScriptLoaderGetScriptLoaderID()];
        if (options.removeOnUnmount === true) {
          delete SCRIPT_MAP[scriptURL];
        }
      }
    }

    render() {
      const globalName = options.globalName;
      // remove asyncScriptOnLoad from childprops
      let { asyncScriptOnLoad, ...childProps } = this.props;
      if (globalName && typeof window !== "undefined") {
        childProps[globalName] =
          typeof window[globalName] !== "undefined"
            ? window[globalName]
            : undefined;
      }
      return (
        <Component
          ref={comp => {
            this.__childComponent = comp;
          }}
          {...childProps}
        />
      );
    }
  }
  AsyncScriptLoader.displayName = `AsyncScriptLoader(${wrappedComponentName})`;
  AsyncScriptLoader.propTypes = {
    asyncScriptOnLoad: PropTypes.func,
  };

  if (options.exposeFuncs) {
    options.exposeFuncs.forEach(funcToExpose => {
      AsyncScriptLoader.prototype[funcToExpose] = function() {
        return this.getComponent()[funcToExpose](...arguments);
      };
    });
  }
  return AsyncScriptLoader;
}
