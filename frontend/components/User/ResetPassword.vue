<template>
	<div>
		<metadata title="Reset password" />
		<main-header />
		<div class="container">
			<!--Implement Validation-->
			<h1>Step {{ step }}</h1>

			<label v-if="step === 1" class="label">Email Address</label>
			<div v-if="step === 1" class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="email"
						class="input"
						type="email"
						placeholder="The email address associated with your account"
					/>
				</p>
				<p class="control">
					<button class="button is-success" @click="submitEmail()">
						Request
					</button>
					<button
						v-if="step === 1"
						class="button is-default skip-step"
						@click="step = 2"
					>
						Skip this step
					</button>
				</p>
			</div>

			<label v-if="step === 2" class="label">Reset Code</label>
			<div v-if="step === 2" class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="code"
						class="input"
						type="text"
						placeholder="The reset code that was sent to your account's email address"
					/>
				</p>
				<p class="control">
					<button class="button is-success" v-on:click="verifyCode()">
						Verify reset code
					</button>
				</p>
			</div>

			<label v-if="step === 3" class="label">Change password</label>
			<div v-if="step === 3" class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="newPassword"
						class="input"
						type="password"
						placeholder="New password"
					/>
				</p>
				<p class="control">
					<button class="button is-success" @click="changePassword()">
						Change password
					</button>
				</p>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import Toast from "toasters";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

import io from "../../io";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			email: "",
			code: "",
			newPassword: "",
			step: 1
		};
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	},
	methods: {
		submitEmail() {
			if (!this.email)
				return new Toast({
					content: "Email cannot be empty",
					timeout: 8000
				});
			return this.socket.emit(
				"users.requestPasswordReset",
				this.email,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.step = 2;
					}
				}
			);
		},
		verifyCode() {
			if (!this.code)
				return new Toast({
					content: "Code cannot be empty",
					timeout: 8000
				});
			return this.socket.emit(
				"users.verifyPasswordResetCode",
				this.code,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.step = 3;
					}
				}
			);
		},
		changePassword() {
			if (!this.newPassword)
				return new Toast({
					content: "Password cannot be empty",
					timeout: 8000
				});
			return this.socket.emit(
				"users.changePasswordWithResetCode",
				this.code,
				this.newPassword,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.$router.go("/login");
					}
				}
			);
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.container {
	padding: 25px;
}

.skip-step {
	background-color: #7e7e7e;
	color: $white;
}
</style>
