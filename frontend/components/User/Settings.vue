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
				<button class="button is-success" @click="changeUsername()">Save Changes</button>
			</p>
		</div>
		<label class="label">Email</label>
		<div class="control is-grouped" v-if="user.email">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="text" placeholder="Change email address" v-model="user.email.address">
				<!--Remove validation if it's their own without changing-->
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changeEmail()">Save Changes</button>
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


		<a class="button is-github" v-if="!github" :href='$parent.serverDomain + "/auth/github/link"'>
			<div class='icon'>
				<img class='invert' src='/assets/social/github.svg'/>
			</div>
			&nbsp; Link GitHub to account
		</a>

		<button class="button is-danger" @click="unlinkPassword()" v-if="password && github">Remove logging in with password</button>
		<button class="button is-danger" @click="unlinkGitHub()" v-if="password && github">Remove logging in with GitHub</button>
	</div>
	<main-footer></main-footer>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	import LoginModal from '../Modals/Login.vue'
	import io from '../../io'

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
				_this.socket.on('event:user.linkPassword', () => {console.log(1);
					_this.password = true;
				});
				_this.socket.on('event:user.linkGitHub', () => {console.log(2);
					_this.github = true;
				});
				_this.socket.on('event:user.unlinkPassword', () => {console.log(3);
					_this.password = false;
				});
				_this.socket.on('event:user.unlinkGitHub', () => {console.log(4);
					_this.github = false;
				});
			});
		},
		methods: {
			changeEmail: function () {
				if (!this.user.email.address) return Toast.methods.addToast('Email cannot be empty', 8000);
				this.socket.emit('users.updateEmail', this.user.email.address, res => {
					if (res.status !== 'success') Toast.methods.addToast(res.message, 8000);
					else Toast.methods.addToast('Successfully changed email address', 4000);
				});
			},
			changeUsername: function () {
				let _this = this;
				if (!_this.user.username) return Toast.methods.addToast('Username cannot be empty', 8000);
				_this.socket.emit('users.updateUsername', _this.user.username, res => {
					if (res.status !== 'success') Toast.methods.addToast(res.message, 8000);
					else Toast.methods.addToast('Successfully changed username', 4000);
				});
			},
			changePassword: function () {
				let _this = this;
				if (!_this.newPassword) return Toast.methods.addToast('New password cannot be empty', 8000);
				_this.socket.emit('users.updatePassword', _this.newPassword, res => {
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
				if (!this.setNewPassword) return Toast.methods.addToast('Password cannot be empty', 8000);
				this.socket.emit('users.changePasswordWithCode', this.passwordCode, this.setNewPassword, res => {
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
			}
		},
		components: { MainHeader, MainFooter, LoginModal }
	}
</script>

<style lang="scss" scoped>
	.container {
		padding: 25px;
	}
</style>
