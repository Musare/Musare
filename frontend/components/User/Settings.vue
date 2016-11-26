<template>
	<main-header></main-header>
	<div class="container">
		<!--Implement Validation-->
		<label class="label">Username</label>
		<p class="control has-icon has-icon-right">
			<input class="input is-success" type="text" placeholder="Change username" :value="user.username" v-model="user.username">
			<!--Remove validation if it's their own without changing-->
			<i class="fa fa-check"></i>
			<span class="help is-success">This username is available</span>
		</p>
		<label class="label">Email</label>
		<p class="control has-icon has-icon-right">
			<input class="input is-danger" type="text" placeholder="Change email address" :value="user.email" v-model="user.email">
			<!--Remove validation if it's their own without changing-->
			<i class="fa fa-warning"></i>
			<span class="help is-danger">This email is invalid</span>
		</p>
		<label class="label">Change Password</label>
		<div class="control is-grouped">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-danger" type="text" placeholder="Enter current password" v-model="currentPassword">
				<!-- Check if correct -->
				<i class="fa fa-warning"></i>
				<span class="help is-danger">This password is invalid</span>
			</p>
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input is-danger" type="text" placeholder="Enter new password" v-model="user.password">
				<!--Check if longer than x chars, has x, x and x. Kris likes x too ;)-->
				<i class="fa fa-warning"></i>
				<span class="help is-danger">This password is invalid</span>
			</p>
		</div>
		<p class="control">
			<button class="button is-success">Save Changes</button>
		</p>
	</div>
	<main-footer></main-footer>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	export default {
		data() {
			return {
				currentPassword: '',
				user: {}
			}
		},
		ready: function() {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					// need to refactor to send whoever is currently logged in
					_this.socket.emit('users.findByUsername', 'atjonathan', res => {
						if (res.status == 'error') console.error(res.message); // Add 404/ Not found Component with link back to home, for now just console.log
						else _this.user = res.data;
					});
					_this.socket.emit('users.findBySession', res => {
						console.log(res, location.href)
						/* if (res.data == null) */ console.log(location.href);
					});
					clearInterval(socketInterval);
				}
			}, 100);
		},
		methods: {
			changePassword: function () {
				if (this.currentPassword !== "" && this.user.password !== "") {
					// need to refactor to send whoever is currently logged in
					socket.emit('users.update', '582a0724023ecc015c0bef42', 'services.password.password', this.user.password, res => {
						if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
						else Toast.methods.addToast('Successfully changed password', 2000);
					});
				} else {
					Toast.methods.addToast('Current password field is incorrect', 2000);
				}
			},
			changeEmail: function () {
				if (this.user.email !== "") {
					socket.emit('users.update', '582a0724023ecc015c0bef42', 'email.address', this.user.email, res => {
						if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
						else Toast.methods.addToast('Successfully changed email address', 2000);
					});
				} else {
					Toast.methods.addToast('Field cannot be empty', 2000);
				}
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
				socket.emit('users.update', '582a0724023ecc015c0bef42', 'username', this.user.username, res => {
					if (res.status == 'error') Toast.methods.addToast(res.message, 2000);
					else Toast.methods.addToast('Successfully changed username', 2000);
				});
			}
		},
		components: { MainHeader, MainFooter }
	}
</script>

<style lang="scss" scoped>
	.container {
		padding: 25px;
	}
</style>
