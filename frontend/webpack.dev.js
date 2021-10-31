process.env.NODE_CONFIG_DIR = `${__dirname}/dist/config/`;
const config = require("config");

const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
module.exports = merge(common, {
	mode: "development",
	devtool: "inline-source-map",
	output: {
		publicPath: "/"
	},
	resolve: {
		alias: {
			styles: "src/styles",
			vue: "vue/dist/vue.esm-bundler.js"
		}
	},
	devServer: {
		static: {
			directory: "./dist/",
			watch: true
		},
		client: {
			webSocketURL: config.get("devServer.webSocketURL")
		},
		hot: true,
		historyApiFallback: true,
		port: config.get("devServer.port"),
		host: "0.0.0.0",
		allowedHosts: "all"
	}
});
