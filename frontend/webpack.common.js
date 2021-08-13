process.env.NODE_CONFIG_DIR = `${__dirname}/dist/config/`;
const config = require("config");

const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
	entry: "./src/main.js",
	output: {
		path: `${__dirname}/dist/build/`,
		filename: "[name].[contenthash].js"
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/")
		},
		extensions: [".js", ".vue"]
	},
	plugins: [
		new VueLoaderPlugin(),
		new HtmlWebpackPlugin({
			title: config.get("siteSettings.sitename"),
			hash: true,
			template: "dist/index.tpl.html",
			inject: "body",
			filename: "index.html"
		}),
		new ESLintPlugin()
	],
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: "vue-loader",
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
				use: [
					"vue-style-loader",
					{
						loader: "css-loader",
						options: {
							url: false
						}
					},
					"sass-loader"
				]
			}
		]
	}
};
