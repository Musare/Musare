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
				<input class="input is-danger" type="text" placeholder="Enter current password">
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
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	export default {
		data() {
			return {
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
					clearInterval(socketInterval);
				}
			}, 100);
		},
		components: { MainHeader, MainFooter },
	}
</script>

<style lang="scss" scoped>
	.container {
		padding: 25px;
	}
</style>
