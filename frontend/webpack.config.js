const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const WebpackMd5Hash = require('webpack-md5-hash');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	mode: 'none',
	devtool: 'eval-source-map',
	entry: './main.js',
	output: {
		path: __dirname + '/build/',
		publicPath: '/',
		filename: '[name].[chunkhash].js'
	},
	plugins: [
		new VueLoaderPlugin(),
		new WebpackMd5Hash(),
		new HtmlWebpackPlugin({
			hash: true,
			template: "build/index.tpl.html",
			inject: "body",
			filename: "index.html"
		})
	],
	module: {
		rules: [
			{
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
				use: [
					'vue-style-loader',
					'css-loader',
					'sass-loader'
				]
			}
		]
	},
	resolve: {
		alias: {
			vue: 'vue/dist/vue.js'
		}
	}
};
