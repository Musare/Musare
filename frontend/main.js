import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import auth from './auth';

import NotFound from './components/404.vue';
import Home from './components/pages/Home.vue';
import Station from './components/Station/Station.vue';
import Admin from './components/pages/Admin.vue';
import News from './components/pages/News.vue';
import User from './components/User/Show.vue';
import Settings from './components/User/Settings.vue';
import Login from './components/Modals/Login.vue';

Vue.use(VueRouter);

let router = new VueRouter({ history: true });
let _this = this;

lofig.folder = '../config/default.json';
lofig.get('serverDomain', function(res) {
	let socket = window.socket = io(res);
	socket.on("ready", (status, role, username) => {
		auth.data(status, role, username);
	});
});

router.beforeEach(transition => {
	if (window.stationInterval) {
		clearInterval(window.stationInterval);
		window.stationInterval = 0;
	}
	if (window.socket) {
		window.socket.removeAllListeners();
	}
	if (transition.to.loginRequired || transition.to.adminRequired) {
		auth.getStatus((authenticated, role) => {
			if (transition.to.loginRequired && !authenticated) transition.redirect('/login');
			else if (transition.to.adminRequired && role !== 'admin') transition.redirect('/');
			else transition.next();
		});
	} else {
		transition.next();
	}
});

router.map({
	'/': {
		component: Home
	},
	'*': {
		component: NotFound
	},
	'/news': {
		component: News
	},
	'/u/:username': {
		component: User
	},
	'/settings': {
		component: Settings,
		loginRequired: true
	},
	'/login': {
		component: Login
	},
	'/admin': {
		component: Admin,
		adminRequired: true
	},
	'/official/:id': {
		component: Station
	},
	'/community/:id': {
		component: Station
	}
});

router.start(App, 'body');
