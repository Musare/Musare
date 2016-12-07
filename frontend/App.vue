<template>
	<div>
		<router-view></router-view>
		<toast></toast>
		<what-is-new></what-is-new>
		<login-modal v-if='isLoginActive'></login-modal>
		<register-modal v-if='isRegisterActive'></register-modal>
		<create-community-station v-if='isCreateCommunityStationActive'></create-community-station>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import WhatIsNew from './components/Modals/WhatIsNew.vue';
	import LoginModal from './components/Modals/Login.vue';
	import RegisterModal from './components/Modals/Register.vue';
	import CreateCommunityStation from './components/Modals/CreateCommunityStation.vue';
	import auth from './auth';

	export default {
		replace: false,
		data() {
			return {
				register: {
					email: '',
					username: '',
					password: ''
				},
				login: {
					email: '',
					password: ''
				},
				loggedIn: false,
				role: '',
				username: '',
				userId: '',
				isRegisterActive: false,
				isLoginActive: false,
				isCreateCommunityStationActive: false,
				serverDomain: ''
			}
		},
		methods: {
			logout: function () {
				this.socket.emit('users.logout', result => {
					if (result.status === 'success') {
						document.cookie = 'SID=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
						location.reload();
					} else Toast.methods.addToast(result.message, 4000);
				});
			},
			'submitOnEnter': (cb, event) => {
				if (event.which == 13) b(); return false;
			}
		},
		ready() {
			Toast.methods.addToast('Hiasd', 50000);
			Toast.methods.addToast('Hiasd', 50000);
			Toast.methods.addToast('Hiasd', 50000);
			let _this = this;
			auth.getStatus((authenticated, role, username, userId) => {
				_this.socket = window.socket;
				_this.loggedIn = authenticated;
				_this.role = role;
				_this.username = username;
				_this.userId = userId;
			});
			lofig.get('serverDomain', res => {
				_this.serverDomain = res;
			});
		},
		events: {
			'register': function () {
				let { register: { email, username, password } } = this;
				let _this = this;
				this.socket.emit('users.register', username, email, password, /*grecaptcha.getResponse()*/null, result => {
					Toast.methods.addToast(`You have successfully registered.`, 4000);
					setTimeout(() => {
						if (result.SID) {
							let date = new Date();
							date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
							document.cookie = `SID=${result.SID}; expires=${date.toGMTString()}; path=/`;
							location.reload();
						} else {
							_this.$router.go('/login');
						}
					}, 4000);
				});
			},
			'login': function () {
				let { login: { email, password } } = this;
				let _this = this;
				this.socket.emit('users.login', email, password, result => {
					if (result.status === 'success') {
						let date = new Date();
						date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
						document.cookie = `SID=${result.SID}; expires=${date.toGMTString()}; path=/`;
						Toast.methods.addToast(`You have been successfully logged in`, 2000);
						_this.$router.go('/');
						location.reload();
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
					case 'createCommunityStation':
						this.isCreateCommunityStationActive = !this.isCreateCommunityStationActive;
						break;
				}
			}
		},
		components: { Toast, WhatIsNew, LoginModal, RegisterModal, CreateCommunityStation }
	}
</script>

<style type='scss'>
	#toast-container { z-index: 10000 !important; }
</style>