// webpack.config.js
module.exports = {
	// entry point of our application
	entry: './main.js',
	// where to place the compiled bundle
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
		// `loaders` is an array of loaders to use.
		loaders: [
			{
				test: /\.vue$/, // a regex for matching all files that end in `.vue`
				loader: 'vue'   // loader to use for matched files,
			},
			{
				test: /\.js$/,          // a regex for matching all files that end in `.js`
				loader: 'babel',        // loader to use for matched files,
				exclude: /node_modules/ // excludes the folder `node_modules`
			},
			{
				test: /\.scss$/,                 // a regex for matching all files that end in `.scss`
				loader: "css-loader!sass-loader" // loader to use for matched files,
			}
		]
	},
	babel: {
		presets: ['es2015'],
		plugins: ['transform-runtime']
	}
};
