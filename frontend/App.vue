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
				this.socket.emit('users.logout');
				location.reload();
			}
		},
		ready: function () {
			let socket = this.socket = io(window.location.protocol + '//' + window.location.hostname + ':8081');
			socket.on("ready", status => this.loggedIn = status);
			socket.emit("stations.index", data => this.stations = data);
		},
		events: {
			'register': function () {

				let { register: { email, username, password } } = this;

				this.socket.emit('users.login', email, username, password, grecaptcha.getResponse(), (result) => {
					console.log(result);
					location.reload();
				});
			},
			'login': function () {

				let { login: { email, password } } = this;

				this.socket.emit('users.login', email, password, (result) => {
					console.log(result);
					location.reload();
				});
			},
			'joinStation': function (id) {
				this.socket.emit('stations.join', id, (result) => {
					this.stations.find(station => station.id === id).users = result.userCount;
				});
			},
			'leaveStation': function () {
				this.socket.emit('stations.leave', (result) => {
					//this.stations.find(station => station.id === id).users = result.userCount;
				});
			}
		}
	}
</script>
