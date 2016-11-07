import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import Home from './components/pages/Home.vue';
import Station from './components/pages/Station.vue';
import Admin from './components/pages/Admin.vue';

Vue.use(VueRouter);
let router = new VueRouter({ history: true });

router.map({
	'/': {
		component: Home
	},
	'/station/:id': {
		component: Station
	},
	'/admin': {
		component: Admin
	}
});

router.start(App, 'body');
