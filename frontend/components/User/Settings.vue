<template>
	<main-header></main-header>
	<div class="container">
		<!--Implement Validation-->
		<label class="label">Username</label>
		<div class="control is-grouped">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-success" type="text" placeholder="Change username" v-model="user.username">
				<!--Remove validation if it's their own without changing-->
				<i class="fa fa-check"></i>
				<span class="help is-success">This username is available</span>
			</p>
			<p class="control">
				<button class="button is-success" @click="changeUsername()">Save Changes</button>
			</p>
		</div>
		<label class="label">Email</label>
		<div class="control is-grouped">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-danger" type="text" placeholder="Change email address" v-model="user.email.address">
				<!--Remove validation if it's their own without changing-->
				<i class="fa fa-warning"></i>
				<span class="help is-danger">This email is invalid</span>
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changeEmail()">Save Changes</button>
			</p>
		</div>
		<label class="label">Change Password</label>
		<div class="control is-grouped">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-danger" type="text" placeholder="Enter current password" v-model="currentPassword">
				<!-- Check if correct -->
				<i class="fa fa-warning"></i>
				<span class="help is-danger">This password is invalid</span>
			</p>
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-danger" type="text" placeholder="Enter new password" v-model="newPassword">
				<!--Check if longer than x chars, has x, x and x. Kris likes x too ;)-->
				<i class="fa fa-warning"></i>
				<span class="help is-danger">This password is invalid</span>
			</p>
			<p class="control is-expanded">
				<button class="button is-success" @click="changePassword()">Save Changes</button>
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

	export default {
		data() {
			return {
				currentPassword: '',
				newPassword: '',
				user: {}
			}
		},
		ready: function() {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					_this.socket.emit('users.findBySession', res => {
						if (res.status == 'success') { _this.user = res.data; } else {
							_this.$parent.isLoginActive = true;
							Toast.methods.addToast('Your are currently not signed in', 3000);
						}
					});
					clearInterval(socketInterval);
				}
			}, 100);
		},
		methods: {
			changePassword: function () {
				if (this.currentPassword == "" || this.newPassword == "") return Toast.methods.addToast('Current password field is incorrect', 2000);

				this.socket.emit('users.update', 'services.password.password', this.user.password, res => {
					if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
					else Toast.methods.addToast('Successfully changed password', 2000);
				});
			},
			changeEmail: function () {
				if (this.user.email == "") return Toast.methods.addToast('Field cannot be empty', 2000);

				this.socket.emit('users.update', 'email.address', this.user.email, res => {
					if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
					else Toast.methods.addToast('Successfully changed email address', 2000);
				});
			},
			// Will be added shortly:
			// changeAvatar() {
			//     let files = document.getElementById("avatar").files;
			//     if (files === undefined || files === null) return Materialize.toast(this.getFromLang("error.profilePictureNotSupported"), 4000);
			//     if (files.length !== 1) return Materialize.toast(this.getFromLang("error.profilePictureOnlyOneFileAllowed"), 4000);
			//     if (files[0].size >= 2097152) return Materialize.toast(this.getFromLang("error.tooBigProfileImage"), 4000);
			//     if (files[0].type.indexOf("image/") == -1) return Materialize.toast(this.getFromLang("error.notAnImage"), 4000);
			//     let local = this;
			//     fetch(window.location.protocol + '//' + window.location.hostname + ':8081' + '/auth/update/avatar', {
			//         method: 'POST',
			//         body: new FormData($('#updateAvatar')[0])
			//     }).then(response => {
			//         return response.json()
			//     }).then(body => {
			//         if (body.status == 'error') Materialize.toast(body.message, 4000);
			//         else Materialize.toast(local.getFromLang("settings.profilePictureUpdated"), 4000);
			//         console.log(body);
			//     });
			// },
			changeUsername: function () {
				if (this.user.username == "") return Toast.methods.addToast('Field cannot be empty', 2000);

				this.socket.emit('users.update', 'username', this.user.username, res => {
					if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
					else Toast.methods.addToast('Successfully changed username', 2000);
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
