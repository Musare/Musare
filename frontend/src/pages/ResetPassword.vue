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
					<div
						class="content-box"
						v-if="step === 1"
						v-bind:key="step"
					>
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
										@blur="onInputBlur('email')"
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
							<p
								class="help"
								v-if="validation.email.entered"
								:class="
									validation.email.valid
										? 'is-success'
										: 'is-danger'
								"
							>
								{{ validation.email.message }}
							</p>
						</div>
					</div>

					<!-- Step 2 -- Enter code -->
					<div
						class="content-box"
						v-if="step === 2"
						v-bind:key="step"
					>
						<h2 class="content-box-title">
							Enter the code sent to your email
						</h2>
						<p class="content-box-description">
							A code has been sent to <strong>email</strong>.
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
					<div
						class="content-box"
						v-if="step === 3"
						v-bind:key="step"
					>
						<h2 class="content-box-title">
							Set a new password
						</h2>
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
									@blur="onInputBlur('newPassword')"
								/>
							</p>
							<p
								class="help"
								v-if="validation.newPassword.entered"
								:class="
									validation.newPassword.valid
										? 'is-success'
										: 'is-danger'
								"
							>
								{{ validation.newPassword.message }}
							</p>

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
									@blur="onInputBlur('newPasswordAgain')"
								/>
							</p>
							<p
								class="help"
								v-if="validation.newPasswordAgain.entered"
								:class="
									validation.newPasswordAgain.valid
										? 'is-success'
										: 'is-danger'
								"
							>
								{{ validation.newPasswordAgain.message }}
							</p>

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
				</transition>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import Toast from "toasters";

import MainHeader from "../components/layout/MainHeader.vue";
import MainFooter from "../components/layout/MainFooter.vue";

import io from "../io";
import validation from "../validation";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			email: "",
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
					message: "Please enter a valid password."
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
	props: {
		mode: {
			default: "reset",
			enum: ["reset", "set"],
			type: String
		}
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	},
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
					"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.";
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
		onInputBlur(inputName) {
			this.validation[inputName].entered = true;
		},
		submitEmail() {
			if (
				this.email.indexOf("@") !== this.email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(this.email)
			)
				return new Toast({
					content: "Invalid email format.",
					timeout: 8000
				});

			if (!this.email)
				return new Toast({
					content: "Email cannot be empty",
					timeout: 8000
				});

			if (this.mode === "set") {
				return this.socket.emit("users.requestPassword", res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.step = 2;
					}
				});
			}

			return this.socket.emit(
				"users.requestPasswordReset",
				this.email,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.step = 2;
						this.code = ""; // in case: already have a code -> request another code
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
				this.mode === "set"
					? "users.verifyPasswordCode"
					: "users.verifyPasswordResetCode",
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
			if (
				this.validation.newPassword.valid &&
				!this.validation.newPasswordAgain.valid
			)
				return new Toast({
					content: "Please ensure the passwords match.",
					timeout: 8000
				});

			if (!this.validation.newPassword.valid)
				return new Toast({
					content: "Please enter a valid password.",
					timeout: 8000
				});

			return this.socket.emit(
				this.mode === "set"
					? "users.changePasswordWithCode"
					: "users.changePasswordWithResetCode",
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
@import "../styles/global.scss";

.night-mode {
	.label {
		color: #ddd;
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

.help {
	margin-bottom: 5px;
}

.container {
	padding: 25px;

	#title {
		color: #000;
		font-size: 42px;
		text-align: center;
	}

	#steps {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 50px;
		margin-top: 36px;

		.step {
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 100%;
			border: 1px solid $dark-grey;
			width: 50px;
			height: 50px;
			background-color: #fff;
			font-size: 30px;
			cursor: pointer;

			&.selected {
				background-color: $musare-blue;
				color: #fff;
				border: 0;
			}
		}

		.divider {
			display: flex;
			justify-content: center;
			width: 180px;
			height: 1px;
			background-color: $dark-grey;
		}
	}

	.content-box {
		margin-top: 90px;
		border-radius: 3px;
		background-color: #fff;
		border: 1px solid $dark-grey;
		width: 580px;
		padding: 40px;

		.content-box-title {
			font-size: 25px;
			color: #000;
		}

		.content-box-description {
			font-size: 14px;
			color: $dark-grey;
		}

		.content-box-optional-helper {
			margin-top: 15px;
			color: $musare-blue;
			text-decoration: underline;
			font-size: 16px;
		}

		.content-box-inputs {
			margin-top: 35px;

			.input-with-button {
				.button {
					width: 105px;
				}
			}

			label {
				font-size: 11px;
			}

			#change-password-button {
				margin-top: 36px;
				width: 175px;
			}
		}
	}
}

.steps-fade-enter-active,
.steps-fade-leave-active {
	transition: all 0.3s ease;
}

.steps-fade-enter,
.steps-fade-leave-to {
	opacity: 0;
}

.skip-step {
	background-color: #7e7e7e;
	color: $white;
}
</style>
