const VueLoaderPlugin = require("vue-loader/lib/plugin");
const WebpackMd5Hash = require("webpack-md5-hash");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: "./main.js",
	output: {
		path: `${__dirname}/dist/build/`,
		filename: "[name].[hash].js"
	},
	plugins: [
		new VueLoaderPlugin(),
		new WebpackMd5Hash(),
		new HtmlWebpackPlugin({
			hash: true,
			template: "dist/index.tpl.html",
			inject: "body",
			filename: "index.html"
		})
	],
	module: {
		rules: [
			{
				enforce: "pre",
				test: /\.vue$/,
				loader: "eslint-loader",
				exclude: /node_modules/
			},
			{
				test: /\.vue$/,
				loader: "vue-loader",
				exclude: /node_modules/
			},
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "eslint-loader",
				exclude: /node_modules/
			},
			{
				test: /\.js$/,
				loader: "babel-loader",
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				exclude: /node_modules/,
				use: ["vue-style-loader", "css-loader", "sass-loader"]
			}
		]
	},
	externals: {
		moment: "moment"
	}
};
