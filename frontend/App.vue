<template>
	<div>
		<router-view></router-view>
		<toast></toast>
		<what-is-new></what-is-new>
		<login-modal v-if="isLoginActive"></login-modal>
		<register-modal v-if="isRegisterActive"></register-modal>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import WhatIsNew from './components/Modals/WhatIsNew.vue';
	import LoginModal from './components/Modals/Login.vue';
	import RegisterModal from './components/Modals/Register.vue';

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
				loggedIn: false,
				isRegisterActive: false,
				isLoginActive: false
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
			lofig.folder = '../config/default.json';
			lofig.get('socket.url', function(res) {
				let socket = _this.socket = io(window.location.protocol + '//' + res);
				socket.on("ready", status => _this.loggedIn = status);
			});
		},
		events: {
			'register': function () {
				let { register: { email, username, password } } = this;
				this.socket.emit('users.register', username, email, password, grecaptcha.getResponse(), result => {
					Toast.methods.addToast(`User ${username} has been registered`, 2000);
					setTimeout(location.reload(), 2500);
				});
			},
			'login': function () {
				let { login: { email, password } } = this;

				this.socket.emit('users.login', email, password, result => {
					console.log(result);
					if (result.status === 'success') {
						let date = new Date();
						date.setTime(new Date().getTime() + (2*365*24*60*60*1000));
						document.cookie = "SID=" + result.SID + "; expires="+ date.toGMTString() +"; path=/";
						Toast.methods.addToast(`You have been successfully logged in`, 2000);
						setTimeout(location.reload(), 2500);
					} else {
						Toast.methods.addToast(result.message, 2000);
					}
				});
			},
			'toggleModal': function (type) {
				switch(type) {
					case 'register':
						this.isRegisterActive = !this.isRegisterActive;
						break;
					case 'login':
						this.isLoginActive = !this.isLoginActive;
						break;
				}
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
		components: { Toast, WhatIsNew, LoginModal, RegisterModal }
	}
</script>
