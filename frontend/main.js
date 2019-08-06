import Vue from "vue";

import VueRouter from "vue-router";
import store from "./store";

import App from "./App.vue";
import auth from "./auth";
import io from "./io";

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
			loginRequired: true
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
			adminRequired: true
		},
		{
			path: "/admin/:page",
			component: () => import("./components/pages/Admin.vue"),
			adminRequired: true
		},
		{
			name: "official",
			path: "/official/:id",
			alias: "/:id",
			component: () => import("./components/Station/Station.vue"),
			officialRequired: true
		},
		{
			name: "community",
			path: "/community/:id",
			component: () => import("./components/Station/Station.vue"),
			communityRequired: true
		}
	]
});

lofig.folder = "../config/default.json";
lofig.get("serverDomain", res => {
	io.init(res);
	io.getSocket(socket => {
		socket.on("ready", (status, role, username, userId) => {
			auth.data(status, role, username, userId);
		});
		socket.on("keep.event:banned", ban => {
			auth.setBanned(ban);
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
	if (to.loginRequired || to.adminRequired) {
		auth.getStatus((authenticated, role) => {
			if (to.loginRequired && !authenticated) next({ path: "/login" });
			else if (to.adminRequired && role !== "admin") next({ path: "/" });
			else next();
		});
	} else next();

	if (from.name === "community" || from.name === "official") {
		document.title = "Musare";
	}

	if (to.officialRequired) {
		io.getSocket(socket => {
			socket.emit("stations.findByName", to.params.id, res => {
				if (res.status === "success") {
					if (res.data.type === "community")
						next({ path: `/community/${to.params.id}` });
					else next();
				}
			});
		});
	}

	if (to.communityRequired) {
		io.getSocket(socket => {
			socket.emit("stations.findByName", to.params.id, res => {
				if (res.status === "success") {
					if (res.data.type === "official")
						next({ path: `/official/${to.params.id}` });
					else next();
				}
			});
		});
	}
});

router.afterEach(to => {
	ga("set", "page", to.path);
	ga("send", "pageview");
});

// eslint-disable-next-line no-new
new Vue({
	router,
	store,
	el: "#root",
	render: wrapper => wrapper(App)
});
