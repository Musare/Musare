<template>
	<div>
		<router-view></router-view>
	</div>
</template>

<script>
	export default {
		replace: false,
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
				likes: [],
				dislikes: [],
				loggedIn: true,
				stations: []
			}
		},
		methods: {
			logout() {
				$.ajax({
					method: "GET",
					url: "/users/logout",
					dataType: "json",
					complete: function (msg) {
						alert("Logged in!");
						location.reload();
					}
				});
			}
		},
		ready: function() {
			let local = this;
			local.socket = io();
			local.socket.on("ready", status => {
				local.loggedIn = status;
			});

			$.ajax({
				method: "POST",
				url: "/stations",
				contentType: "application/json; charset=utf-8",
				success: stations => {
					if (stations) this.stations = stations;
				},
				error: err => {
					if (err) console.log(err);
				}
			});
		},
		events: {
			'register': () => {
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
						if (msg) console.log(msg);
						alert("Registered!");
						//do something
					},
					error: function (err) {
						if (err) console.log(err);
						alert("Not registered!");
						//do something else

					}
				});
			},
			'login': () => {
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
						if (msg) console.log(msg);
						alert("Logged in!");
						//do something
					},
					error: function (err) {
						if (err) console.log(err);
						alert("Not logged in!");
						//do something else

					}
				});
			},
			'joinStation': id => {

			}
		}
	}
</script>

<style lang="sass" scoped>
	#toasts {
		position: fixed;
		z-index: 100000;
		right: 5%;
		top: 10%;
		max-width: 90%;

		.toast {
			width: 100%;
			height: auto;
			padding: 10px 20px;
			border-radius: 3px;
			color: white;
			background-color: #424242;
			display: -webkit-flex;
			display: -ms-flexbox;
			display: flex;
			margin-bottom: 10px;
			font-size: 1.18em;
			font-weight: 400;
			box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16), 0 2px 10px 0 rgba(0,0,0,0.12);
			transition: all 0.25s ease;
		}

		.toast-remove {
			opacity: 0;
			margin-top: -50px;
		}

		.toast-add {
			opacity: 0;
			margin-top: 50px;
		}
	}
</style>
