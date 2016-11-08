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
					method: "POST",
					url: "/users/logout",
					dataType: "json",
					complete: msg => {
						alert("Logged out!");
						location.reload();
					}
				});
			}
		},
		ready: function() {
			let local = this;
			local.socket = io(window.location.protocol + '//' + window.location.hostname + ':8081');
			local.socket.on("ready", status => {
				local.loggedIn = status;
			});

			local.socket.emit("/stations", function(data) {
				local.stations = data;
			});
		},
		events: {
			'register': function() {
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
					},
					error: function (err) {
						if (err) console.log(err);
						alert("Not registered!");
					}
				});
			},
			'login': function() {
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
						location.reload();
						//do something
					},
					error: function (err) {
						if (err) console.log(err);
						alert("Not logged in!");
					}
				});
			},
			'joinStation': function(id) {
				let local = this;
				local.socket.emit('/stations/join/:id', id, (result) => {
					local.stations.forEach(function(station) {
						if (station.id === id) {
							station.users = result;
						}
					});
				});
			},
			'leaveStation': function(id) {
				let local = this;
				local.socket.emit('/stations/leave/:id', id, (result) => {
					local.stations.forEach(function(station) {
						if (station.id === id) {
							station.users = result;
						}
					});
				});
			}
		}
	}
</script>