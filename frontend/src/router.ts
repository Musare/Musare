import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useModalsStore } from "./stores/modals";
import Toast from "toasters";
import { useConfigStore } from "./stores/config";
import { useCaslStore } from "./stores/casl";

export const router = createRouter({
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
					meta: { permissionRequired: "admin.songs" }
				},
				{
					path: "songs/import",
					component: () => import("@/pages/Admin/Songs/Import.vue"),
					meta: { permissionRequired: "admin.import" }
				},
				{
					path: "reports",
					component: () => import("@/pages/Admin/Reports.vue"),
					meta: { permissionRequired: "admin.reports" }
				},
				{
					path: "stations",
					component: () => import("@/pages/Admin/Stations.vue"),
					meta: { permissionRequired: "admin.stations" }
				},
				{
					path: "playlists",
					component: () => import("@/pages/Admin/Playlists.vue"),
					meta: { permissionRequired: "admin.playlists" }
				},
				{
					path: "users",
					component: () => import("@/pages/Admin/Users/index.vue"),
					meta: { permissionRequired: "admin.users" }
				},
				{
					path: "users/data-requests",
					component: () =>
						import("@/pages/Admin/Users/DataRequests.vue"),
					meta: { permissionRequired: "admin.dataRequests" }
				},
				{
					path: "users/punishments",
					component: () =>
						import("@/pages/Admin/Users/Punishments.vue"),
					meta: {
						permissionRequired: "admin.punishments"
					}
				},
				{
					path: "news",
					component: () => import("@/pages/Admin/News.vue"),
					meta: { permissionRequired: "admin.news" }
				},
				{
					path: "statistics",
					component: () => import("@/pages/Admin/Statistics.vue"),
					meta: {
						permissionRequired: "admin.statistics"
					}
				},
				{
					path: "youtube",
					component: () => import("@/pages/Admin/YouTube/index.vue"),
					meta: { permissionRequired: "admin.youtube" }
				},
				{
					path: "youtube/videos",
					component: () => import("@/pages/Admin/YouTube/Videos.vue"),
					meta: {
						permissionRequired: "admin.youtubeVideos"
					}
				},
				{
					path: "youtube/channels",
					component: () =>
						import("@/pages/Admin/YouTube/Channels.vue"),
					meta: {
						permissionRequired: "admin.youtubeChannels"
					}
				},
				{
					path: "soundcloud",
					component: () =>
						import("@/pages/Admin/SoundCloud/index.vue"),
					meta: { permissionRequired: "admin.soundcloud" }
				},
				{
					path: "soundcloud/tracks",
					component: () =>
						import("@/pages/Admin/SoundCloud/Tracks.vue"),
					meta: {
						permissionRequired: "admin.soundcloudTracks"
					}
				}
			],
			meta: {
				permissionRequired: "admin"
			}
		},
		{
			name: "station",
			path: "/:id",
			component: () => import("@/pages//Station/index.vue")
		}
	]
});

router.beforeEach(async (to, from) => {
	if (window.stationInterval) {
		clearInterval(window.stationInterval);
		window.stationInterval = 0;
	}

// 		if (socket.ready && to.fullPath !== from.fullPath) {
// 			socket.clearCallbacks();
// 			socket.destroyListeners();
// 		}

	const modalsStore = useModalsStore();

	modalsStore.closeAllModals();

	if (to.query.toast) {
		const toast = typeof to.query.toast === "string"
			? { content: to.query.toast, timeout: 20000 }
			: { ...to.query.toast };
		new Toast(toast);

		const { query } = to;
		delete query.toast;

		return { ...to, query };
	}

	if (
		!(
			to.meta.configRequired ||
			to.meta.loginRequired ||
			to.meta.permissionRequired ||
			to.meta.guestsOnly
		)
	)
		return true;

	const authStore = useAuthStore();
	const caslStore = useCaslStore();
	const configStore = useConfigStore();

	await authStore.getPromise();

	if (
		to.meta.configRequired &&
		!configStore.get(`${to.meta.configRequired}`)
	)
		return { path: "/" };

	if (to.meta.loginRequired && !authStore.isAuthenticated) {
		authStore.loginRedirect = to;

		return { path: '/login' };
	}

	if (
		to.meta.permissionRequired &&
		caslStore.ability.cannot("view", to.meta.permissionRequired)
	) {
		if (
			to.path.startsWith("/admin") &&
			to.path !== "/admin/songs"
		)
			return { path: '/admin/songs' };

		return { path: '/' };
	}

	if (to.meta.guestsOnly && authStore.isAuthenticated)
		return { path: '/' };

	return true;
});
