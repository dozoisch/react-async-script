"use strict";
import React, { PropTypes } from "react";

let SCRIPT_MAP = {};

// A counter used to generate a unique id for each component that uses
// ScriptLoaderMixin.
let idCount = 0;

export default function makeAsyncScript(Component, scriptURL, options) {
  options = options || {};
  const AsyncScriptLoader = React.createClass({
    displayName: "AsyncScriptLoader",

    propTypes: {
      onLoad: PropTypes.func,
    },

    statics: {
      triggerOnScriptLoaded() {
        let mapEntry = SCRIPT_MAP[scriptURL];
        if (!mapEntry || !mapEntry.loaded) {
          throw new Error("Script is not loaded.");
        }
        Object.keys(mapEntry.observers).forEach((obsKey) => {
          mapEntry.observers[obsKey](mapEntry);
        });
        delete window[options.callbackName];
      },
    },

    getInitialState() {
      return {};
    },

    getScriptLoaderID() {
      if (!this.__scriptLoaderID) {
        this.__scriptLoaderID = "async-script-loader-" + idCount++;
      }
      return this.__scriptLoaderID;
    },

    getComponent() {
      return this.refs.childComponent;
    },

    componentDidMount() {
      const key = this.getScriptLoaderID();
      const { globalName, callbackName, } = options;
      if (globalName && typeof window[globalName] !== "undefined") {
        SCRIPT_MAP[scriptURL] = { loaded: true };
      }

      if (SCRIPT_MAP[scriptURL]) {
        let entry = SCRIPT_MAP[scriptURL];
        if (entry.loaded || entry.errored) {
          this.handleLoad(entry);
          return;
        }
        entry.observers[key] = this.handleLoad;
        return;
      }

      let observers = {};
      observers[key] = this.handleLoad;
      SCRIPT_MAP[scriptURL] = {
        loaded: false,
        observers: observers,
      };

      let script = document.createElement("script");

      script.src = scriptURL;
      script.async = 1;

      let callObserverFuncAndRemoveObserver = (func) => {
        let mapEntry = SCRIPT_MAP[scriptURL];
        let observersMap = mapEntry ? mapEntry.observers : {};

        Object.keys(observersMap).forEach( (obsKey) => {
          let observer = observersMap[obsKey];
          if (func(observer)) {
            delete observersMap[obsKey];
          }
        });
      };

      if (callbackName && typeof window !== "undefined") {
        window[callbackName] = AsyncScriptLoader.triggerOnScriptLoaded;
      }

      script.onload = () => {
        let mapEntry = SCRIPT_MAP[scriptURL];
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
        let mapEntry = SCRIPT_MAP[scriptURL];
        mapEntry.errored = true;
        callObserverFuncAndRemoveObserver( (observer) => {
          observer(mapEntry);
          return true;
        });
      };

      // (old) MSIE browsers may call "onreadystatechange" instead of "onload"
      script.onreadystatechange = function() {
        if (this.readyState === "loaded") {
          // wait for other events, then call onload if default onload hadn't been called
          window.setTimeout(() => {
            if (SCRIPT_MAP[scriptURL].loaded !== true) {
              script.onload();
            }
          }, 0);
        }
      };

      document.body.appendChild(script);
    },

    handleLoad(state) {
      this.setState(state, this.props.onLoad);
    },

    componentWillUnmount() {
      // Clean the observer entry
      let mapEntry = SCRIPT_MAP[scriptURL];
      if (mapEntry) {
        delete mapEntry.observers[this.getScriptLoaderID()];
      }
    },

    render() {
      const globalName = options.globalName;
      let { onLoad, ...childProps } = this.props;
      if (globalName && typeof window !== "undefined") {
        childProps[globalName] = typeof window[globalName] !== "undefined" ? window[globalName] : undefined;
      }
      return <Component ref="childComponent" {...childProps} />;
    },

  });

  return AsyncScriptLoader;
};
