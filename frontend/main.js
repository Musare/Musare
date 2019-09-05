import Vue from "vue";

import VueRouter from "vue-router";
import store from "./store";

import App from "./App.vue";
import io from "./io";

const handleMetadata = attrs => {
	document.title = `Musare | ${attrs.title}`;
};

Vue.component("metadata", {
	watch: {
		$attrs: {
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

const router = new VueRouter({
	mode: "history",
	routes: [
		{
			path: "/",
			component: () => import("./components/pages/Home.vue")
		},
		{
			path: "*",
			component: () => import("./components/404.vue")
		},
		{
			path: "/404",
			component: () => import("./components/404.vue")
		},
		{
			path: "/terms",
			component: () => import("./components/pages/Terms.vue")
		},
		{
			path: "/privacy",
			component: () => import("./components/pages/Privacy.vue")
		},
		{
			path: "/team",
			component: () => import("./components/pages/Team.vue")
		},
		{
			path: "/news",
			component: () => import("./components/pages/News.vue")
		},
		{
			path: "/about",
			component: () => import("./components/pages/About.vue")
		},
		{
			name: "profile",
			path: "/u/:username",
			component: () => import("./components/User/Show.vue")
		},
		{
			path: "/settings",
			component: () => import("./components/User/Settings.vue"),
			meta: {
				loginRequired: true
			}
		},
		{
			path: "/reset_password",
			component: () => import("./components/User/ResetPassword.vue")
		},
		{
			path: "/login",
			component: () => import("./components/Modals/Login.vue")
		},
		{
			path: "/register",
			component: () => import("./components/Modals/Register.vue")
		},
		{
			path: "/admin",
			component: () => import("./components/pages/Admin.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			path: "/admin/:page",
			component: () => import("./components/pages/Admin.vue"),
			meta: {
				adminRequired: true
			}
		},
		{
			name: "station",
			path: "/:id",
			component: () => import("./components/Station/Station.vue")
		}
	]
});

lofig.folder = "../config/default.json";
lofig.get("serverDomain", res => {
	io.init(res);
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
			if (to.loginRequired && !store.state.user.auth.loggedIn)
				next({ path: "/login" });
			else if (to.adminRequired && store.state.user.auth.role !== "admin")
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
	} else if (to.name === "station") {
		io.getSocket(socket => {
			socket.emit("stations.findByName", to.params.id, res => {
				if (res.status === "success") {
					next();
				}
			});
		});
	} else next();
});

// eslint-disable-next-line no-new
new Vue({
	router,
	store,
	el: "#root",
	render: wrapper => wrapper(App)
});
