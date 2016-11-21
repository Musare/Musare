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
				loggedIn: false,
				stations: []
			}
		},
		methods: {
			logout() {
				this.socket.emit('users.logout');
				document.cookie = 'SID=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
				location.reload();
			}
		},
		ready: function () {
			lofig.get('socket.url', res => {
				let socket = this.socket = io(window.location.protocol + '//' + res);
				socket.on("ready", status => this.loggedIn = status);
				socket.emit("stations.index", data => {
					if (data.status === "success") {
						this.stations = data.stations;
					}
				});
			});
		},
		events: {
			'register': function () {

				let { register: { email, username, password } } = this;
				this.socket.emit('users.register', email, username, password, grecaptcha.getResponse(), (result) => {
					console.log(result);
					location.reload();
				});
			},
			'login': function () {

				let { login: { email, password } } = this;

				this.socket.emit('users.login', email, password, (result) => {
					console.log(result);
					if (result.status === 'success') {
						let date = new Date();
						date.setTime(new Date().getTime() + (2*365*24*60*60*1000));
						document.cookie = "SID=" + result.sessionId + "; expires="+ date.toGMTString() +"; path=/";
						location.reload();
					} else {
						//TODO Error toast
					}
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
