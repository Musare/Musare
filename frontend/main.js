import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import auth from './auth';
import io from './io';

Vue.use(VueRouter);

let router = new VueRouter({
	history: true,
	suppressTransitionError: true
});

let _this = this;

lofig.folder = '../config/default.json';
lofig.get('serverDomain', function(res) {
	io.init(res);
	io.getSocket((socket) => {
		socket.on("ready", (status, role, username, userId) => {
			auth.data(status, role, username, userId);
		});
		socket.on('keep.event:banned', ban => {
			auth.setBanned(ban);
		});
	});
});

document.onkeydown = event => {
	event = event || window.event;
	if (event.keyCode === 27) router.app.$dispatch('closeModal');
};

router.beforeEach(transition => {
	window.location.hash = '';
	//
	if (window.stationInterval) {
		clearInterval(window.stationInterval);
		window.stationInterval = 0;
	}
	if (window.socket) io.removeAllListeners();
	io.clear();
	if (transition.to.loginRequired || transition.to.adminRequired) {
		auth.getStatus((authenticated, role) => {
			if (transition.to.loginRequired && !authenticated) transition.redirect('/login');
			else if (transition.to.adminRequired && role !== 'admin') transition.redirect('/');
			else transition.next();
		});
	} else transition.next();

	if (transition.to.officialRequired) {
		io.getSocket(socket => {
			socket.emit('stations.findByName', transition.to.params.id, res => {
				if (res.status === 'success') {
					if (res.data.type === 'community') transition.redirect(`/community/${transition.to.params.id}`);
					else transition.next();
				}
			});
		});
	}

	if (transition.to.communityRequired) {
		io.getSocket(socket => {
			socket.emit('stations.findByName', transition.to.params.id, res => {
				if (res.status === 'success') {
					if (res.data.type === 'official') transition.redirect(`/official/${transition.to.params.id}`);
					else transition.next();
				}
			});
		});
	}
});

router.afterEach(data => {
	ga('set', 'page', data.to.path);
	ga('send', 'pageview');
});


router.map({
	'/': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Home.vue')), 'home')
	},
	'*': {
		component: resolve => require.ensure([], () => resolve(require('./components/404.vue')), '404')
	},
	'404': {
		component: resolve => require.ensure([], () => resolve(require('./components/404.vue')), '404')
	},
	'/terms': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Terms.vue')), 'terms')
	},
	'/privacy': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Privacy.vue')), 'privacy')
	},
	'/team': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Team.vue')), 'team')
	},
	'/news': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/News.vue')), 'news')
	},
	'/about': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/About.vue')), 'about')
	},
	'/u/:username': {
		component: resolve => require.ensure([], () => resolve(require('./components/User/Show.vue')), 'show-user')
	},
	'/settings': {
		component: resolve => require.ensure([], () => resolve(require('./components/User/Settings.vue')), 'settings'),
		loginRequired: true
	},
	'/reset_password': {
		component: resolve => require.ensure([], () => resolve(require('./components/User/ResetPassword.vue')), 'reset-password')
	},
	'/login': {
		component: resolve => require.ensure([], () => resolve(require('./components/Modals/Login.vue')), 'login')
	},
	'/register': {
		component: resolve => require.ensure([], () => resolve(require('./components/Modals/Register.vue')), 'register')
	},
	'/admin': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Admin.vue')), 'admin'),
		adminRequired: true
	},
	'/admin/:page': {
		component: resolve => require.ensure([], () => resolve(require('./components/pages/Admin.vue')), 'admin'),
		adminRequired: true
	},
	'/official/:id': {
		component: resolve => require.ensure([], () => resolve(require('./components/Station/Station.vue')), 'station'),
		officialRequired: true
	},
	'/:id': {
		component: resolve => require.ensure([], () => resolve(require('./components/Station/Station.vue')), 'station'),
		officialRequired: true
	},
	'/community/:id': {
		component: resolve => require.ensure([], () => resolve(require('./components/Station/Station.vue')), 'station'),
		communityRequired: true
	}
});

router.start(App, 'body');
