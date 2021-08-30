<template>
	<div>
		<page-metadata title="Register" v-if="isPage" />
		<div class="modal is-active">
			<div class="modal-background" @click="closeRegisterModal()" />
			<div class="modal-card">
				<header class="modal-card-head">
					<p class="modal-card-title">Register</p>
					<button
						v-if="!isPage"
						class="delete"
						@click="closeRegisterModal()"
					/>
				</header>
				<section class="modal-card-body">
					<!-- email address -->
					<p class="control">
						<label class="label">Email</label>
						<input
							v-model="email.value"
							class="input"
							type="email"
							placeholder="Email..."
							@keypress="
								onInput('email') &
									submitOnEnter(submitModal, $event)
							"
							@paste="onInput('email')"
							autofocus
						/>
					</p>
					<transition name="fadein-helpbox">
						<input-help-box
							:entered="email.entered"
							:valid="email.valid"
							:message="email.message"
						/>
					</transition>

					<!-- username -->
					<p class="control">
						<label class="label">Username</label>
						<input
							v-model="username.value"
							class="input"
							type="text"
							placeholder="Username..."
							@keypress="
								onInput('username') &
									submitOnEnter(submitModal, $event)
							"
							@paste="onInput('username')"
						/>
					</p>
					<transition name="fadein-helpbox">
						<input-help-box
							:entered="username.entered"
							:valid="username.valid"
							:message="username.message"
						/>
					</transition>

					<!-- password -->
					<p class="control">
						<label class="label">Password</label>
					</p>

					<div id="password-visibility-container">
						<input
							v-model="password.value"
							class="input"
							type="password"
							ref="password"
							placeholder="Password..."
							@keypress="
								onInput('password') &
									submitOnEnter(submitModal, $event)
							"
							@paste="onInput('password')"
						/>
						<a @click="togglePasswordVisibility()">
							<i class="material-icons">
								{{
									!password.visible
										? "visibility"
										: "visibility_off"
								}}
							</i>
						</a>
					</div>

					<transition name="fadein-helpbox">
						<input-help-box
							:valid="password.valid"
							:entered="password.entered"
							:message="password.message"
						/>
					</transition>

					<br />

					<p>
						By registering you agree to our
						<router-link to="/terms" @click="closeRegisterModal()">
							Terms of Service
						</router-link>
						&nbsp;and
						<router-link
							to="/privacy"
							@click="closeRegisterModal()"
						>
							Privacy Policy </router-link
						>.
					</p>
				</section>
				<footer class="modal-card-foot">
					<div id="actions">
						<a
							class="button is-primary"
							href="#"
							@click="submitModal()"
							>Register</a
						>
						<a
							class="button is-github"
							:href="apiDomain + '/auth/github/authorize'"
							@click="githubRedirect()"
						>
							<div class="icon">
								<img
									class="invert"
									src="/assets/social/github.svg"
								/>
							</div>
							&nbsp;&nbsp;Register with GitHub
						</a>
					</div>

					<p class="content-box-optional-helper">
						<router-link to="/login" v-if="isPage">
							Already have an account?
						</router-link>
						<a v-else href="#" @click="changeToLoginModal()">
							Already have an account?
						</a>
					</p>
				</footer>
			</div>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";
import Toast from "toasters";

import validation from "@/validation";
import InputHelpBox from "../InputHelpBox.vue";

export default {
	components: { InputHelpBox },
	data() {
		return {
			username: {
				value: "",
				valid: false,
				entered: false,
				message: "Only letters, numbers and underscores are allowed."
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
				visible: false,
				message:
					"Include at least one lowercase letter, one uppercase letter, one number and one special character."
			},
			recaptcha: {
				key: "",
				token: "",
				enabled: false
			},
			apiDomain: "",
			isPage: false
		};
	},
	watch: {
		// eslint-disable-next-line
		"username.value": function (value) {
			if (!validation.isLength(value, 2, 32)) {
				this.username.message =
					"Username must have between 2 and 32 characters.";
				this.username.valid = false;
			} else if (!validation.regex.azAZ09_.test(value)) {
				this.username.message =
					"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _.";
				this.username.valid = false;
			} else {
				this.username.message = "Everything looks great!";
				this.username.valid = true;
			}
		},
		// eslint-disable-next-line
		"email.value": function (value) {
			if (!validation.isLength(value, 3, 254)) {
				this.email.message =
					"Email must have between 3 and 254 characters.";
				this.email.valid = false;
			} else if (
				value.indexOf("@") !== value.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(value)
			) {
				this.email.message = "Invalid format.";
				this.email.valid = false;
			} else {
				this.email.message = "Everything looks great!";
				this.email.valid = true;
			}
		},
		// eslint-disable-next-line
		"password.value": function (value) {
			if (!validation.isLength(value, 6, 200)) {
				this.password.message =
					"Password must have between 6 and 200 characters.";
				this.password.valid = false;
			} else if (!validation.regex.password.test(value)) {
				this.password.message =
					"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
				this.password.valid = false;
			} else {
				this.password.message = "Everything looks great!";
				this.password.valid = true;
			}
		}
	},
	async mounted() {
		if (this.$route.path === "/register") this.isPage = true;

		this.apiDomain = await lofig.get("apiDomain");

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
		submitOnEnter: (cb, event) => {
			if (event.which === 13) cb();
		},
		togglePasswordVisibility() {
			if (this.$refs.password.type === "password") {
				this.$refs.password.type = "text";
				this.password.visible = true;
			} else {
				this.$refs.password.type = "password";
				this.password.visible = false;
			}
		},
		changeToLoginModal() {
			if (!this.isPage) {
				this.closeRegisterModal();
				this.openModal("login");
			}
		},
		closeRegisterModal() {
			if (!this.isPage) this.closeModal("register");
		},
		submitModal() {
			if (
				!this.username.valid ||
				!this.email.valid ||
				!this.password.valid
			)
				return new Toast("Please ensure all fields are valid.");

			return this.register({
				username: this.username.value,
				email: this.email.value,
				password: this.password.value,
				recaptchaToken: this.recaptcha.token
			})
				.then(res => {
					if (res.status === "success") window.location.href = "/";
				})
				.catch(err => new Toast(err.message));
		},
		onInput(inputName) {
			this[inputName].entered = true;
		},
		githubRedirect() {
			if (!this.isPage)
				localStorage.setItem("github_redirect", this.$route.path);
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"]),
		...mapActions("user/auth", ["register"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body,
	.modal-card-foot {
		background-color: var(--dark-grey-3);
	}

	.label,
	p:not(.help) {
		color: var(--light-grey-2);
	}
}

.control {
	margin-bottom: 2px !important;
}

.modal-card-foot {
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;

	.content-box-optional-helper {
		margin-top: 0;
	}
}

.button.is-github {
	background-color: var(--dark-grey-2);
	color: var(--white) !important;
}

.is-github:focus {
	background-color: var(--dark-grey-4);
}

.invert {
	filter: brightness(5);
}

#recaptcha {
	padding: 10px 0;
}

a {
	color: var(--primary-color);
}
</style>

<style lang="scss">
.grecaptcha-badge {
	z-index: 2000;
}
</style>
