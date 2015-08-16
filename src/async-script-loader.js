import React, { PropTypes } from "react";

let SCRIPT_MAP = new Map();

// A counter used to generate a unique id for each component that uses the function
let idCount = 0;

export default function makeAsyncScript(Component, scriptURL, options) {
  options = options || {};
  let funcs = {
    displayName: "AsyncScriptLoader",

    propTypes: {
      asyncScriptOnLoad: PropTypes.func,
    },

    statics: {
      asyncScriptLoaderTriggerOnScriptLoaded() {
        let mapEntry = SCRIPT_MAP.get(scriptURL);
        if (!mapEntry || !mapEntry.loaded) {
          throw new Error("Script is not loaded.");
        }
        for (let observer of mapEntry.observers.values()) {
          observer(mapEntry);
        }
        delete window[options.callbackName];
      },
    },

    getInitialState() {
      return {};
    },

    asyncScriptLoaderGetScriptLoaderID() {
      if (!this.__scriptLoaderID) {
        this.__scriptLoaderID = "async-script-loader-" + idCount++;
      }
      return this.__scriptLoaderID;
    },

    getComponent() {
      return this.childComponent;
    },

    componentDidMount() {
      const key = this.asyncScriptLoaderGetScriptLoaderID();
      const { globalName, callbackName } = options;
      if (globalName && typeof window[globalName] !== "undefined") {
        SCRIPT_MAP.set(scriptURL, { loaded: true, observers: new Map() });
      }

      if (SCRIPT_MAP.has(scriptURL)) {
        let entry = SCRIPT_MAP.get(scriptURL);
        if (entry.loaded || entry.errored) {
          this.asyncScriptLoaderHandleLoad(entry);
          return;
        }
        entry.observers.set(key, this.asyncScriptLoaderHandleLoad);
        return;
      }

      let observers = new Map();
      observers.set(key, this.asyncScriptLoaderHandleLoad);
      SCRIPT_MAP.set(scriptURL, {
        loaded: false,
        observers: observers,
      });

      let script = document.createElement("script");

      script.src = scriptURL;
      script.async = 1;

      let callObserverFuncAndRemoveObserver = (func) => {
        if (SCRIPT_MAP.has(scriptURL)) {
          let mapEntry = SCRIPT_MAP.get(scriptURL);
          let observersMap = mapEntry.observers;

          for (let [obsKey, observer] of observersMap) {
            if (func(observer)) {
              observersMap.delete(obsKey);
            }
          }
        }
      };

      if (callbackName && typeof window !== "undefined") {
        window[callbackName] = AsyncScriptLoader.asyncScriptLoaderTriggerOnScriptLoaded;
      }

      script.onload = () => {
        let mapEntry = SCRIPT_MAP.get(scriptURL);
        mapEntry.loaded = true;
        callObserverFuncAndRemoveObserver( (observer) => {
          if (callbackName) {
            return false;
          }
          observer(mapEntry);
          return true;
        });
      };
      script.onerror = (event) => {
        let mapEntry = SCRIPT_MAP.get(scriptURL);
        mapEntry.errored = true;
        callObserverFuncAndRemoveObserver( (observer) => {
          observer(mapEntry);
          return true;
        });
      };

      // (old) MSIE browsers may call "onreadystatechange" instead of "onload"
      script.onreadystatechange = () => {
        if (this.readyState === "loaded") {
          // wait for other events, then call onload if default onload hadn't been called
          window.setTimeout(() => {
            if (SCRIPT_MAP.get(scriptURL).loaded !== true) {
              script.onload();
            }
          }, 0);
        }
      };

      document.body.appendChild(script);
    },

    asyncScriptLoaderHandleLoad(state) {
      this.setState(state, this.props.asyncScriptOnLoad);
    },

    componentWillUnmount() {
      // Clean the observer entry
      let mapEntry = SCRIPT_MAP.get(scriptURL);
      if (mapEntry) {
        mapEntry.observers.delete(this.asyncScriptLoaderGetScriptLoaderID());
      }
    },

    render() {
      const globalName = options.globalName;
      let { asyncScriptOnLoad, ...childProps } = this.props;
      if (globalName && typeof window !== "undefined") {
        childProps[globalName] = typeof window[globalName] !== "undefined" ? window[globalName] : undefined;
      }
      return <Component ref={(comp) => {this.childComponent = comp; }} {...childProps} />;
    },

  };

  if (options.exposeFuncs) {
    for (let funcToExpose of options.exposeFuncs) {
      /* eslint-disable no-loop-func */
      funcs[funcToExpose] = function() {
        return this.childComponent[funcToExpose](...arguments);
      };
      /* eslint-enable no-loop-func */
    }
  }
  const AsyncScriptLoader = React.createClass(funcs);

  return AsyncScriptLoader;
}
