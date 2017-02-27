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
				enforce: 'pre',
				test: /\.vue$/,
				loader: 'vue-loader',
				exclude: /node_modules/,
				options: {
					loaders: {
						sass: 'style-loader!css-loader!sass-loader?indentedSyntax',
						scss: 'style-loader!css-loader!sass-loader'
					}
				}
			},
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/
			},
			{
				test: /\.scss$/,
				loader: 'css-loader!sass-loader'
			}
		]
	}
};
