<template>
	<div>
		<page-metadata title="Login" v-if="isPage" />
		<div class="modal is-active">
			<div class="modal-background" @click="closeLoginModal()" />
			<div class="modal-card">
				<header class="modal-card-head">
					<p class="modal-card-title">Login</p>
					<button
						v-if="!isPage"
						class="delete"
						@click="closeLoginModal()"
					/>
				</header>

				<section class="modal-card-body">
					<form>
						<!-- email address -->
						<p class="control">
							<label class="label">Email</label>
							<input
								v-model="email"
								class="input"
								type="email"
								placeholder="Email..."
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
								href="#"
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
							<router-link
								to="/privacy"
								@click="closeLoginModal()"
							>
								Privacy Policy</router-link
							>.
						</p>
					</form>
				</section>

				<footer class="modal-card-foot">
					<div id="actions">
						<a
							class="button is-primary"
							href="#"
							@click="submitModal()"
							>Login</a
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
							&nbsp;&nbsp;Login with GitHub
						</a>
					</div>

					<p class="content-box-optional-helper">
						<router-link to="/register" v-if="isPage">
							Don't have an account?
						</router-link>
						<a v-else href="#" @click="changeToRegisterModal()">
							Don't have an account?
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

export default {
	data() {
		return {
			email: "",
			password: {
				value: "",
				visible: false
			},
			apiDomain: "",
			isPage: false
		};
	},
	async mounted() {
		this.apiDomain = await lofig.get("apiDomain");

		if (this.$route.path === "/login") this.isPage = true;
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
			if (!this.isPage) {
				this.closeLoginModal();
				this.openModal("register");
			}
		},
		closeLoginModal() {
			if (!this.isPage) this.closeModal("login");
		},
		githubRedirect() {
			if (!this.isPage)
				localStorage.setItem("github_redirect", this.$route.path);
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"]),
		...mapActions("user/auth", ["login"])
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
