// webpack.config.js
module.exports = {
	entry: './main.js',
	output: {
		path: __dirname + '/build/',
		filename: 'bundle.js'
	},
	module: {
		preLoaders: [
			{
				test: /\.vue$/,
				loader: 'eslint',
				exclude: /node_modules/
			}
		],
		loaders: [
			{
				test: /\.vue$/,
				loader: 'vue'
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
	},
	babel: {
		presets: ['es2015'],
		plugins: ['transform-runtime'],
		comments: false
	}
};
