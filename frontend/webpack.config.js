const webpack = require('webpack');
const WebpackMd5Hash = require('webpack-md5-hash');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	devtool: 'eval-source-map',
	entry: './main.js',
	output: {
		path: __dirname + '/build/',
		publicPath: '/',
		filename: '[name].[chunkhash].js'
	},
	plugins: [
		new WebpackMd5Hash(),
		new HtmlWebpackPlugin({
			hash: true,
			template: "build/index.tpl.html",
			inject: "body",
			filename: "index.html"
		})
	],
	module: {
		loaders: [
			{
				enforce: 'pre',
				test: /\.vue$/,
				loader: 'vue-loader',
				exclude: /node_modules/
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				exclude: /node_modules/,
				loader: 'css-loader!sass-loader'
			}
		]
	},
	vue: {
		loaders: {
			scss: 'style-loader!css-loader!sass-loader'
		}
	}
};
