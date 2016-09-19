import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from './pages/Home.vue';
import Station from './pages/Station.vue';

Vue.use(VueRouter);
let router = new VueRouter({ history: true });

router.map({
	'/': {
		component: Home
	},
	'/station': {
		component: Station
	}
});

router.start(Vue.extend(), 'body');
