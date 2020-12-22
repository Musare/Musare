import Vue from "vue";

import VueRouter from "vue-router";
import store from "./store";

import App from "./App.vue";
import io from "./io";

const handleMetadata = attrs => {
	document.title = `Musare | ${attrs.title}`;
};

Vue.component("Metadata", {
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

Vue.use(VueRouter);

Vue.directive("scroll", {
	inserted(el, binding) {
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

Vue.directive("focus", {
	inserted(el) {
		el.focus();
	}
});

const router = new VueRouter({
	mode: "history",
	routes: [
		{
			path: "/",
			component: () => import("./pages/Home/index.vue")
		},
		{
			path: "*",
			component: () => import("./pages/404.vue")
		},
		{
			path: "/404",
			component: () => import("./pages/404.vue")
		},
		{
			path: "/terms",
			component: () => import("./pages/Terms.vue")
		},
		{
			path: "/privacy",
			component: () => import("./pages/Privacy.vue")
		},
		{
			path: "/team",
			component: () => import("./pages/Team.vue")
		},
		{
			path: "/news",
			component: () => import("./pages/News.vue")
		},
		{
			path: "/about",
			component: () => import("./pages/About.vue")
		},
		{
			name: "profile",
			path: "/u/:username",
			component: () => import("./pages/Profile.vue")
		},
		{
			path: "/settings",
			component: () => import("./pages/Settings/index.vue"),
			meta: {
				loginRequired: true
			}
		},
		{
			path: "/reset_password",
			component: () => import("./pages/ResetPassword.vue")
		},
		{
			path: "/set_password",
			props: { mode: "set" },
			component: () => import("./pages/ResetPassword.vue"),
			meta: {
				loginRequired: true
			}
		},
		{
			path: "/login",
			component: () => import("./components/modals/Login.vue")
		},
		{
			path: "/register",
			component: () => import("./components/modals/Register.vue")
		},
		{
			path: "/admin",
			component: () => import("./pages/Admin/index.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			path: "/admin/:page",
			component: () => import("./pages/Admin/index.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			name: "station",
			path: "/:id",
			component: () => import("./pages/Station/index.vue")
		}
	]
});

lofig.folder = "../config/default.json";
lofig.get("serverDomain").then(serverDomain => {
	io.init(serverDomain);
	io.getSocket(socket => {
		socket.on("ready", (loggedIn, role, username, userId) => {
			store.dispatch("user/auth/authData", {
				loggedIn,
				role,
				username,
				userId
			});
		});

		socket.on("keep.event:banned", ban => {
			store.dispatch("user/auth/banUser", ban);
		});

		socket.on("event:user.username.changed", username => {
			store.dispatch("user/auth/updateUsername", username);
		});
	});
});

router.beforeEach((to, from, next) => {
	if (window.stationInterval) {
		clearInterval(window.stationInterval);
		window.stationInterval = 0;
	}

	if (window.socket) io.removeAllListeners();

	io.clear();

	if (to.meta.loginRequired || to.meta.adminRequired) {
		const gotData = () => {
			if (to.meta.loginRequired && !store.state.user.auth.loggedIn)
				next({ path: "/login" });
			else if (
				to.meta.adminRequired &&
				store.state.user.auth.role !== "admin"
			)
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

// eslint-disable-next-line no-new
new Vue({
	router,
	store,
	el: "#root",
	render: wrapper => wrapper(App)
});
