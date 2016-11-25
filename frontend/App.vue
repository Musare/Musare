<template>
	<div>
		<router-view></router-view>
		<what-is-new></what-is-new>
	</div>
</template>

<script>
	import WhatIsNew from './components/WhatIsNew.vue';

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
				loggedIn: false
			}
		},
		methods: {
			logout: function () {
				this.socket.emit('users.logout');
				document.cookie = 'SID=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
				location.reload();
			}
		},
		ready() {
			let _this = this;
			lofig.get('socket.url', function(res) {
				let socket = _this.socket = io(window.location.protocol + '//' + res);
				socket.on("ready", status => _this.loggedIn = status);
			});
		},
		events: {
			'register': function () {
				let { register: { email, username, password } } = this;
				this.socket.emit('users.register', email, username, password, grecaptcha.getResponse(), (result) => {
					// Need to somehow execute this on Home.vue
					// Toast.methods.addToast(`User ${username} has been registered`, 2000);
					setTimeout(location.reload(), 2500);
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
			}
			/*'joinStation': function (id) {
				let mergedStations = this.stations.community.concat(this.stations.official);
				this.socket.emit('stations.join', id, result => {
					mergedStations.find(station => station.id === id).users = result.userCount;
				});
			},
			'leaveStation': function () {
				this.socket.emit('stations.leave', result => {
					//this.stations.find(station => station.id === id).users = result.userCount;
				});
			}*/
		},
		components: { WhatIsNew }
	}
</script>
