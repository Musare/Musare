import path from "path";
import vue from "@vitejs/plugin-vue";
import dynamicImport from "vite-plugin-dynamic-import";
import config from "config";
import fs from "fs";

const fetchVersionAndGitInfo = () => {
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

		console.log(`Musare version: ${packageJson.version}.`);
		if (config.has("debug.version") && config.get("debug.version"))
			debug.version = packageJson.version;
	} catch (e) {
		console.log(`Could not get package info: ${e.message}.`);
	}

	try {
		let gitFolder = null;
		if (fs.existsSync(".parent_git/HEAD")) gitFolder = ".parent_git";
		else if (fs.existsSync("../.git/HEAD")) gitFolder = "../.git";

		if (gitFolder) {
			const headContents = fs
				.readFileSync(`${gitFolder}/HEAD`)
				.toString()
				.replace(/\n/g, "");
			const branch = /ref: refs\/heads\/([.A-Za-z0-9_-]+)/.exec(
				headContents
			)[1];

			const configContents = fs
				.readFileSync(`${gitFolder}/config`)
				.toString()
				.replace(/\t/g, "")
				.split("\n");

			let remote;
			let remoteUrl;
			let latestCommit;
			let latestCommitShort;

			if (configContents.indexOf(`[branch "${branch}"]`) >= 0) {
				remote = /remote = (.+)/.exec(
					configContents[
						configContents.indexOf(`[branch "${branch}"]`) + 1
					]
				)[1];

				remoteUrl = /url = (.+)/.exec(
					configContents[
						configContents.indexOf(`[remote "${remote}"]`) + 1
					]
				)[1];

				latestCommit = fs
					.readFileSync(`${gitFolder}/refs/heads/${branch}`)
					.toString()
					.replace(/\n/g, "");

				latestCommitShort = latestCommit.substr(0, 7);
			}

			console.log(
				`Git branch: ${remote}/${branch}. Remote url: ${remoteUrl}. Latest commit: ${latestCommit} (${latestCommitShort}).`
			);
			if (config.get("debug.git.remote")) debug.git.remote = remote;
			if (config.get("debug.git.remoteUrl"))
				debug.git.remoteUrl = remoteUrl;
			if (config.get("debug.git.branch")) debug.git.branch = branch;
			if (config.get("debug.git.latestCommit"))
				debug.git.latestCommit = latestCommit;
			if (config.get("debug.git.latestCommitShort"))
				debug.git.latestCommitShort = latestCommitShort;
		}
	} catch (e) {
		console.log(`Could not get Git info: ${e.message}.`, e);
	}

	return debug;
};

const debug = fetchVersionAndGitInfo();

const siteName = config.has("siteSettings.sitename")
	? config.get("siteSettings.sitename")
	: "Musare";

const htmlPlugin = () => ({
	name: "html-transform",
	transformIndexHtml(originalHtml) {
		let html = originalHtml;

		html = html.replace(/{{ title }}/g, siteName);
		html = html.replace(/{{ version }}/g, debug.version);
		html = html.replace(/{{ gitRemote }}/g, debug.git.remote);
		html = html.replace(/{{ gitRemoteUrl }}/g, debug.git.remoteUrl);
		html = html.replace(/{{ gitBranch }}/g, debug.git.branch);
		html = html.replace(/{{ gitLatestCommit }}/g, debug.git.latestCommit);
		html = html.replace(
			/{{ gitLatestCommitShort }}/g,
			debug.git.latestCommitShort
		);

		return html;
	}
});

const mode = process.env.FRONTEND_MODE || "development";

let server = null;

if (mode === "development")
	server = {
		host: "0.0.0.0",
		port: config.has("devServer.port") ? config.get("devServer.port") : 81,
		strictPort: true,
		hmr: {
			clientPort: config.has("devServer.hmrClientPort")
				? config.get("devServer.hmrClientPort")
				: 80
		}
	};

export default {
	mode,
	root: "src",
	publicDir: "../dist",
	base: "/",
	resolve: {
		alias: [
			{
				find: "@",
				replacement: path.resolve(__dirname, "src")
			}
		]
	},
	define: {
		__VUE_OPTIONS_API__: true,
		__VUE_PROD_DEVTOOLS__: false,
		MUSARE_VERSION: JSON.stringify(debug.version),
		MUSARE_GIT_REMOTE: JSON.stringify(debug.git.remote),
		MUSARE_GIT_REMOTE_URL: JSON.stringify(debug.git.remoteUrl),
		MUSARE_GIT_BRANCH: JSON.stringify(debug.git.branch),
		MUSARE_GIT_LATEST_COMMIT: JSON.stringify(debug.git.latestCommit),
		MUSARE_GIT_LATEST_COMMIT_SHORT: JSON.stringify(
			debug.git.latestCommitShort
		)
	},
	plugins: [vue(), htmlPlugin(), dynamicImport()],
	css: {
		preprocessorOptions: {
			less: {
				additionalData: `@import "@/styles/variables.less";`
			}
		}
	},
	server,
	build: {
		outDir: "../build"
	}
};
