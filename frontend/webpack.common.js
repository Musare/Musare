process.env.NODE_CONFIG_DIR = `${__dirname}/dist/config/`;
const path = require("path");
const fs = require("fs");
const config = require("config");
const { VueLoaderPlugin } = require("vue-loader");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const { DefinePlugin } = require("webpack");

const fetchVersionAndGitInfo = cb => {
	const debug = {
		git: {
			remote: "",
			remoteUrl: "",
			branch: "",
			latestCommit: "",
			latestCommitShort: ""
		},
		version: ""
	};

	try {
		const packageJson = JSON.parse(
			fs.readFileSync("./package.json").toString()
		);
		const headContents = fs
			.readFileSync(".parent_git/HEAD")
			.toString()
			.replace(/\n/g, "");
		const branch = new RegExp("ref: refs/heads/([.A-Za-z0-9_-]+)").exec(
			headContents
		)[1];
		const configContents = fs
			.readFileSync(".parent_git/config")
			.toString()
			.replace(/\t/g, "")
			.split("\n");
		const remote = new RegExp("remote = (.+)").exec(
			configContents[configContents.indexOf(`[branch "${branch}"]`) + 1]
		)[1];
		const remoteUrl = new RegExp("url = (.+)").exec(
			configContents[configContents.indexOf(`[remote "${remote}"]`) + 1]
		)[1];
		const latestCommit = fs
			.readFileSync(`.parent_git/refs/heads/${branch}`)
			.toString()
			.replace(/\n/g, "");
		const latestCommitShort = latestCommit.substr(0, 7);

		console.log(`Musare version: ${packageJson.version}.`);
		console.log(
			`Git branch: ${remote}/${branch}. Remote url: ${remoteUrl}. Latest commit: ${latestCommit} (${latestCommitShort}).`
		);

		if (config.get("debug.version")) debug.version = packageJson.version;
		if (config.get("debug.git.remote")) debug.git.remote = remote;
		if (config.get("debug.git.remoteUrl")) debug.git.remoteUrl = remoteUrl;
		if (config.get("debug.git.branch")) debug.git.branch = branch;
		if (config.get("debug.git.latestCommit"))
			debug.git.latestCommit = latestCommit;
		if (config.get("debug.git.latestCommitShort"))
			debug.git.latestCommitShort = latestCommitShort;
	} catch (e) {
		console.log(`Could not get Git info: ${e.message}.`);
	}

	cb(debug);
};

fetchVersionAndGitInfo(() => {});

class InsertDebugInfoPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("InsertDebugInfoPlugin", compilation => {
			HtmlWebpackPlugin.getHooks(
				compilation
			).beforeAssetTagGeneration.tapAsync(
				"InsertDebugInfoPlugin",
				(data, cb) => {
					fetchVersionAndGitInfo(debug => {
						data.plugin.userOptions.debug.version = debug.version;
						data.plugin.userOptions.debug.git.remote =
							debug.git.remote;
						data.plugin.userOptions.debug.git.remoteUrl =
							debug.git.remoteUrl;
						data.plugin.userOptions.debug.git.branch =
							debug.git.branch;
						data.plugin.userOptions.debug.git.latestCommit =
							debug.git.latestCommit;
						data.plugin.userOptions.debug.git.latestCommitShort =
							debug.git.latestCommitShort;
						cb(null, data);
					});
				}
			);
		});
	}
}

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
			filename: "index.html",
			debug: {
				git: {
					remote: "",
					remoteUrl: "",
					branch: "",
					latestCommit: "",
					latestCommitShort: ""
				},
				version: ""
			}
		}),
		new ESLintPlugin(),
		new InsertDebugInfoPlugin(),
		new DefinePlugin({
			__VUE_OPTIONS_API__: true,
			__VUE_PROD_DEVTOOLS__: false
		})
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
				test: /\.css$/,
				use: [
				  'style-loader',
				  'css-loader'
				]
			},
			{
				test: /\.less$/i,
				exclude: /node_modules/,
				use: [
					"vue-style-loader",
					{
						loader: "css-loader",
						options: {
							url: false
						}
					},
					"less-loader",
					{
						loader: "style-resources-loader",
						options: {
							patterns: [
								path.resolve(
									__dirname,
									"./src/styles/variables.less"
								)
							]
						}
					}
				]
			}
		]
	}
};
