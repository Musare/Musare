const webpack = require('webpack');

module.exports = {
	devtool: 'eval-source-map',
	entry: './main.js',
	output: {
		path: __dirname + '/build/',
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				enforce: "pre",
				test: /\.vue$/,
				loader: 'vue',
				exclude: /node_modules/
			},
			{
				test: /\.js$/,
				loader: 'babel',
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				loader: 'css-loader!sass-loader'
			}
		]
	},
	vue: {
		loaders: {
			sass: 'style!css!sass?indentedSyntax',
			scss: 'style!css!sass'
		}
	}
};
