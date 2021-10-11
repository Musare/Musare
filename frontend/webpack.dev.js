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
			// watchOptions: {
			// 	aggregateTimeout: 300,
			// 	poll: 1000
			// }
			watch: true
		},
		hot: true,
		historyApiFallback: true,
		port: config.get("frontendPort"),
		host: "0.0.0.0",
		allowedHosts: "all"
	}

	// devServer: {
	// 	// contentBase: "./dist/",
	// 	// historyApiFallback: true,
	// 	// hot: true,
	// 	// port: config.get("frontendPort"),
	// 	// // public: config.get("frontendDomain"),
	// 	// host: "0.0.0.0",
	// 	// watchOptions: {
	// 	// 	aggregateTimeout: 300,
	// 	// 	poll: 1000
	// 	// },
	// 	// disableHostCheck: true
	// }
});
