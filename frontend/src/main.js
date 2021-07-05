/* eslint-disable vue/one-component-per-file */
import { createApp } from "vue";

import VueTippy, { Tippy } from "vue-tippy";
import { createRouter, createWebHistory } from "vue-router";

import ws from "@/ws";
import store from "./store";

import AppComponent from "./App.vue";

const REQUIRED_CONFIG_VERSION = 6;

const app = createApp(AppComponent);

app.use(store);

app.use(VueTippy, {
	directive: "tippy", // => v-tippy
	flipDuration: 0,
	popperOptions: {
		modifiers: {
			preventOverflow: {
				enabled: true
			}
		}
	},
	allowHTML: true,
	defaultProps: { animation: "scale", touch: "hold" }
});

app.component("Tippy", Tippy);

app.component("Metadata", {
	watch: {
		$attrs: {
			// eslint-disable-next-line vue/no-arrow-functions-in-watch
			deep: true,
			immediate: true
		}
	},
	render() {
		return null;
	}
});

app.directive("scroll", {
	mounted(el, binding) {
		const f = evt => {
			clearTimeout(window.scrollDebounceId);
			window.scrollDebounceId = setTimeout(() => {
				if (binding.value(evt, el)) {
					window.removeEventListener("scroll", f);
				}
			}, 200);
		};
		window.addEventListener("scroll", f);
	}
});

app.directive("focus", {
	mounted(el) {
		window.focusedElementBefore = document.activeElement;
		el.focus();
	}
});

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: "/",
			component: () => import("@/pages/Home.vue")
		},
		{
			path: "/404",
			alias: ["/:pathMatch(.*)*"],
			component: () => import("@/pages/404.vue")
		},
		{
			path: "/terms",
			component: () => import("@/pages/Terms.vue")
		},
		{
			path: "/privacy",
			component: () => import("@/pages/Privacy.vue")
		},
		{
			path: "/team",
			component: () => import("@/pages/Team.vue")
		},
		{
			path: "/news",
			component: () => import("@/pages/News.vue")
		},
		{
			path: "/about",
			component: () => import("@/pages/About.vue")
		},
		{
			name: "profile",
			path: "/u/:username",
			component: () => import("@/pages/Profile/index.vue")
		},
		{
			path: "/settings",
			component: () => import("@/pages/Settings/index.vue"),
			meta: {
				loginRequired: true
			}
		},
		{
			path: "/reset_password",
			component: () => import("@/pages/ResetPassword.vue")
		},
		{
			path: "/set_password",
			props: { mode: "set" },
			component: () => import("@/pages/ResetPassword.vue"),
			meta: {
				loginRequired: true
			}
		},
		{
			path: "/login",
			component: () => import("@/components/modals/Login.vue"),
			meta: {
				guestsOnly: true
			}
		},
		{
			path: "/register",
			component: () => import("@/components/modals/Register.vue"),
			meta: {
				guestsOnly: true
			}
		},
		{
			path: "/admin",
			component: () => import("@/pages/Admin/index.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			path: "/admin/:page",
			component: () => import("@/pages//Admin/index.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			name: "station",
			path: "/:id",
			component: () => import("@/pages//Station/index.vue")
		}
	]
});

app.use(router);

lofig.folder = "../config/default.json";

(async () => {
	lofig.fetchConfig().then(config => {
		const { configVersion, skipConfigVersionCheck } = config;
		if (
			configVersion !== REQUIRED_CONFIG_VERSION &&
			!skipConfigVersionCheck
		) {
			// eslint-disable-next-line no-alert
			alert(
				"CONFIG VERSION IS WRONG. PLEASE UPDATE YOUR CONFIG WITH THE HELP OF THE TEMPLATE FILE AND THE README FILE."
			);
			window.stop();
		}
	});

	const websocketsDomain = await lofig.get("websocketsDomain");
	ws.init(websocketsDomain);

	ws.socket.on("ready", res => {
		const { loggedIn, role, username, userId, email } = res.data;

		store.dispatch("user/auth/authData", {
			loggedIn,
			role,
			username,
			email,
			userId
		});
	});

	ws.socket.on("keep.event:user.banned", res =>
		store.dispatch("user/auth/banUser", res.data.ban)
	);

	ws.socket.on("event:user.username.updated", res =>
		store.dispatch("user/auth/updateUsername", res.data.username)
	);

	ws.socket.on("keep.event:user.preferences.updated", res => {
		const { preferences } = res.data;

		if (preferences.autoSkipDisliked !== undefined)
			store.dispatch(
				"user/preferences/changeAutoSkipDisliked",
				preferences.autoSkipDisliked
			);

		if (preferences.nightmode !== undefined) {
			localStorage.setItem("nightmode", preferences.nightmode);
			store.dispatch(
				"user/preferences/changeNightmode",
				preferences.nightmode
			);
		}

		if (preferences.activityLogPublic !== undefined)
			store.dispatch(
				"user/preferences/changeActivityLogPublic",
				preferences.activityLogPublic
			);

		if (preferences.anonymousSongRequests !== undefined)
			store.dispatch(
				"user/preferences/changeAnonymousSongRequests",
				preferences.anonymousSongRequests
			);

		if (preferences.activityWatch !== undefined)
			store.dispatch(
				"user/preferences/changeActivityWatch",
				preferences.activityWatch
			);
	});

	router.beforeEach((to, from, next) => {
		if (window.stationInterval) {
			clearInterval(window.stationInterval);
			window.stationInterval = 0;
		}

		if (ws.socket && to.fullPath !== from.fullPath) {
			ws.clearCallbacks();
			ws.destroyListeners();
		}

		if (
			to.meta.loginRequired ||
			to.meta.adminRequired ||
			to.meta.guestsOnly
		) {
			const gotData = () => {
				if (to.meta.loginRequired && !store.state.user.auth.loggedIn)
					next({ path: "/login" });
				else if (
					to.meta.adminRequired &&
					store.state.user.auth.role !== "admin"
				)
					next({ path: "/" });
				else if (to.meta.guestsOnly && store.state.user.auth.loggedIn)
					next({ path: "/" });
				else next();
			};

			if (store.state.user.auth.gotData) gotData();
			else {
				const watcher = store.watch(
					state => state.user.auth.gotData,
					() => {
						watcher();
						gotData();
					}
				);
			}
		} else next();
	});

	app.mount("#root");
})();
