<template>
	<main-header></main-header>
	<div class="container">
		<!--Implement Validation-->
		<h1>Step {{step}}</h1>


		<label class="label" v-if="step === 1">Email</label>
		<div class="control is-grouped" v-if="step === 1">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="email" placeholder="Email" v-model="email">
			</p>
			<p class="control">
				<button class="button is-success" @click="submitEmail()">Request</button>
			</p>
		</div>
		<button @click="step = 2" v-if="step === 1" class="button is-success">Skip this step</button>


		<label class="label" v-if="step === 2">Reset code (the code that was sent to your account email address)</label>
		<div class="control is-grouped" v-if="step === 2">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="text" placeholder="Reset code" v-model="code">
			</p>
			<p class="control">
				<button class="button is-success" @click="verifyCode()">Verify reset code</button>
			</p>
		</div>


		<label class="label" v-if="step === 3">Change password</label>
		<div class="control is-grouped" v-if="step === 3">
			<p class="control is-expanded has-icon has-icon-right">
				<input class="input" type="password" placeholder="New password" v-model="newPassword">
			</p>
			<p class="control">
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
				email: '',
				code: '',
				newPassword: '',
				step: 1
			}
		},
		ready: function() {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
			});
		},
		methods: {
			submitEmail: function () {
				if (!this.email) return Toast.methods.addToast('Email cannot be empty', 8000);
				this.socket.emit('users.requestPasswordReset', this.email, res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success') {
						this.step = 2;
					}
				});
			},
			verifyCode: function () {
				if (!this.code) return Toast.methods.addToast('Code cannot be empty', 8000);
				this.socket.emit('users.verifyPasswordResetCode', this.code, res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success') {
						this.step = 3;
					}
				});
			},
			changePassword: function () {
				if (!this.newPassword) return Toast.methods.addToast('Password cannot be empty', 8000);
				this.socket.emit('users.changePasswordWithResetCode', this.code, this.newPassword, res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success') {
						this.$router.go('/login');
					}
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
