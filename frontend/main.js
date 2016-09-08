import Vue from 'vue';
import App from './components/App.vue';
require('./sass/main.scss');

new Vue({
	el: 'body',
	components: {
		app: App
	}
});
