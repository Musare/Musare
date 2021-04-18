<template>
	<modal
		title="Confirm Account Removal"
		class="confirm-account-removal-modal"
	>
		<template #body>
			<div id="steps">
				<p
					class="step"
					:class="{ selected: step === 'confirm-identity' }"
				>
					1
				</p>
				<span class="divider"></span>
				<p
					class="step"
					:class="{
						selected:
							(isPasswordLinked && step === 'export-data') ||
							step === 'relink-github'
					}"
				>
					2
				</p>
				<span class="divider"></span>
				<p
					class="step"
					:class="{
						selected:
							(isPasswordLinked && step === 'remove-account') ||
							step === 'export-data'
					}"
				>
					3
				</p>
				<span class="divider" v-if="!isPasswordLinked"></span>
				<p
					class="step"
					:class="{ selected: step === 'remove-account' }"
					v-if="!isPasswordLinked"
				>
					4
				</p>
			</div>

			<div
				class="content-box"
				id="password-linked"
				v-if="step === 'confirm-identity' && isPasswordLinked"
			>
				<h2 class="content-box-title">
					Enter your password
				</h2>
				<p class="content-box-description">
					We will send a code to your email address to verify your
					identity.
				</p>

				<div class="content-box-inputs">
					<div class="control is-grouped input-with-button">
						<div id="password-container">
							<input
								class="input"
								type="password"
								placeholder="Enter password here..."
								autofocus
								ref="password"
								v-model="password.value"
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
						<p class="control">
							<a
								class="button is-info"
								href="#"
								@click="confirmPasswordMatch()"
								>Check</a
							>
						</p>
					</div>
				</div>

				<router-link id="forgot-password" href="#" to="/reset_password">
					Forgot password?
				</router-link>
			</div>

			<div
				class="content-box"
				v-else-if="isGithubLinked && step === 'confirm-identity'"
			>
				<h2 class="content-box-title">Verify your GitHub</h2>
				<p class="content-box-description">
					Check your GitHub account is still linked in order to remove
					your account.
				</p>

				<div class="content-box-inputs">
					<a class="button is-github" @click="confirmGithubLink()">
						<div class="icon">
							<img
								class="invert"
								src="/assets/social/github.svg"
							/>
						</div>
						&nbsp; Check GitHub is linked
					</a>
				</div>
			</div>

			<div class="content-box" v-if="step === 'relink-github'">
				<h2 class="content-box-title">Re-link GitHub</h2>
				<p class="content-box-description">
					Re-link your GitHub account in order to verify your
					identity.
				</p>

				<div class="content-box-inputs">
					<a
						class="button is-github"
						:href="`${apiDomain}/auth/github/link`"
					>
						<div class="icon">
							<img
								class="invert"
								src="/assets/social/github.svg"
							/>
						</div>
						&nbsp; Relink GitHub to account
					</a>
				</div>
			</div>

			<div v-if="step === 'export-data'">
				DOWNLOAD A BACKUP OF YOUR DATa BEFORE ITS PERMENATNELY DELETED
			</div>

			<div
				class="content-box"
				id="remove-account-container"
				v-if="step === 'remove-account'"
			>
				<h2 class="content-box-title">Remove Account</h2>
				<p class="content-box-description">
					There is no going back after confirming account removal.
				</p>

				<div class="content-box-inputs">
					<confirm placement="right" @confirm="remove()">
						<button class="button">
							<i class="material-icons">cancel</i>
							&nbsp;Remove Account
						</button>
					</confirm>
				</div>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

import Toast from "toasters";

import Confirm from "@/components/Confirm.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, Confirm },
	data() {
		return {
			step: "confirm-identity",
			apiDomain: "",
			password: {
				value: "",
				visible: false
			}
		};
	},
	computed: mapGetters({
		isPasswordLinked: "settings/isPasswordLinked",
		isGithubLinked: "settings/isGithubLinked",
		socket: "websockets/getSocket"
	}),
	async mounted() {
		this.apiDomain = await lofig.get("apiDomain");
	},
	methods: {
		togglePasswordVisibility() {
			if (this.$refs.password.type === "password") {
				this.$refs.password.type = "text";
				this.password.visible = true;
			} else {
				this.$refs.password.type = "password";
				this.password.visible = false;
			}
		},
		confirmPasswordMatch() {
			return this.socket.dispatch(
				"users.confirmPasswordMatch",
				this.password.value,
				res => {
					if (res.status === "success") this.step = "remove-account";
					else new Toast(res.message);
				}
			);
		},
		confirmGithubLink() {
			return this.socket.dispatch("users.confirmGithubLink", res => {
				if (res.status === "success") {
					if (res.data.linked) this.step = "remove-account";
					else {
						new Toast(
							`Your GitHub account isn't linked. Please re-link your account and try again.`
						);
						this.step = "relink-github";
						localStorage.setItem(
							"github_redirect",
							window.location.pathname + window.location.search
						);
					}
				} else new Toast(res.message);
			});
		},
		remove() {
			return this.socket.dispatch("users.remove", res => {
				if (res.status === "success") {
					return this.socket.dispatch("users.logout", () => {
						return lofig.get("cookie").then(cookie => {
							document.cookie = `${cookie.SIDname}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
							this.closeModal({
								sector: "settings",
								modal: "confirmAccountRemoval"
							});
							return window.location.reload();
						});
					});
				}

				return new Toast(res.message);
			});
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>

<style lang="scss">
.confirm-account-removal-modal {
	.modal-card {
		width: 650px;
	}
}
</style>

<style lang="scss" scoped>
h2 {
	margin: 0;
}

.content-box {
	margin-top: 20px;
	max-width: unset;
}

#steps {
	margin-top: 0;
}

#password-linked {
	#password-container {
		display: flex;
		align-items: center;
		width: 100%; // new

		a {
			width: 0;
			margin-left: -30px;
			z-index: 0;
			top: 2px;
			position: relative;
			color: var(--light-grey-1);
		}
	}

	> a {
		color: var(--primary-color);
	}
}

.control {
	margin-bottom: 0 !important;
}

#remove-account-container .content-box-inputs {
	width: fit-content;
}
</style>
