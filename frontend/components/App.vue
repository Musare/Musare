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
				},
				login: {
					email: "",
					password: ""
				},
				loggedIn: true
			}
		},
		methods: {
			goHome() {
				this.home.visible = true;
				for (let i = 0; i < this.length; i++) {
					this[i].visible = false;
				}
			},
			logout() {
				$.ajax({
					method: "GET",
					url: "/users/logout",
					dataType: "json",
					complete: function (msg) {
						console.log(1, msg);
						alert("Logged out!");
						//do something
						location.reload();
					}
				});
			}
		},
		ready: function () {
			this.socket = io();
			this.socket.on("ready", function(loggedIn) {
				this.loggedIn = loggedIn;
			});
		},
		components: { MainHeader, HomeBody, StationBody, MainFooter },
		events: {
			'switchView': function(hide, show) {
				this[hide].visible = false;
				this[show].visible = true;
			},
			'register': function() {
				console.log('registered');
				$.ajax({
					method: "POST",
					url: "/users/register",
					data: JSON.stringify({
						email: this.register.email,
						username: this.register.username,
						password: this.register.password,
						recaptcha: grecaptcha.getResponse()
					}),
					contentType: "application/json; charset=utf-8",
					dataType: "json",
					success: function (msg) {
						console.log(1, msg);
						alert("Registered!");
						//do something
					},
					error: function (errormessage) {
						console.log(2, errormessage);
						alert("Not registered!");
						//do something else

					}
				});
			},
			'login': function() {
				console.log('login');
				$.ajax({
					method: "POST",
					url: "/users/login",
					data: JSON.stringify({
						email: this.login.email,
						password: this.login.password
					}),
					contentType: "application/json; charset=utf-8",
					dataType: "json",
					success: function (msg) {
						console.log(1, msg);
						alert("Logged in!");
						//do something
						location.reload();
					},
					error: function (errormessage) {
						console.log(2, errormessage);
						alert("Not logged in!");
						//do something else

					}
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
