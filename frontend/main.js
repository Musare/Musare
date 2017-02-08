import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import auth from './auth';
import io from './io';

import NotFound from './components/404.vue';
import Home from './components/pages/Home.vue';
import Station from './components/Station/Station.vue';

import Admin from './components/pages/Admin.vue';
import AdminNews from './components/Admin/News.vue';
import AdminUsers from './components/Admin/Users.vue';
import AdminReports from './components/Admin/Reports.vue';
import AdminStations from './components/Admin/Stations.vue';
import AdminSongs from './components/Admin/Songs.vue';
import AdminQueueSongs from './components/Admin/QueueSongs.vue';

import News from './components/pages/News.vue';
import About from './components/pages/About.vue';
import Terms from './components/pages/Terms.vue';
import Privacy from './components/pages/Privacy.vue';
import Team from './components/pages/Team.vue';
import User from './components/User/Show.vue';
import Settings from './components/User/Settings.vue';
import ResetPassword from './components/User/ResetPassword.vue';
import Login from './components/Modals/Login.vue';
import Register from './components/Modals/Register.vue';

Vue.use(VueRouter);

let router = new VueRouter({ history: true });
let _this = this;

lofig.folder = '../config/default.json';
lofig.get('serverDomain', function(res) {
	io.init(res);
	io.getSocket((socket) => {
		socket.on("ready", (status, role, username, userId) => {
			auth.data(status, role, username, userId);
		});
	});
});

document.onkeydown = event => {
    event = event || window.event;
    if (event.keyCode === 27) router.app.$dispatch('closeModal');
};

router.beforeEach(transition => {
	window.location.hash = '';
	if (window.stationInterval) {
		clearInterval(window.stationInterval);
		window.stationInterval = 0;
	}
	if (window.socket) {
		io.removeAllListeners();
	}
	io.clear();
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
	'404': {
		component: NotFound
	},
	'/terms': {
		component: Terms
	},
	'/privacy': {
		component: Privacy
	},
	'/team': {
		component: Team
	},
	'/news': {
		component: News
	},
	'/about': {
		component: About
	},
	'/u/:username': {
		component: User
	},
	'/settings': {
		component: Settings,
		loginRequired: true
	},
	'/reset_password': {
		component: ResetPassword
	},
	'/login': {
		component: Login
	},
	'/register': {
		component: Register
	},
	'/admin': {
		component: Admin,
		adminRequired: true
	},
	'/admin/news': {
		component: AdminNews,
		adminRequired: true
	},
	'/admin/users': {
		component: AdminUsers,
		adminRequired: true
	},
	'/admin/reports': {
		component: AdminReports,
		adminRequired: true
	},
	'/admin/stations': {
		component: AdminStations,
		adminRequired: true
	},
	'/admin/songs': {
		component: AdminSongs,
		adminRequired: true
	},
	'/admin/queuesongs': {
		component: AdminQueueSongs,
		adminRequired: true
	},
	'/official/:id': {
		component: Station
	},
	'/:id': {
		component: Station
	},
	'/community/:id': {
		component: Station
	}
});

router.start(App, 'body');
