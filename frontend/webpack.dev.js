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
			styles: "src/styles"
		}
	},
	devServer: {
		contentBase: "./dist/",
		historyApiFallback: true,
		hot: true,
		port: config.get("frontendPort"),
		public: config.get("frontendDomain"),
		host: "0.0.0.0",
		watchOptions: {
			ignored: /node_modules/
		},
		disableHostCheck: true,
		stats: { chunks: false, children: false }
	}
});
