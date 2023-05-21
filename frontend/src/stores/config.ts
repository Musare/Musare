import { defineStore } from "pinia";

export const useConfigStore = defineStore("config", {
	state: (): {
		cookie: string;
		sitename: string;
		recaptcha: {
			enabled: boolean;
			key: string;
		};
		githubAuthentication: boolean;
		messages: Record<string, string>;
		christmas: boolean;
		footerLinks: Record<string, string | boolean>;
		shortcutOverrides: Record<string, any>;
		registrationDisabled: boolean;
		mailEnabled: boolean;
		discogsEnabled: boolean;
		experimental: {
			changable_listen_mode: string[] | boolean;
			media_session: boolean;
			disable_youtube_search: boolean;
			station_history: boolean;
			soundcloud: boolean;
			spotify: boolean;
		};
	} => ({
		cookie: "musareSID",
		sitename: MUSARE_SITENAME,
		recaptcha: {
			enabled: false,
			key: ""
		},
		githubAuthentication: false,
		messages: {
			accountRemoval:
				"Your account will be deactivated instantly and your data will shortly be deleted by an admin."
		},
		christmas: false,
		footerLinks: {},
		shortcutOverrides: {},
		registrationDisabled: false,
		mailEnabled: true,
		discogsEnabled: true,
		experimental: {
			changable_listen_mode: [],
			media_session: false,
			disable_youtube_search: false,
			station_history: false,
			soundcloud: false,
			spotify: false
		}
	}),
	actions: {
		get(query: string) {
			let config = JSON.parse(JSON.stringify(this.$state));
			query.split(".").forEach(property => {
				config = config[property];
			});
			return config;
		}
	},
	getters: {
		urls() {
			const { protocol, host } = document.location;
			const secure = protocol !== "http:";
			const client = `${protocol}//${host}`;
			const api = `${client}/backend`;
			const ws = `${secure ? "wss" : "ws"}://${host}/backend/ws`;
			return { client, api, ws, host, secure };
		}
	}
});
