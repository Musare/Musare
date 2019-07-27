process.env["NODE_CONFIG_DIR"] = __dirname + "/dist/config/";
const config = require("config");

const merge = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
	mode: "development",
	devtool: "inline-source-map",
	devServer: {
		contentBase: "./dist/",
		historyApiFallback: true,
		hot: true,
		port: config.get("frontendPort"),
		public: config.get("frontendDomain"),
		disableHostCheck: true
	}
});
