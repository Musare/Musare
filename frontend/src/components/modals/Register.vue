<template>
	<div class="modal is-active">
		<div
			class="modal-background"
			@click="
				closeModal({
					sector: 'header',
					modal: 'register'
				})
			"
		/>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Register</p>
				<button
					class="delete"
					@click="
						closeModal({
							sector: 'header',
							modal: 'register'
						})
					"
				/>
			</header>
			<section class="modal-card-body">
				<p class="control">
					<label class="label">Email</label>
					<input
						v-model="email.value"
						class="input"
						type="email"
						placeholder="Email..."
						@blur="onInputBlur('email')"
						autofocus
					/>
				</p>
				<transition name="fadein-helpbox">
					<input-help-box
						v-if="email.entered"
						:valid="email.valid"
						:message="email.message"
					></input-help-box>
				</transition>

				<p class="control">
					<label class="label">Username</label>
					<input
						v-model="username.value"
						class="input"
						type="text"
						placeholder="Username..."
						@blur="onInputBlur('username')"
					/>
				</p>
				<transition name="fadein-helpbox">
					<input-help-box
						v-if="username.entered"
						:valid="username.valid"
						:message="username.message"
					></input-help-box>
				</transition>

				<p class="control">
					<label class="label">Password</label>
					<input
						v-model="password.value"
						class="input"
						type="password"
						placeholder="Password..."
						@blur="onInputBlur('password')"
						@keypress="$parent.submitOnEnter(submitModal, $event)"
					/>
				</p>
				<transition name="fadein-helpbox">
					<input-help-box
						v-if="password.entered"
						:valid="password.valid"
						:message="password.message"
					></input-help-box>
				</transition>

				<br />

				<p>
					By logging in/registering you agree to our
					<router-link to="/terms"> Terms of Service </router-link
					>&nbsp;and
					<router-link to="/privacy"> Privacy Policy </router-link>.
				</p>
			</section>
			<footer class="modal-card-foot">
				<a class="button is-primary" href="#" @click="submitModal()"
					>Submit</a
				>
				<a
					class="button is-github"
					:href="serverDomain + '/auth/github/authorize'"
					@click="githubRedirect()"
				>
					<div class="icon">
						<img class="invert" src="/assets/social/github.svg" />
					</div>
					&nbsp;&nbsp;Register with GitHub
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";
import Toast from "toasters";

import InputHelpBox from "../ui/InputHelpBox.vue";

import validation from "../../validation";

export default {
	components: { InputHelpBox },
	data() {
		return {
			username: {
				value: "",
				valid: false,
				entered: false,
				message: "Please enter a valid username."
			},
			email: {
				value: "",
				valid: false,
				entered: false,
				message: "Please enter a valid email address."
			},
			password: {
				value: "",
				valid: false,
				entered: false,
				message: "Please enter a valid password."
			},
			recaptcha: {
				key: "",
				token: "",
				enabled: false
			},
			serverDomain: ""
		};
	},
	watch: {
		// eslint-disable-next-line
		"username.value": function(value) {
			if (!validation.isLength(value, 2, 32)) {
				this.username.message =
					"Username must have between 2 and 32 characters.";
				this.username.valid = false;
			} else if (!validation.regex.azAZ09_.test(value)) {
				this.username.message =
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.";
				this.username.valid = false;
			} else {
				this.username.message = "Everything looks great!";
				this.username.valid = true;
			}
		},
		// eslint-disable-next-line
		"email.value": function(value) {
			if (!validation.isLength(value, 3, 254)) {
				this.email.message =
					"Email must have between 3 and 254 characters.";
				this.email.valid = false;
			} else if (
				value.indexOf("@") !== value.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(value)
			) {
				this.email.message = "Invalid Email format.";
				this.email.valid = false;
			} else {
				this.email.message = "Everything looks great!";
				this.email.valid = true;
			}
		},
		// eslint-disable-next-line
		"password.value": function(value) {
			if (!validation.isLength(value, 6, 200)) {
				this.password.message =
					"Password must have between 6 and 200 characters.";
				this.password.valid = false;
			} else if (!validation.regex.password.test(value)) {
				this.password.message =
					"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.";
				this.password.valid = false;
			} else {
				this.password.message = "Everything looks great!";
				this.password.valid = true;
			}
		}
	},
	mounted() {
		lofig.get("serverDomain").then(serverDomain => {
			this.serverDomain = serverDomain;
		});

		lofig.get("recaptcha").then(obj => {
			this.recaptcha.enabled = obj.enabled;
			if (obj.enabled === true) {
				this.recaptcha.key = obj.key;

				const recaptchaScript = document.createElement("script");
				recaptchaScript.onload = () => {
					grecaptcha.ready(() => {
						grecaptcha
							.execute(this.recaptcha.key, { action: "login" })
							.then(token => {
								this.recaptcha.token = token;
							});
					});
				};

				recaptchaScript.setAttribute(
					"src",
					`https://www.google.com/recaptcha/api.js?render=${this.recaptcha.key}`
				);
				document.head.appendChild(recaptchaScript);
			}
		});
	},
	methods: {
		submitModal() {
			if (
				!this.username.valid ||
				!this.email.valid ||
				!this.password.valid
			)
				return new Toast({
					content: "Please ensure all fields are valid.",
					timeout: 5000
				});

			return this.register({
				username: this.username.value,
				email: this.email.value,
				password: this.password.value,
				recaptchaToken: this.recaptcha.token
			})
				.then(res => {
					if (res.status === "success") window.location.href = "/";
				})
				.catch(
					err => new Toast({ content: err.message, timeout: 5000 })
				);
		},
		onInputBlur(inputName) {
			this[inputName].entered = true;
		},
		githubRedirect() {
			localStorage.setItem("github_redirect", this.$route.path);
		},
		...mapActions("modalVisibility", ["closeModal"]),
		...mapActions("user/auth", ["register"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body,
	.modal-card-foot {
		background-color: $night-mode-bg-secondary;
	}

	.label,
	p:not(.help) {
		color: $night-mode-text;
	}
}

.button.is-github {
	background-color: $dark-grey-2;
	color: $white !important;
}

.is-github:focus {
	background-color: $dark-grey-3;
}
.is-primary:focus {
	background-color: #028bca !important;
}

.invert {
	filter: brightness(5);
}

#recaptcha {
	padding: 10px 0;
}

a {
	color: $primary-color;
}
</style>

<style lang="scss">
@import "../../styles/global.scss";

.grecaptcha-badge {
	z-index: 2000;
}
</style>
