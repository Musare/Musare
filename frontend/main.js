import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import Home from './components/pages/Home.vue';
import Station from './components/pages/Station.vue';
import AdminQueue from './components/pages/AdminQueue.vue';

Vue.use(VueRouter);
let router = new VueRouter({ history: true });

router.map({
	'/': {
		component: Home
	},
	'/station/:id': {
		component: Station
	},
	'/admin/queue': {
		component: AdminQueue
	}
});

router.start(App, 'body');
