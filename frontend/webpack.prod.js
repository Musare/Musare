const { merge } = require("webpack-merge");
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const common = require("./webpack.common.js");

module.exports = merge(common, {
	mode: "production",
	devtool: "source-map",
	output: {
		publicPath: "/build/"
	},
	resolve: {
		alias: {
			vue: "vue/dist/vue.min.js",
			styles: "src/styles"
		}
	},
	plugins: [
		new BundleAnalyzerPlugin({
			analyzerMode: "static"
		})
	]
});
