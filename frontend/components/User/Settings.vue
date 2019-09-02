<template>
	<div>
		<metadata title="Settings" />
		<main-header />
		<div class="container">
			<!--Implement Validation-->
			<label class="label">Username</label>
			<div class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="user.username"
						class="input"
						type="text"
						placeholder="Change username"
					/>
					<!--Remove validation if it's their own without changing-->
				</p>
				<p class="control">
					<button class="button is-success" @click="changeUsername()">
						Save changes
					</button>
				</p>
			</div>
			<label class="label">Email</label>
			<div v-if="user.email" class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="user.email.address"
						class="input"
						type="text"
						placeholder="Change email address"
					/>
					<!--Remove validation if it's their own without changing-->
				</p>
				<p class="control is-expanded">
					<button class="button is-success" @click="changeEmail()">
						Save changes
					</button>
				</p>
			</div>
			<label v-if="password" class="label">Change Password</label>
			<div v-if="password" class="control is-grouped">
				<p class="control is-expanded has-icon has-icon-right">
					<input
						v-model="newPassword"
						class="input"
						type="password"
						placeholder="Change password"
					/>
				</p>
				<p class="control is-expanded">
					<button class="button is-success" @click="changePassword()">
						Change password
					</button>
				</p>
			</div>

			<label v-if="!password" class="label">Add password</label>
			<div v-if="!password" class="control is-grouped">
				<button
					v-if="passwordStep === 1"
					class="button is-success"
					@click="requestPassword()"
				>
					Request password email
				</button>
				<br />

				<p
					v-if="passwordStep === 2"
					class="control is-expanded has-icon has-icon-right"
				>
					<input
						v-model="passwordCode"
						class="input"
						type="text"
						placeholder="Code"
					/>
				</p>
				<p v-if="passwordStep === 2" class="control is-expanded">
					<button class="button is-success" v-on:click="verifyCode()">
						Verify code
					</button>
				</p>

				<p
					v-if="passwordStep === 3"
					class="control is-expanded has-icon has-icon-right"
				>
					<input
						v-model="setNewPassword"
						class="input"
						type="password"
						placeholder="New password"
					/>
				</p>
				<p v-if="passwordStep === 3" class="control is-expanded">
					<button class="button is-success" @click="setPassword()">
						Set password
					</button>
				</p>
			</div>
			<a
				v-if="passwordStep === 1 && !password"
				href="#"
				@click="passwordStep = 2"
				>Skip this step</a
			>

			<a
				v-if="!github"
				class="button is-github"
				:href="`${serverDomain}/auth/github/link`"
			>
				<div class="icon">
					<img class="invert" src="/assets/social/github.svg" />
				</div>
				&nbsp; Link GitHub to account
			</a>

			<button
				v-if="password && github"
				class="button is-danger"
				@click="unlinkPassword()"
			>
				Remove logging in with password
			</button>
			<button
				v-if="password && github"
				class="button is-danger"
				@click="unlinkGitHub()"
			>
				Remove logging in with GitHub
			</button>

			<br />
			<button
				class="button is-warning"
				style="margin-top: 30px;"
				@click="removeSessions()"
			>
				Log out everywhere
			</button>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState } from "vuex";

import { Toast } from "vue-roaster";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

import io from "../../io";
import validation from "../../validation";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			user: {},
			newPassword: "",
			password: false,
			github: false,
			setNewPassword: "",
			passwordStep: 1,
			passwordCode: "",
			serverDomain: ""
		};
	},
	computed: mapState({
		userId: state => state.user.auth.userId
	}),
	mounted() {
		lofig.get("serverDomain", res => {
			this.serverDomain = res;
		});

		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("users.findBySession", res => {
				if (res.status === "success") {
					this.user = res.data;
					this.password = this.user.password;
					this.github = this.user.github;
				} else {
					Toast.methods.addToast(
						"Your are currently not signed in",
						3000
					);
				}
			});
			this.socket.on("event:user.linkPassword", () => {
				this.password = true;
			});
			this.socket.on("event:user.linkGitHub", () => {
				this.github = true;
			});
			this.socket.on("event:user.unlinkPassword", () => {
				this.password = false;
			});
			this.socket.on("event:user.unlinkGitHub", () => {
				this.github = false;
			});
		});
	},
	methods: {
		changeEmail() {
			const email = this.user.email.address;
			if (!validation.isLength(email, 3, 254))
				return Toast.methods.addToast(
					"Email must have between 3 and 254 characters.",
					8000
				);
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email)
			)
				return Toast.methods.addToast("Invalid email format.", 8000);

			return this.socket.emit(
				"users.updateEmail",
				this.userId,
				email,
				res => {
					if (res.status !== "success")
						Toast.methods.addToast(res.message, 8000);
					else
						Toast.methods.addToast(
							"Successfully changed email address",
							4000
						);
				}
			);
		},
		changeUsername() {
			const { username } = this.user;
			if (!validation.isLength(username, 2, 32))
				return Toast.methods.addToast(
					"Username must have between 2 and 32 characters.",
					8000
				);
			if (!validation.regex.azAZ09_.test(username))
				return Toast.methods.addToast(
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.",
					8000
				);

			return this.socket.emit(
				"users.updateUsername",
				this.userId,
				username,
				res => {
					if (res.status !== "success")
						Toast.methods.addToast(res.message, 8000);
					else
						Toast.methods.addToast(
							"Successfully changed username",
							4000
						);
				}
			);
		},
		changePassword() {
			const { newPassword } = this;
			if (!validation.isLength(newPassword, 6, 200))
				return Toast.methods.addToast(
					"Password must have between 6 and 200 characters.",
					8000
				);
			if (!validation.regex.password.test(newPassword))
				return Toast.methods.addToast(
					"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.",
					8000
				);

			return this.socket.emit(
				"users.updatePassword",
				newPassword,
				res => {
					if (res.status !== "success")
						Toast.methods.addToast(res.message, 8000);
					else
						Toast.methods.addToast(
							"Successfully changed password",
							4000
						);
				}
			);
		},
		requestPassword() {
			return this.socket.emit("users.requestPassword", res => {
				Toast.methods.addToast(res.message, 8000);
				if (res.status === "success") {
					this.passwordStep = 2;
				}
			});
		},
		verifyCode() {
			if (!this.passwordCode)
				return Toast.methods.addToast("Code cannot be empty", 8000);
			return this.socket.emit(
				"users.verifyPasswordCode",
				this.passwordCode,
				res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === "success") {
						this.passwordStep = 3;
					}
				}
			);
		},
		setPassword() {
			const newPassword = this.setNewPassword;
			if (!validation.isLength(newPassword, 6, 200))
				return Toast.methods.addToast(
					"Password must have between 6 and 200 characters.",
					8000
				);
			if (!validation.regex.password.test(newPassword))
				return Toast.methods.addToast(
					"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.",
					8000
				);

			return this.socket.emit(
				"users.changePasswordWithCode",
				this.passwordCode,
				newPassword,
				res => {
					Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		unlinkPassword() {
			this.socket.emit("users.unlinkPassword", res => {
				Toast.methods.addToast(res.message, 8000);
			});
		},
		unlinkGitHub() {
			this.socket.emit("users.unlinkGitHub", res => {
				Toast.methods.addToast(res.message, 8000);
			});
		},
		removeSessions() {
			this.socket.emit(`users.removeSessions`, this.userId, res => {
				Toast.methods.addToast(res.message, 4000);
			});
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.container {
	padding: 25px;
}

a {
	color: $primary-color !important;
}
</style>
