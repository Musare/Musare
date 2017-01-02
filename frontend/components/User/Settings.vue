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
		<label class="label" v-if="user.password">Change Password</label>
		<div class="control is-grouped" v-if="user.password">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="password" placeholder="Change password" v-model="newPassword">
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changePassword()">Change password</button>
			</p>
		</div>
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
				newPassword: ''
			}
		},
		ready: function() {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('users.findBySession', res => {
					if (res.status == 'success') { _this.user = res.data; } else {
						_this.$parent.isLoginActive = true;
						Toast.methods.addToast('Your are currently not signed in', 3000);
					}
				});
				_this.socket.on('event:user.username.changed', username => {
					_this.$parent.username = username;
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
