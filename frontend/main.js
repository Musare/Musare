import Vue from "vue";

import store from "./store";

import VueRouter from "vue-router";

import App from "./App.vue";
import auth from "./auth";
import io from "./io";

Vue.use(VueRouter);

let router = new VueRouter({
	mode: "history",
	routes: [
		{
			path: "/",
			component: () =>
				import(/* webpackChunkName: "home" */ "./components/pages/Home.vue")
		},
		{
			path: "*",
			component: () =>
				import(/* webpackChunkName: "404" */ "./components/404.vue")
		},
		{
			path: "/404",
			component: () =>
				import(/* webpackChunkName: "404" */ "./components/404.vue")
		},
		{
			path: "/terms",
			component: () =>
				import(/* webpackChunkName: "terms" */ "./components/pages/Terms.vue")
		},
		{
			path: "/privacy",
			component: () =>
				import(
					/* webpackChunkName: "privacy" */ "./components/pages/Privacy.vue"
				)
		},
		{
			path: "/team",
			component: () =>
				import(/* webpackChunkName: "team" */ "./components/pages/Team.vue")
		},
		{
			path: "/news",
			component: () =>
				import(/* webpackChunkName: "news" */ "./components/pages/News.vue")
		},
		{
			path: "/about",
			component: () =>
				import(/* webpackChunkName: "about" */ "./components/pages/About.vue")
		},
		{
			name: "profile",
			path: "/u/:username",
			component: () =>
				import(/* webpackChunkName: "profile" */ "./components/User/Show.vue")
		},
		{
			path: "/settings",
			component: () =>
				import(
					/* webpackChunkName: "settings" */ "./components/User/Settings.vue"
				),
			loginRequired: true
		},
		{
			path: "/reset_password",
			component: () =>
				import(
					/* webpackChunkName: "reset_password" */ "./components/User/ResetPassword.vue"
				)
		},
		{
			path: "/login",
			component: () =>
				import(/* webpackChunkName: "login" */ "./components/Modals/Login.vue")
		},
		{
			path: "/register",
			component: () =>
				import(
					/* webpackChunkName: "register" */ "./components/Modals/Register.vue"
				)
		},
		{
			path: "/admin",
			component: () =>
				import(/* webpackChunkName: "admin" */ "./components/pages/Admin.vue"),
			adminRequired: true
		},
		{
			path: "/admin/:page",
			component: () =>
				import(/* webpackChunkName: "admin" */ "./components/pages/Admin.vue"),
			adminRequired: true
		},
		{
			name: "official",
			path: "/official/:id",
			alias: "/:id",
			component: () =>
				import(
					/* webpackChunkName: "officialStation" */ "./components/Station/Station.vue"
				),
			officialRequired: true
		},
		{
			name: "community",
			path: "/community/:id",
			component: () =>
				import(
					/* webpackChunkName: "communityStation" */ "./components/Station/Station.vue"
				),
			communityRequired: true
		}
	]
});

let _this = this;

lofig.folder = "../config/default.json";
lofig.get("serverDomain", function(res) {
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
	window.location.hash = "";

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

new Vue({
	router,
	store,
	el: "#root",
	render: wrapper => wrapper(App)
});
