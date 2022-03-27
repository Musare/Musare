<template>
	<div>
		<modal
			title="Login"
			class="login-modal"
			:size="'slim'"
			@closed="closeLoginModal()"
		>
			<template #body>
				<form>
					<!-- email address -->
					<p class="control">
						<label class="label">Username/Email</label>
						<input
							v-model="email"
							class="input"
							type="email"
							placeholder="Username/Email..."
							@keypress="submitOnEnter(submitModal, $event)"
						/>
					</p>

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
							@input="checkForAutofill($event)"
							@keypress="submitOnEnter(submitModal, $event)"
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

					<p class="content-box-optional-helper">
						<router-link
							id="forgot-password"
							to="/reset_password"
							@click="closeLoginModal()"
						>
							Forgot password?
						</router-link>
					</p>

					<br />
					<p>
						By logging in you agree to our
						<router-link to="/terms" @click="closeLoginModal()">
							Terms of Service
						</router-link>
						and
						<router-link to="/privacy" @click="closeLoginModal()">
							Privacy Policy</router-link
						>.
					</p>
				</form>
			</template>
			<template #footer>
				<div id="actions">
					<button class="button is-primary" @click="submitModal()">
						Login
					</button>
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
						&nbsp;&nbsp;Login with GitHub
					</a>
				</div>

				<p
					v-if="!registrationDisabled"
					class="content-box-optional-helper"
				>
					<a @click="changeToRegisterModal()">
						Don't have an account?
					</a>
				</p>
			</template>
		</modal>
	</div>
</template>

<script>
import { mapActions } from "vuex";

import Toast from "toasters";
import Modal from "../Modal.vue";

export default {
	components: {
		Modal
	},
	data() {
		return {
			email: "",
			password: {
				value: "",
				visible: false
			},
			apiDomain: "",
			registrationDisabled: false
		};
	},
	async mounted() {
		this.apiDomain = await lofig.get("backend.apiDomain");
		this.registrationDisabled = await lofig.get(
			"siteSettings.registrationDisabled"
		);
	},
	methods: {
		checkForAutofill(event) {
			if (
				event.target.value !== "" &&
				event.inputType === undefined &&
				event.data === undefined &&
				event.dataTransfer === undefined &&
				event.isComposing === undefined
			)
				this.submitModal();
		},
		submitOnEnter(cb, event) {
			if (event.which === 13) cb();
		},
		submitModal() {
			this.login({
				email: this.email,
				password: this.password.value
			})
				.then(res => {
					if (res.status === "success") window.location.reload();
				})
				.catch(err => new Toast(err.message));
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
		changeToRegisterModal() {
			this.closeLoginModal();
			this.openModal("register");
		},
		closeLoginModal() {
			this.closeModal("login");
		},
		githubRedirect() {
			localStorage.setItem("github_redirect", this.$route.path);
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"]),
		...mapActions("user/auth", ["login"])
	}
};
</script>

<style lang="less" scoped>
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
.is-primary:focus {
	background-color: var(--primary-color) !important;
}

.invert {
	filter: brightness(5);
}
</style>
