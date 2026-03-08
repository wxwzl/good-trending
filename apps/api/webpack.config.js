const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    target: 'node',
    mode: 'production',
    externals: [nodeExternals({
      // 将 workspace 包打包进 bundle
      allowlist: [/^@good-trending/],
    })],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      // 将所有代码打包到一个文件
      libraryTarget: 'commonjs2',
    },
    optimization: {
      minimize: false,
    },
  };
};
