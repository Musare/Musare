<template>
	<main-header></main-header>
	<div class="container">
		<!--Implement Validation-->
		<label class="label">Username</label>
		<div class="control is-grouped">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="text" placeholder="Change username" v-model="user.username">
				<!--Remove validation if it's their own without changing-->
			</p>
			<p class="control">
				<button class="button is-success" @click="changeUsername()">Save changes</button>
			</p>
		</div>
		<label class="label">Email</label>
		<div class="control is-grouped" v-if="user.email">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="text" placeholder="Change email address" v-model="user.email.address">
				<!--Remove validation if it's their own without changing-->
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changeEmail()">Save changes</button>
			</p>
		</div>
		<label class="label" v-if="password">Change Password</label>
		<div class="control is-grouped" v-if="password">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="password" placeholder="Change password" v-model="newPassword">
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changePassword()">Change password</button>
			</p>
		</div>

		<label class="label" v-if="!password">Add password</label>
		<div class="control is-grouped" v-if="!password">
			<button class="button is-success" @click="requestPassword()" v-if="passwordStep === 1">Request password email</button><br>

			<p class="control is-expanded has-icon has-icon-right" v-if="passwordStep === 2">
				<input class="input" type="text" placeholder="Code" v-model="passwordCode">
			</p>
			<p class="control is-expanded" v-if="passwordStep === 2">
				<button class="button is-success" @click="verifyCode()">Verify code</button>
			</p>

			<p class="control is-expanded has-icon has-icon-right" v-if="passwordStep === 3">
				<input class="input" type="password" placeholder="New password" v-model="setNewPassword">
			</p>
			<p class="control is-expanded" v-if="passwordStep === 3">
				<button class="button is-success" @click="setPassword()">Set password</button>
			</p>
		</div>
		<a href="#" v-if="passwordStep === 1 && !password" @click="passwordStep = 2">Skip this step</a>

		<a class="button is-github" v-if="!github" :href='"http://" + $parent.serverDomain + "/auth/github/link"'>
			<div class='icon'>
				<img class='invert' src='/assets/social/github.svg'/>
			</div>
			&nbsp; Link GitHub to account
		</a>

		<button class="button is-danger" @click="unlinkPassword()" v-if="password && github">Remove logging in with password</button>
		<button class="button is-danger" @click="unlinkGitHub()" v-if="password && github">Remove logging in with GitHub</button>

		<br>
		<button class="button is-warning" @click="removeSessions()" style="margin-top: 30px;">Log out everywhere</button>
	</div>
	<main-footer></main-footer>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	import LoginModal from '../Modals/Login.vue'
	import io from '../../io'
	import validation from '../../validation';

	export default {
		data() {
			return {
				user: {},
				newPassword: '',
				password: false,
				github: false,
				setNewPassword: '',
				passwordStep: 1,
				passwordCode: ''
			}
		},
		ready: function() {
			let _this = this;
			io.getSocket(socket => {
				_this.socket = socket;
				_this.socket.emit('users.findBySession', res => {
					if (res.status == 'success') {
						_this.user = res.data;
						_this.password = _this.user.password;
						_this.github = _this.user.github;
					} else {
						_this.$parent.isLoginActive = true;
						Toast.methods.addToast('Your are currently not signed in', 3000);
					}
				});
				_this.socket.on('event:user.username.changed', username => {
					_this.$parent.username = username;
				});
				_this.socket.on('event:user.linkPassword', () => {
					_this.password = true;
				});
				_this.socket.on('event:user.linkGitHub', () => {
					_this.github = true;
				});
				_this.socket.on('event:user.unlinkPassword', () => {
					_this.password = false;
				});
				_this.socket.on('event:user.unlinkGitHub', () => {
					_this.github = false;
				});
			});
		},
		methods: {
			changeEmail: function () {
				const email = this.user.email.address;
				if (!validation.isLength(email, 3, 254)) return Toast.methods.addToast('Email must have between 3 and 254 characters.', 8000);
				if (email.indexOf('@') !== email.lastIndexOf('@') || !validation.regex.emailSimple.test(email)) return Toast.methods.addToast('Invalid email format.', 8000);


				this.socket.emit('users.updateEmail', this.$parent.userId, email, res => {
					if (res.status !== 'success') Toast.methods.addToast(res.message, 8000);
					else Toast.methods.addToast('Successfully changed email address', 4000);
				});
			},
			changeUsername: function () {
				const username = this.user.username;
				if (!validation.isLength(username, 2, 32)) return Toast.methods.addToast('Username must have between 2 and 32 characters.', 8000);
				if (!validation.regex.azAZ09_.test(username)) return Toast.methods.addToast('Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.', 8000);


				this.socket.emit('users.updateUsername', this.$parent.userId, username, res => {
					if (res.status !== 'success') Toast.methods.addToast(res.message, 8000);
					else Toast.methods.addToast('Successfully changed username', 4000);
				});
			},
			changePassword: function () {
				const newPassword = this.newPassword;
				if (!validation.isLength(newPassword, 6, 200)) return Toast.methods.addToast('Password must have between 6 and 200 characters.', 8000);
				if (!validation.regex.password.test(newPassword)) return Toast.methods.addToast('Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.', 8000);


				this.socket.emit('users.updatePassword', newPassword, res => {
					if (res.status !== 'success') Toast.methods.addToast(res.message, 8000);
					else Toast.methods.addToast('Successfully changed password', 4000);
				});
			},
			requestPassword: function() {
				this.socket.emit('users.requestPassword', res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success') {
						this.passwordStep = 2;
					}
				});
			},
			verifyCode: function () {
				if (!this.passwordCode) return Toast.methods.addToast('Code cannot be empty', 8000);
				this.socket.emit('users.verifyPasswordCode', this.passwordCode, res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success') {
						this.passwordStep = 3;
					}
				});
			},
			setPassword: function () {
				const newPassword = this.setNewPassword;
				if (!validation.isLength(newPassword, 6, 200)) return Toast.methods.addToast('Password must have between 6 and 200 characters.', 8000);
				if (!validation.regex.password.test(newPassword)) return Toast.methods.addToast('Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.', 8000);


				this.socket.emit('users.changePasswordWithCode', this.passwordCode, newPassword, res => {
					Toast.methods.addToast(res.message, 8000);
				});
			},
			unlinkPassword: function () {
				this.socket.emit('users.unlinkPassword', res => {
					Toast.methods.addToast(res.message, 8000);
				});
			},
			unlinkGitHub: function () {
				this.socket.emit('users.unlinkGitHub', res => {
					Toast.methods.addToast(res.message, 8000);
				});
			},
			removeSessions: function () {
				this.socket.emit(`users.removeSessions`, this.$parent.userId, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			}
		},
		components: { MainHeader, MainFooter, LoginModal }
	}
</script>

<style lang="scss" scoped>
	.container {
		padding: 25px;
	}

	a { color: #029ce3 !important; }
</style>
