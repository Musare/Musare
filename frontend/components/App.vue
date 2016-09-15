<template>
	<div class="app">
		<main-header></main-header>
		<home-body v-if="home.visible"></home-body>
		<station-body v-if="station.visible"></station-body>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from './MainHeader.vue'
	import HomeBody from './HomeBody.vue'
	import StationBody from './StationBody.vue'
	import MainFooter from './MainFooter.vue'

	let socket = io();

	export default {
		data() {
			return {
				home: {
					visible: true
				},
				station: {
					visible: false
				},
				register: {
					email: "",
					username: "",
					password: ""
				}
			}
		},
		methods: {
			goHome() {
				this.home.visible = true;
				for (let i = 0; i < this.length; i++) {
					this[i].visible = false;
				}
			}
		},
		components: { MainHeader, HomeBody, StationBody, MainFooter },
		events: {
			'switchView': function(hide, show) {
				this[hide].visible = false;
				this[show].visible = true;
			},
			'register': function() {
				console.log('registered');
				socket.emit('/users/register', {
					email: this.register.email,
					username: this.register.username,
					password: this.register.password,
					recaptcha: grecaptcha.getResponse()
				});
			}
		}
	}
</script>

<style lang="sass">
	* { box-sizing: border-box; font-family: Roboto, sans-serif; }
	html {
		width: 100%;
		height: 100%;
		color: rgba(0, 0, 0, 0.87);

		body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
		}
	}

	@media only screen and (min-width: 1200px) {
		html {
			font-size: 15px;
		}
	}
	@media only screen and (min-width: 992px) {
		html {
			font-size: 14.5px;
		}
	}
	@media only screen and (min-width: 0) {
		html {
			font-size: 14px;
		}
	}
</style>
