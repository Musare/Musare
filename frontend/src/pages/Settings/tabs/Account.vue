<template>
	<div class="content account-tab">
		<p class="control is-expanded">
			<label for="username">Username</label>
			<input
				class="input"
				id="username"
				type="text"
				placeholder="Username"
				v-model="modifiedUser.username"
				@blur="onInputBlur('username')"
			/>
		</p>
		<p
			class="help"
			v-if="validation.username.entered"
			:class="validation.username.valid ? 'is-success' : 'is-danger'"
		>
			{{ validation.username.message }}
		</p>
		<p class="control is-expanded">
			<label for="email">Email</label>
			<input
				class="input"
				id="email"
				type="text"
				placeholder="Email"
				v-if="modifiedUser.email"
				v-model="modifiedUser.email.address"
				@blur="onInputBlur('email')"
			/>
		</p>
		<p
			class="help"
			v-if="validation.email.entered"
			:class="validation.email.valid ? 'is-success' : 'is-danger'"
		>
			{{ validation.email.message }}
		</p>
		<button class="button is-primary" @click="saveChangesToAccount()">
			Save changes
		</button>
	</div>
</template>

<script>
import { mapState } from "vuex";
import Toast from "toasters";

import validation from "../../../validation";

export default {
	data() {
		return {
			validation: {
				username: {
					entered: false,
					valid: false,
					message: "Please enter a valid username."
				},
				email: {
					entered: false,
					valid: false,
					message: "Please enter a valid email address."
				}
			}
		};
	},
	computed: mapState({
		userId: state => state.user.auth.userId,
		originalUser: state => state.settings.originalUser,
		modifiedUser: state => state.settings.modifiedUser
	}),
	watch: {
		// prettier-ignore
		// eslint-disable-next-line func-names
		"user.username": function (value) {
		if (!validation.isLength(value, 2, 32)) {
			this.validation.username.message =
				"Username must have between 2 and 32 characters.";
			this.validation.username.valid = false;
		} else if (
			!validation.regex.azAZ09_.test(value) &&
			value !== this.originalUser.username // Sometimes a username pulled from GitHub won't succeed validation
		) {
				this.validation.username.message =
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.";
				this.validation.username.valid = false;
			} else {
				this.validation.username.message = "Everything looks great!";
				this.validation.username.valid = true;
			}
		},
		// prettier-ignore
		// eslint-disable-next-line func-names
		"user.email.address": function (value) {
			if (!validation.isLength(value, 3, 254)) {
				this.validation.email.message =
					"Email must have between 3 and 254 characters.";
				this.validation.email.valid = false;
			} else if (
				value.indexOf("@") !== value.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(value)
			) {
				this.validation.email.message = "Invalid Email format.";
				this.validation.email.valid = false;
			} else {
				this.validation.email.message = "Everything looks great!";
				this.validation.email.valid = true;
			}
		}
	},
	methods: {
		onInputBlur(inputName) {
			this[inputName].entered = true;
		},
		saveChangesToAccount() {
			if (this.modifiedUser.username !== this.originalUser.username)
				this.changeUsername();
			if (
				this.modifiedUser.email.address !==
				this.originalUser.email.address
			)
				this.changeEmail();
		},
		changeEmail() {
			const email = this.modifiedUser.email.address;
			if (!validation.isLength(email, 3, 254))
				return new Toast({
					content: "Email must have between 3 and 254 characters.",
					timeout: 8000
				});
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email)
			)
				return new Toast({
					content: "Invalid email format.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updateEmail",
				this.userId,
				email,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully changed email address",
							timeout: 4000
						});
						this.originalUser.email.address = email;
					}
				}
			);
		},
		changeUsername() {
			const { username } = this.modifiedUser;
			if (!validation.isLength(username, 2, 32))
				return new Toast({
					content: "Username must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.azAZ09_.test(username))
				return new Toast({
					content:
						"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updateUsername",
				this.userId,
				username,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully changed username",
							timeout: 4000
						});
						this.originalUser.username = username;
					}
				}
			);
		}
	}
};
</script>
