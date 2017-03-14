<template>
	<div>
		<h1 v-if="!socketConnected" class="alert">Could not connect to the server.</h1>
		<router-view></router-view>
		<toast></toast>
		<what-is-new></what-is-new>
		<login-modal v-if='isLoginActive'></login-modal>
		<register-modal v-if='isRegisterActive'></register-modal>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import WhatIsNew from './components/Modals/WhatIsNew.vue';
	import LoginModal from './components/Modals/Login.vue';
	import RegisterModal from './components/Modals/Register.vue';
	import auth from './auth';
	import io from './io';
	import validation from './validation';

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
				serverDomain: '',
				socketConnected: true
			}
		},
		methods: {
			logout: function () {
				let _this = this;
				_this.socket.emit('users.logout', result => {
					if (result.status === 'success') {
						document.cookie = 'SID=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
						_this.$router.go('/');
						location.reload();
					} else Toast.methods.addToast(result.message, 4000);
				});
			},
			'submitOnEnter': (cb, event) => {
				if (event.which == 13) cb();
			}
		},
		ready: function () {
			let _this = this;
			auth.getStatus((authenticated, role, username, userId) => {
				_this.socket = window.socket;
				_this.loggedIn = authenticated;
				_this.role = role;
				_this.username = username;
				_this.userId = userId;
			});
			io.onConnect(true, () => {
				_this.socketConnected = true;
			});
			io.onConnectError(true, () => {
				_this.socketConnected = false;
			});
			io.onDisconnect(true, () => {
				_this.socketConnected = false;
			});
			lofig.get('serverDomain', res => {
				_this.serverDomain = res;
			});
			if (_this.$route.query.err) {
				let err = _this.$route.query.err;
				err = err.replace(new RegExp('<', 'g'), '&lt;').replace(new RegExp('>', 'g'), '&gt;');
				Toast.methods.addToast(err, 20000);
			}
		},
		events: {
			'register': function (recaptchaId) {
				let { register: { email, username, password } } = this;
				let _this = this;
				if (!email || !username || !password) return Toast.methods.addToast('Please fill in all fields', 8000);


				if (!validation.isLength(email, 3, 254)) return Toast.methods.addToast('Email must have between 3 and 254 characters.', 8000);
				if (email.indexOf('@') !== email.lastIndexOf('@') || !validation.regex.emailSimple.test(email)) return Toast.methods.addToast('Invalid email format.', 8000);


				if (!validation.isLength(username, 2, 32)) return Toast.methods.addToast('Username must have between 2 and 32 characters.', 8000);
				if (!validation.regex.azAZ09_.test(username)) return Toast.methods.addToast('Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.', 8000);


				if (!validation.isLength(password, 6, 200)) return Toast.methods.addToast('Password must have between 6 and 200 characters.', 8000);
				if (!validation.regex.password.test(password)) return Toast.methods.addToast('Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.', 8000);

				this.socket.emit('users.register', username, email, password, grecaptcha.getResponse(recaptchaId), result => {
					if (result.status === 'success') {
						Toast.methods.addToast(`You have successfully registered.`, 4000);
						if (result.SID) {
							lofig.get('cookie', cookie => {
								let date = new Date();
								date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
								let secure = (cookie.secure) ? 'secure=true; ' : '';
								document.cookie = `SID=${result.SID}; expires=${date.toGMTString()}; domain=${cookie.domain}; ${secure}path=/`;
								location.reload();
							});
						} else _this.$router.go('/login');
					} else Toast.methods.addToast(result.message, 8000);
				});
			},
			'login': function () {
				let { login: { email, password } } = this;
				let _this = this;
				this.socket.emit('users.login', email, password, result => {
					if (result.status === 'success') {
						lofig.get('cookie', cookie => {
							let date = new Date();
							date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
							let secure = (cookie.secure) ? 'secure=true; ' : '';
							let domain = '';
							if (cookie.domain !== 'localhost') {
								domain = ` domain=${cookie.domain};`;
							}
							document.cookie = `SID=${result.SID}; expires=${date.toGMTString()}; ${domain}${secure}path=/`;
							Toast.methods.addToast(`You have been successfully logged in`, 2000);
							_this.$router.go('/');
							location.reload();
						});
					} else Toast.methods.addToast(result.message, 2000);
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
			},
			'closeModal': function() {
				this.$broadcast('closeModal');
			}
		},
		components: { Toast, WhatIsNew, LoginModal, RegisterModal }
	}
</script>

<style type='scss'>
	#toast-container { z-index: 10000 !important; }

	html {
		overflow: auto !important;
	}

	.modal-card {
		margin: 0 !important;
	}

	.absolute-a {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}

	.alert {
		padding: 20px;
		color: white;
		background-color: red;
		position: fixed;
		top: 50px;
		right: 50px;
		font-size: 2em;
		border-radius: 5px;
		z-index: 10000000;
	}

	.tooltip {
		position: relative;

		&:after {
			 position: absolute;
			 min-width: 80px;
			 margin-left: -75%;
			 text-align: center;
			 padding: 7.5px 6px;
			 border-radius: 2px;
			 background-color: #323232;
			 font-size: .9em;
			 color: #fff;
			 content: attr(data-tooltip);
			 opacity: 0;
			 transition: all .2s ease-in-out .1s;
			 visibility: hidden;
		}

		&:hover:after {
			 opacity: 1;
			 visibility: visible;
		}
	}

	.tooltip-top {
		&:after {
			 bottom: 150%;
		}

		&:hover {
			&:after { bottom: 120%; }
		}
	}


	.tooltip-bottom {
		&:after {
			 top: 155%;
		}

		&:hover {
			&:after { top: 125%; }
		}
	}

	.tooltip-left {
		&:after {
			 bottom: -10px;
			 right: 130%;
			 min-width: 100px;
		}

		&:hover {
			&:after { right: 110%; }
		}
	}

	.tooltip-right {
		&:after {
			 bottom: -10px;
			 left: 190%;
			 min-width: 100px;
		}

		&:hover {
			 &:after { left: 200%; }
		}
	}

	.button:focus, .button:active { border-color: #dbdbdb !important; }
	.input:focus, .input:active { border-color: #03a9f4 !important; }
	button.delete:focus { background-color: rgba(10, 10, 10, 0.3); }

	.tag { padding-right: 6px !important; }

	.button.is-success { background-color: #00B16A !important; }
</style>
