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
				this.socket.emit('/users/logout');
				location.reload();
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
				fetch(`${window.location.protocol + '//' + window.location.hostname + ':8081'}/users/register`, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json; charset=utf-8'
					},
					body: JSON.stringify({
						email: this.register.email,
						username: this.register.username,
						password: this.register.password,
						recaptcha: grecaptcha.getResponse()
					})
				}).then(response => {
					alert('Now sign in!');
				})
			},
			'login': function() {
				fetch(`${window.location.protocol + '//' + window.location.hostname + ':8081'}/users/login`, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json; charset=utf-8'
					},
					body: JSON.stringify({
						email: this.login.email,
						password: this.login.password
					})
				}).then(response => {
					console.log(response);
					// location.reload();
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
