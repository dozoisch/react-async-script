# Migrations

## Migrating from 0.11 to 1.0

- Component is now passed as a second function call
- removeOnMount is now removeOnUnmount (typo fixed!)
- exposeFuncs is no longer needed as it's done automatically!

```diff
-export default makeAsyncScriptLoader(ReCAPTCHA, getURL, {
+export default makeAsyncScriptLoader(getURL, {
   callbackName,
   globalName,
-  removeOnMount: initialOptions.removeOnMount || false,
+  removeOnUnmount: initialOptions.removeOnUnmount || false,
-  exposeFuncs: ["getValue", "getWidgetId", "reset", "execute"],
-});
+})(ReCAPTCHA);
```
