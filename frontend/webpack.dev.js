process.env.NODE_CONFIG_DIR = `${__dirname}/dist/config/`;
const config = require("config");

const merge = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
	mode: "development",
	devtool: "inline-source-map",
	output: {
		publicPath: "/"
	},
	resolve: {
		alias: {
			vue: "vue/dist/vue.js",
			styles: "styles"
		}
	},
	devServer: {
		contentBase: "./dist/",
		historyApiFallback: true,
		hot: true,
		port: config.get("frontendPort"),
		public: config.get("frontendDomain"),
		watchOptions: {
			aggregateTimeout: 300,
			poll: 1000
		},
		host: "0.0.0.0",
		disableHostCheck: true
	}
});
