<template>
	<modal
		title="Confirm Account Removal"
		class="confirm-account-removal-modal"
	>
		<template #body>
			<div id="steps">
				<p class="step" :class="{ selected: step === 1 }">1</p>
				<span class="divider"></span>
				<p class="step" :class="{ selected: step === 2 }">2</p>
				<span class="divider"></span>
				<p class="step" :class="{ selected: step === 3 }">3</p>
			</div>

			<div
				class="content-box"
				id="password-linked"
				v-if="isPasswordLinked && step === 1"
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

			<!-- check github api and see if access token still works: if it doesn't then the user will need to re-connect it -->

			<div class="content-box" v-if="isGithubLinked && step === 1">
				<h2 class="content-box-title">Verify GitHub</h2>
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
						&nbsp; Check GitHub Link
					</a>
				</div>
			</div>

			<div v-if="step === 2">
				DOWNLOAD A BACKUP OF YOUR DATa BEFORE ITS PERMENATNELY DELETED
			</div>

			<div class="content-box" id="step-3" v-if="step === 3">
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
			step: 1,
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
					if (res.status === "success") this.step = 3;
					else new Toast(res.message);
				}
			);
		},
		confirmGithubLink() {
			return this.socket.dispatch("users.confirmGithubLink", res => {
				console.log(res);
				if (res.status === "success") this.step = 3;
				else new Toast(res.message);
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

#step-3 .content-box-inputs {
	width: fit-content;
}
</style>
