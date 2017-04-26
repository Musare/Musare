const webpack = require('webpack');

module.exports = {
	devtool: 'eval-source-map',
	entry: './main.js',
	output: {
		path: __dirname + '/build/',
		publicPath: '/',
		filename: 'bundle.js'
	},
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
