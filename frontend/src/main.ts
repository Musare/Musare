/* eslint-disable vue/one-component-per-file */
import { createApp } from "vue";

import VueTippy, { Tippy } from "vue-tippy";
import { createRouter, createWebHistory } from "vue-router";
import Toast from "toasters";

import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useUserPreferencesStore } from "@/stores/userPreferences";
import { useModalsStore } from "@/stores/modals";
import { useWebsocketsStore } from "@/stores/websockets";
import ms from "@/ms";
import i18n from "@/i18n";

import AppComponent from "./App.vue";

import { pinia } from "./pinia";
import { useAuthStore } from "./stores/auth";
import { api } from "./feathers";

const handleMetadata = attrs => {
	const configStore = useConfigStore();
	document.title = `${configStore.sitename} | ${attrs.title}`;
};

const app = createApp(AppComponent);

app.use(i18n);

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

app.component("PageMetadata", {
	watch: {
		$attrs: {
			// eslint-disable-next-line vue/no-arrow-functions-in-watch
			handler: attrs => {
				handleMetadata(attrs);
			},
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
		const f = (evt: Event) => {
			clearTimeout(window.scrollDebounceId);
			window.scrollDebounceId = setTimeout(() => {
				if (binding.value(evt, el)) {
					document.body.removeEventListener("scroll", f);
				}
			}, 200);
		};
		document.body.addEventListener("scroll", f);
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
			name: "home",
			path: "/",
			component: () => import("@/pages/Home.vue")
		},
		{
			path: "/login",
			name: "login",
			redirect: "/"
		},
		{
			path: "/register",
			name: "register",
			redirect: "/"
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
			component: () => import("@/pages/ResetPassword.vue"),
			meta: {
				configRequired: "mailEnabled"
			}
		},
		{
			path: "/set_password",
			props: { mode: "set" },
			component: () => import("@/pages/ResetPassword.vue"),
			meta: {
				configRequired: "mailEnabled",
				loginRequired: true
			}
		},
		{
			path: "/admin",
			name: "admin",
			component: () => import("@/pages/Admin/index.vue"),
			children: [
				{
					path: "songs",
					component: () => import("@/pages/Admin/Songs/index.vue"),
					meta: { permissionRequired: "admin.view.songs" }
				},
				{
					path: "songs/import",
					component: () => import("@/pages/Admin/Songs/Import.vue"),
					meta: { permissionRequired: "admin.view.import" }
				},
				{
					path: "reports",
					component: () => import("@/pages/Admin/Reports.vue"),
					meta: { permissionRequired: "admin.view.reports" }
				},
				{
					path: "stations",
					component: () => import("@/pages/Admin/Stations.vue"),
					meta: { permissionRequired: "admin.view.stations" }
				},
				{
					path: "playlists",
					component: () => import("@/pages/Admin/Playlists.vue"),
					meta: { permissionRequired: "admin.view.playlists" }
				},
				{
					path: "users",
					component: () => import("@/pages/Admin/Users/index.vue"),
					meta: { permissionRequired: "admin.view.users" }
				},
				{
					path: "users/data-requests",
					component: () =>
						import("@/pages/Admin/Users/DataRequests.vue"),
					meta: { permissionRequired: "admin.view.dataRequests" }
				},
				{
					path: "users/punishments",
					component: () =>
						import("@/pages/Admin/Users/Punishments.vue"),
					meta: {
						permissionRequired: "admin.view.punishments"
					}
				},
				{
					path: "news",
					component: () => import("@/pages/Admin/News.vue"),
					meta: { permissionRequired: "admin.view.news" }
				},
				{
					path: "statistics",
					component: () => import("@/pages/Admin/Statistics.vue"),
					meta: {
						permissionRequired: "admin.view.statistics"
					}
				},
				{
					path: "youtube",
					component: () => import("@/pages/Admin/YouTube/index.vue"),
					meta: { permissionRequired: "admin.view.youtube" }
				},
				{
					path: "youtube/videos",
					component: () => import("@/pages/Admin/YouTube/Videos.vue"),
					meta: {
						permissionRequired: "admin.view.youtubeVideos"
					}
				},
				{
					path: "youtube/channels",
					component: () =>
						import("@/pages/Admin/YouTube/Channels.vue"),
					meta: {
						permissionRequired: "admin.view.youtubeChannels"
					}
				},
				{
					path: "soundcloud",
					component: () =>
						import("@/pages/Admin/SoundCloud/index.vue"),
					meta: { permissionRequired: "admin.view.soundcloud" }
				},
				{
					path: "soundcloud/tracks",
					component: () =>
						import("@/pages/Admin/SoundCloud/Tracks.vue"),
					meta: {
						permissionRequired: "admin.view.soundcloudTracks"
					}
				}
			],
			meta: {
				permissionRequired: "admin.view"
			}
		},
		{
			name: "station",
			path: "/:id",
			component: () => import("@/pages//Station/index.vue")
		}
	]
});

app.use(pinia);

// console.log(222, await api.service('users').create({
// 	username: 'test',
// 	email: 'test@test.com',
// 	password: 'password'
// }));

// const authStore = useAuthStore();
// authStore.authenticate({
// 	strategy: 'local',
// 	email: 'test@test.com',
// 	password: 'password'
// })
// authStore.authenticate()
// 	.then(async () => {
// 		const users = await api.service('users').find();

// 		console.log(333, users);
// 	});


const { createSocket } = useWebsocketsStore();
createSocket().then(async socket => {
	const configStore = useConfigStore();
	const userAuthStore = useUserAuthStore();
	const modalsStore = useModalsStore();

	router.beforeEach((to, from, next) => {
		if (window.stationInterval) {
			clearInterval(window.stationInterval);
			window.stationInterval = 0;
		}

		// if (to.name === "station") {
		// 	modalsStore.closeModal("manageStation");
		// }

		modalsStore.closeAllModals();

		if (socket.ready && to.fullPath !== from.fullPath) {
			socket.clearCallbacks();
			socket.destroyListeners();
		}

		if (to.query.toast) {
			const toast =
				typeof to.query.toast === "string"
					? { content: to.query.toast, timeout: 20000 }
					: { ...to.query.toast };
			new Toast(toast);
			const { query } = to;
			delete query.toast;
			next({ ...to, query });
		} else if (
			to.meta.configRequired ||
			to.meta.loginRequired ||
			to.meta.permissionRequired ||
			to.meta.guestsOnly
		) {
			const gotData = () => {
				if (
					to.meta.configRequired &&
					!configStore.get(`${to.meta.configRequired}`)
				)
					next({ path: "/" });
				else if (to.meta.loginRequired && !userAuthStore.loggedIn)
					next({ path: "/login" });
				else if (
					to.meta.permissionRequired &&
					!userAuthStore.hasPermission(
						`${to.meta.permissionRequired}`
					)
				) {
					if (
						to.path.startsWith("/admin") &&
						to.path !== "/admin/songs"
					)
						next({ path: "/admin/songs" });
					else next({ path: "/" });
				} else if (to.meta.guestsOnly && userAuthStore.loggedIn)
					next({ path: "/" });
				else next();
			};

			if (userAuthStore.gotData && userAuthStore.gotPermissions)
				gotData();
			else {
				const unsubscribe = userAuthStore.$onAction(
					({ name, after, onError }) => {
						if (
							name === "authData" ||
							name === "updatePermissions"
						) {
							after(() => {
								if (
									userAuthStore.gotData &&
									userAuthStore.gotPermissions
								)
									gotData();
								unsubscribe();
							});

							onError(() => {
								unsubscribe();
							});
						}
					}
				);
			}
		} else next();
	});

	app.use(router);

	socket.on("ready", res => {
		const { loggedIn, role, username, userId, email } = res.user;

		userAuthStore.authData({
			loggedIn,
			role,
			username,
			email,
			userId
		});

		if (loggedIn) {
			userAuthStore.resetCookieExpiration();
		}

		if (configStore.experimental.media_session) ms.initialize();
		else ms.uninitialize();
	});

	socket.on("keep.event:user.banned", res =>
		userAuthStore.banUser(res.data.ban)
	);

	socket.on("keep.event:user.username.updated", res =>
		userAuthStore.updateUsername(res.data.username)
	);

	socket.on("keep.event:user.preferences.updated", res => {
		const { preferences } = res.data;

		const {
			changeAutoSkipDisliked,
			changeNightmode,
			changeActivityLogPublic,
			changeAnonymousSongRequests,
			changeActivityWatch
		} = useUserPreferencesStore();

		if (preferences.autoSkipDisliked !== undefined)
			changeAutoSkipDisliked(preferences.autoSkipDisliked);

		if (preferences.nightmode !== undefined) {
			changeNightmode(preferences.nightmode);
		}

		if (preferences.activityLogPublic !== undefined)
			changeActivityLogPublic(preferences.activityLogPublic);

		if (preferences.anonymousSongRequests !== undefined)
			changeAnonymousSongRequests(preferences.anonymousSongRequests);

		if (preferences.activityWatch !== undefined)
			changeActivityWatch(preferences.activityWatch);
	});

	socket.on("keep.event:user.role.updated", res => {
		userAuthStore.updateRole(res.data.role);
		userAuthStore.updatePermissions().then(() => {
			const { meta } = router.currentRoute.value;
			if (
				meta &&
				meta.permissionRequired &&
				!userAuthStore.hasPermission(`${meta.permissionRequired}`)
			)
				router.push({
					path: "/",
					query: {
						toast: "You no longer have access to the page you were viewing."
					}
				});
		});
	});

	app.mount("#root");
});
