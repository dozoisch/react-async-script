/* eslint-env node */
const DefinePlugin = require("webpack").DefinePlugin;
module.exports = {
  mode: "development",
  output: {
    pathinfo: true
  },
  devtool: "inline-source-map",

  module: {
    rules: [
      {
        test: /\.js/,
        loader: "babel-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    })
  ]
};
