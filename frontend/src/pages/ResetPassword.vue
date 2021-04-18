<template>
	<div>
		<metadata
			:title="mode === 'reset' ? 'Reset password' : 'Set password'"
		/>
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h1 id="title">
					{{ mode === "reset" ? "Reset" : "Set" }} your password
				</h1>

				<div id="steps">
					<p class="step" :class="{ selected: step === 1 }">1</p>
					<span class="divider"></span>
					<p class="step" :class="{ selected: step === 2 }">2</p>
					<span class="divider"></span>
					<p class="step" :class="{ selected: step === 3 }">3</p>
				</div>

				<transition name="steps-fade" mode="out-in">
					<!-- Step 1 -- Enter email address -->
					<div class="content-box" v-if="step === 1" :key="step">
						<h2 class="content-box-title">
							Enter your email address
						</h2>
						<p class="content-box-description">
							We will send a code to your email address to verify
							your identity.
						</p>

						<p class="content-box-optional-helper">
							<a href="#" @click="step = 2"
								>Already have a code?</a
							>
						</p>

						<div class="content-box-inputs">
							<div class="control is-grouped input-with-button">
								<p class="control is-expanded">
									<input
										class="input"
										type="email"
										placeholder="Enter email address here..."
										autofocus
										v-model="email"
										@keyup.enter="submitEmail()"
										@keypress="onInput('email')"
									/>
								</p>
								<p class="control">
									<a
										class="button is-info"
										href="#"
										@click="submitEmail()"
										><i
											class="material-icons icon-with-button"
											>mail</i
										>Request</a
									>
								</p>
							</div>
							<transition name="fadein-helpbox">
								<input-help-box
									:entered="validation.email.entered"
									:valid="validation.email.valid"
									:message="validation.email.message"
								/>
							</transition>
						</div>
					</div>

					<!-- Step 2 -- Enter code -->
					<div class="content-box" v-if="step === 2" :key="step">
						<h2 class="content-box-title">
							Enter the code sent to your email
						</h2>
						<p
							class="content-box-description"
							v-if="!this.hasEmailBeenSentAlready"
						>
							A code has been sent to
							<strong>{{ email }}.</strong>
						</p>

						<p class="content-box-optional-helper">
							<a
								href="#"
								@click="email ? submitEmail() : (step = 1)"
								>Request another code</a
							>
						</p>

						<div class="content-box-inputs">
							<div class="control is-grouped input-with-button">
								<p class="control is-expanded">
									<input
										class="input"
										type="text"
										placeholder="Enter code here..."
										autofocus
										v-model="code"
										@keyup.enter="verifyCode()"
									/>
								</p>
								<p class="control">
									<a
										class="button is-info"
										href="#"
										@click="verifyCode()"
										><i
											class="material-icons icon-with-button"
											>vpn_key</i
										>Verify</a
									>
								</p>
							</div>
						</div>
					</div>

					<!-- Step 3 -- Set new password -->
					<div class="content-box" v-if="step === 3" :key="step">
						<h2 class="content-box-title">Set a new password</h2>
						<p class="content-box-description">
							Create a new password for your account.
						</p>

						<div class="content-box-inputs">
							<p class="control is-expanded">
								<label for="new-password">New password</label>
								<input
									class="input"
									id="new-password"
									type="password"
									placeholder="Enter password here..."
									v-model="newPassword"
									@keypress="onInput('newPassword')"
								/>
							</p>

							<transition name="fadein-helpbox">
								<input-help-box
									:entered="validation.newPassword.entered"
									:valid="validation.newPassword.valid"
									:message="validation.newPassword.message"
								/>
							</transition>

							<p
								id="new-password-again-input"
								class="control is-expanded"
							>
								<label for="new-password-again"
									>New password again</label
								>
								<input
									class="input"
									id="new-password-again"
									type="password"
									placeholder="Enter password here..."
									v-model="newPasswordAgain"
									@keyup.enter="changePassword()"
									@keypress="onInput('newPasswordAgain')"
								/>
							</p>

							<transition name="fadein-helpbox">
								<input-help-box
									:entered="
										validation.newPasswordAgain.entered
									"
									:valid="validation.newPasswordAgain.valid"
									:message="
										validation.newPasswordAgain.message
									"
								/>
							</transition>

							<a
								id="change-password-button"
								class="button is-success"
								href="#"
								@click="changePassword()"
							>
								Change password</a
							>
						</div>
					</div>

					<div
						class="content-box reset-status-box"
						v-if="step === 4"
						:key="step"
					>
						<i class="material-icons success-icon">check_circle</i>
						<h2>Password successfully {{ mode }}</h2>
						<router-link
							class="button is-dark"
							href="#"
							to="/settings"
							><i class="material-icons icon-with-button">undo</i
							>Return to Settings</router-link
						>
					</div>

					<div
						class="content-box reset-status-box"
						v-if="step === 5"
						:key="step"
					>
						<i class="material-icons error-icon">error</i>
						<h2>
							Password {{ mode }} failed, please try again later
						</h2>
						<router-link
							class="button is-dark"
							href="#"
							to="/settings"
							><i class="material-icons icon-with-button">undo</i
							>Return to Settings</router-link
						>
					</div>
				</transition>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import Toast from "toasters";
import { mapGetters } from "vuex";

import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";
import InputHelpBox from "@/components/InputHelpBox.vue";

import validation from "@/validation";

export default {
	components: { MainHeader, MainFooter, InputHelpBox },
	props: {
		mode: {
			default: "reset",
			enum: ["reset", "set"],
			type: String
		}
	},
	data() {
		return {
			email: "",
			hasEmailBeenSentAlready: true,
			code: "",
			newPassword: "",
			newPasswordAgain: "",
			validation: {
				email: {
					entered: false,
					valid: false,
					message: "Please enter a valid email address."
				},
				newPassword: {
					entered: false,
					valid: false,
					message:
						"Include at least one lowercase letter, one uppercase letter, one number and one special character."
				},
				newPasswordAgain: {
					entered: false,
					valid: false,
					message: "This password must match."
				}
			},
			step: 1
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	watch: {
		email(value) {
			if (
				value.indexOf("@") !== value.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(value)
			) {
				this.validation.email.message =
					"Please enter a valid email address.";
				this.validation.email.valid = false;
			} else {
				this.validation.email.message = "Everything looks great!";
				this.validation.email.valid = true;
			}
		},
		newPassword(value) {
			this.checkPasswordMatch(value, this.newPasswordAgain);

			if (!validation.isLength(value, 6, 200)) {
				this.validation.newPassword.message =
					"Password must have between 6 and 200 characters.";
				this.validation.newPassword.valid = false;
			} else if (!validation.regex.password.test(value)) {
				this.validation.newPassword.message =
					"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
				this.validation.newPassword.valid = false;
			} else {
				this.validation.newPassword.message = "Everything looks great!";
				this.validation.newPassword.valid = true;
			}
		},
		newPasswordAgain(value) {
			this.checkPasswordMatch(this.newPassword, value);
		}
	},
	methods: {
		checkPasswordMatch(newPassword, newPasswordAgain) {
			if (newPasswordAgain !== newPassword) {
				this.validation.newPasswordAgain.message =
					"This password must match.";
				this.validation.newPasswordAgain.valid = false;
			} else {
				this.validation.newPasswordAgain.message =
					"Everything looks great!";
				this.validation.newPasswordAgain.valid = true;
			}
		},
		onInput(inputName) {
			this.validation[inputName].entered = true;
		},
		submitEmail() {
			if (
				this.email.indexOf("@") !== this.email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(this.email)
			)
				return new Toast("Invalid email format.");

			if (!this.email) return new Toast("Email cannot be empty");

			this.hasEmailBeenSentAlready = false;

			if (this.mode === "set") {
				return this.socket.dispatch("users.requestPassword", res => {
					new Toast(res.message);
					if (res.status === "success") this.step = 2;
				});
			}

			return this.socket.dispatch(
				"users.requestPasswordReset",
				this.email,
				res => {
					new Toast(res.message);
					if (res.status === "success") {
						this.code = ""; // in case: already have a code -> request another code
						this.step = 2;
					} else this.step = 5;
				}
			);
		},
		verifyCode() {
			if (!this.code) return new Toast("Code cannot be empty");

			return this.socket.dispatch(
				this.mode === "set"
					? "users.verifyPasswordCode"
					: "users.verifyPasswordResetCode",
				this.code,
				res => {
					new Toast(res.message);
					if (res.status === "success") this.step = 3;
				}
			);
		},
		changePassword() {
			if (
				this.validation.newPassword.valid &&
				!this.validation.newPasswordAgain.valid
			)
				return new Toast("Please ensure the passwords match.");

			if (!this.validation.newPassword.valid)
				return new Toast("Please enter a valid password.");

			return this.socket.dispatch(
				this.mode === "set"
					? "users.changePasswordWithCode"
					: "users.changePasswordWithResetCode",
				this.code,
				this.newPassword,
				res => {
					new Toast(res.message);
					if (res.status === "success") this.step = 4;
					else this.step = 5;
				}
			);
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.label {
		color: var(--light-grey-2);
	}

	.skip-step {
		border: 0;
	}
}

h1,
h2,
p {
	margin: 0;
}

.container {
	padding: 25px;

	#title {
		color: var(--black);
		font-size: 42px;
		text-align: center;
	}

	.reset-status-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 356px;

		h2 {
			margin-top: 10px;
			font-size: 21px;
			font-weight: 800;
			color: var(--black);
			text-align: center;
		}

		.success-icon {
			color: var(--green);
		}

		.error-icon {
			color: var(--red);
		}

		.success-icon,
		.error-icon {
			font-size: 125px;
		}

		.button {
			margin-top: 36px;
		}
	}
}

.control {
	margin-bottom: 2px !important;
}
</style>
