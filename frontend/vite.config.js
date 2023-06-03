import path from "path";
import vue from "@vitejs/plugin-vue";
import dynamicImport from "vite-plugin-dynamic-import";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
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
		if (process.env.MUSARE_DEBUG_VERSION === "true")
			debug.version = packageJson.version;
	} catch (e) {
		console.log(`Could not get package info: ${e.message}.`);
	}

	try {
		let gitFolder = null;
		if (fs.existsSync("../.git/HEAD")) gitFolder = "../.git";
		else if (fs.existsSync(".git/HEAD")) gitFolder = ".git";

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
				[, remote] = /remote = (.+)/.exec(
					configContents[
						configContents.indexOf(`[branch "${branch}"]`) + 1
					]
				);

				[, remoteUrl] = /url = (.+)/.exec(
					configContents[
						configContents.indexOf(`[remote "${remote}"]`) + 1
					]
				);

				latestCommit = fs
					.readFileSync(`${gitFolder}/refs/heads/${branch}`)
					.toString()
					.replace(/\n/g, "");

				latestCommitShort = latestCommit.substr(0, 7);
			}

			console.log(
				`Git branch: ${remote}/${branch}. Remote url: ${remoteUrl}. Latest commit: ${latestCommit} (${latestCommitShort}).`
			);
			if (process.env.MUSARE_DEBUG_GIT_REMOTE === "true")
				debug.git.remote = remote;
			if (process.env.MUSARE_DEBUG_GIT_REMOTE_URL === "true")
				debug.git.remoteUrl = remoteUrl;
			if (process.env.MUSARE_DEBUG_GIT_BRANCH === "true")
				debug.git.branch = branch;
			if (process.env.MUSARE_DEBUG_GIT_LATEST_COMMIT === "true")
				debug.git.latestCommit = latestCommit;
			if (process.env.MUSARE_DEBUG_GIT_LATEST_COMMIT_SHORT === "true")
				debug.git.latestCommitShort = latestCommitShort;
		} else console.log("Could not find .git folder.");
	} catch (e) {
		console.log(`Could not get Git info: ${e.message}.`, e);
	}

	return debug;
};

const debug = fetchVersionAndGitInfo();

const htmlPlugin = () => ({
	name: "html-transform",
	transformIndexHtml(originalHtml) {
		let html = originalHtml;

		html = html.replace(
			/{{ title }}/g,
			process.env.MUSARE_SITENAME ?? "Musare"
		);
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

let server = null;

if (process.env.FRONTEND_MODE === "development")
	server = {
		host: "0.0.0.0",
		port: process.env.FRONTEND_DEV_PORT ?? 81,
		strictPort: true,
		hmr: {
			clientPort: process.env.FRONTEND_CLIENT_PORT ?? 80
		}
	};

export default {
	mode: process.env.FRONTEND_MODE,
	root: "src",
	publicDir: "../dist",
	base: "/",
	resolve: {
		alias: [
			{
				find: "@musare_types",
				replacement: path.resolve(__dirname, "../types")
			},
			{
				find: "@",
				replacement: path.resolve(__dirname, "src")
			}
		],
		extensions: [
			".mjs",
			".js",
			".mts",
			".ts",
			".jsx",
			".tsx",
			".json",
			".vue"
		]
	},
	define: {
		__VUE_PROD_DEVTOOLS__: process.env.FRONTEND_PROD_DEVTOOLS === "true",
		MUSARE_SITENAME: JSON.stringify(
			process.env.MUSARE_SITENAME ?? "Musare"
		),
		MUSARE_PRIMARY_COLOR: JSON.stringify(
			process.env.MUSARE_PRIMARY_COLOR ?? "#03a9f4"
		),
		MUSARE_VERSION: JSON.stringify(debug.version),
		MUSARE_GIT_REMOTE: JSON.stringify(debug.git.remote),
		MUSARE_GIT_REMOTE_URL: JSON.stringify(debug.git.remoteUrl),
		MUSARE_GIT_BRANCH: JSON.stringify(debug.git.branch),
		MUSARE_GIT_LATEST_COMMIT: JSON.stringify(debug.git.latestCommit),
		MUSARE_GIT_LATEST_COMMIT_SHORT: JSON.stringify(
			debug.git.latestCommitShort
		),
		__VUE_I18N_LEGACY_API__: false
	},
	plugins: [
		vue(),
		htmlPlugin(),
		dynamicImport(),
		VueI18nPlugin({ include: path.resolve(__dirname, "src/locales/**") })
	],
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
	},
	test: {
		globals: true,
		environment: "jsdom",
		coverage: {
			all: true,
			extension: [".ts", ".vue"]
		},
		setupFiles: "tests/utils/setup.ts"
	}
};
