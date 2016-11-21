import Vue from 'vue';
import VueRouter from 'vue-router';

import App from './App.vue';

import Home from './components/pages/Home.vue';
import Station from './components/pages/Station.vue';
import Admin from './components/pages/Admin.vue';
import User from './components/User/Show.vue';
import Settings from './components/User/Settings.vue';

Vue.use(VueRouter);

let router = new VueRouter({ history: true });

router.map({
	'/': {
		component: Home
	},
	'/u/:username': {
		component: User
	},
	'/u/:username/settings': {
		component: Settings
	},
	'/admin': {
		component: Admin
	},
	'/station/:id': {
		component: Station
	}
});

router.start(App, 'body');
