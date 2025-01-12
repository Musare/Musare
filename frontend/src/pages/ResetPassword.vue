<script setup lang="ts">
import { defineAsyncComponent, ref, watch, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useUserAuthStore } from "@/stores/userAuth";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);

const userAuthStore = useUserAuthStore();
const { email: accountEmail } = storeToRefs(userAuthStore);

const { socket } = useWebsocketsStore();

const code = ref("");
const inputs = ref({
	email: {
		value: "",
		hasBeenSentAlready: true,
		entered: false,
		valid: false,
		message: "Please enter a valid email address."
	},
	password: {
		value: "",
		visible: false,
		entered: false,
		valid: false,
		message:
			"Include at least one lowercase letter, one uppercase letter, one number and one special character."
	},
	passwordAgain: {
		value: "",
		visible: false,
		entered: false,
		valid: false,
		message: "This password must match."
	}
});
const step = ref(1);
const inputElements = ref([]);

const togglePasswordVisibility = input => {
	if (inputElements.value[input].type === "password") {
		inputElements.value[input].type = "text";
		inputs.value[input].visible = true;
	} else {
		inputElements.value[input].type = "password";
		inputs.value[input].visible = false;
	}
};

const checkPasswordMatch = (pass, passAgain) => {
	if (passAgain !== pass) {
		inputs.value.passwordAgain.message = "This password must match.";
		inputs.value.passwordAgain.valid = false;
	} else {
		inputs.value.passwordAgain.message = "Everything looks great!";
		inputs.value.passwordAgain.valid = true;
	}
};

const onInput = inputName => {
	inputs.value[inputName].entered = true;
};

const submitEmail = () => {
	if (
		inputs.value.email.value.indexOf("@") !==
			inputs.value.email.value.lastIndexOf("@") ||
		!validation.regex.emailSimple.test(inputs.value.email.value)
	)
		return new Toast("Invalid email format.");

	if (!inputs.value.email.value) return new Toast("Email cannot be empty");

	inputs.value.email.hasBeenSentAlready = false;

	return socket.dispatch(
		"users.requestPasswordReset",
		inputs.value.email.value,
		res => {
			new Toast(res.message);
			if (res.status === "success") {
				code.value = ""; // in case: already have a code -> request another code
				step.value = 2;
			} else step.value = 5;
		}
	);
};

const verifyCode = () => {
	if (!code.value) return new Toast("Code cannot be empty");

	return socket.dispatch("users.verifyPasswordResetCode", code.value, res => {
		new Toast(res.message);
		if (res.status === "success") step.value = 3;
	});
};

const changePassword = () => {
	if (inputs.value.password.valid && !inputs.value.passwordAgain.valid)
		return new Toast("Please ensure the passwords match.");

	if (!inputs.value.password.valid)
		return new Toast("Please enter a valid password.");

	return socket.dispatch(
		"users.changePasswordWithResetCode",
		code.value,
		inputs.value.password.value,
		res => {
			new Toast(res.message);
			if (res.status === "success") step.value = 4;
			else step.value = 5;
		}
	);
};

watch(
	() => inputs.value.email.value,
	value => {
		if (!value) return;

		if (
			value.indexOf("@") !== value.lastIndexOf("@") ||
			!validation.regex.emailSimple.test(value)
		) {
			inputs.value.email.message = "Please enter a valid email address.";
			inputs.value.email.valid = false;
		} else {
			inputs.value.email.message = "Everything looks great!";
			inputs.value.email.valid = true;
		}
	}
);
watch(
	() => inputs.value.password.value,
	value => {
		if (!value) return;

		checkPasswordMatch(value, inputs.value.passwordAgain.value);

		if (!validation.isLength(value, 6, 200)) {
			inputs.value.password.message =
				"Password must have between 6 and 200 characters.";
			inputs.value.password.valid = false;
		} else if (!validation.regex.password.test(value)) {
			inputs.value.password.message =
				"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
			inputs.value.password.valid = false;
		} else {
			inputs.value.password.message = "Everything looks great!";
			inputs.value.password.valid = true;
		}
	}
);
watch(
	() => inputs.value.passwordAgain.value,
	value => {
		if (!value) return;

		checkPasswordMatch(inputs.value.password.value, value);
	}
);

onMounted(() => {
	inputs.value.email.value = accountEmail.value;
});
</script>

<template>
	<div>
		<page-metadata title="Reset password" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h1 id="title" class="has-text-centered page-title">
					Reset your password
				</h1>

				<div id="steps">
					<p class="step" :class="{ selected: step === 1 }">1</p>
					<span class="divider"></span>
					<p class="step" :class="{ selected: step === 2 }">2</p>
					<span class="divider"></span>
					<p class="step" :class="{ selected: step === 3 }">3</p>
				</div>

				<div class="content-box-wrapper">
					<transition-group name="steps-fade" mode="out-in">
						<div class="content-box">
							<!-- Step 1 -- Enter email address -->
							<div v-if="step === 1" key="1">
								<h2 class="content-box-title">
									Enter your email address
								</h2>
								<p class="content-box-description">
									We will send a code to your email address to
									verify your identity.
								</p>

								<p class="content-box-optional-helper">
									<a @click="step = 2"
										>Already have a code?</a
									>
								</p>

								<div class="content-box-inputs">
									<div
										class="control is-grouped input-with-button"
									>
										<p class="control is-expanded">
											<input
												class="input"
												type="email"
												autocomplete="username"
												:ref="
													el =>
														(inputElements[
															'email'
														] = el)
												"
												placeholder="Enter email address here..."
												autofocus
												v-model="inputs.email.value"
												@keyup.enter="submitEmail()"
												@keypress="onInput('email')"
												@paste="onInput('email')"
											/>
										</p>
										<p class="control">
											<button
												class="button is-info"
												@click="submitEmail()"
											>
												<i
													class="material-icons icon-with-button"
													>mail</i
												>Request
											</button>
										</p>
									</div>
									<transition name="fadein-helpbox">
										<input-help-box
											:entered="inputs.email.entered"
											:valid="inputs.email.valid"
											:message="inputs.email.message"
										/>
									</transition>
								</div>
							</div>

							<!-- Step 2 -- Enter code -->
							<div v-if="step === 2" key="2">
								<h2 class="content-box-title">
									Enter the code sent to your email
								</h2>
								<p
									class="content-box-description"
									v-if="!inputs.email.hasBeenSentAlready"
								>
									A code has been sent to
									<strong>{{ inputs.email.value }}.</strong>
								</p>

								<p class="content-box-optional-helper">
									<a
										@click="
											inputs.email.value
												? submitEmail()
												: (step = 1)
										"
										>Request another code</a
									>
								</p>

								<div class="content-box-inputs">
									<div
										class="control is-grouped input-with-button"
									>
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
											<button
												class="button is-info"
												@click="verifyCode()"
											>
												<i
													class="material-icons icon-with-button"
													>vpn_key</i
												>Verify
											</button>
										</p>
									</div>
								</div>
							</div>

							<!-- Step 3 -- Set new password -->
							<div v-if="step === 3" key="3">
								<h2 class="content-box-title">
									Set a new password
								</h2>
								<p class="content-box-description">
									Create a new password for your account.
								</p>

								<div class="content-box-inputs">
									<p class="control is-expanded">
										<label for="new-password"
											>New password</label
										>
									</p>

									<div id="password-visibility-container">
										<input
											class="input"
											id="new-password"
											type="password"
											autocomplete="new-password"
											:ref="
												el =>
													(inputElements['password'] =
														el)
											"
											placeholder="Enter password here..."
											v-model="inputs.password.value"
											@keypress="onInput('password')"
											@paste="onInput('password')"
										/>
										<a
											@click="
												togglePasswordVisibility(
													'password'
												)
											"
										>
											<i class="material-icons">
												{{
													!inputs.password.visible
														? "visibility"
														: "visibility_off"
												}}
											</i>
										</a>
									</div>

									<transition name="fadein-helpbox">
										<input-help-box
											:entered="inputs.password.entered"
											:valid="inputs.password.valid"
											:message="inputs.password.message"
										/>
									</transition>

									<p
										id="new-password-again-input"
										class="control is-expanded"
									>
										<label for="new-password-again"
											>New password again</label
										>
									</p>

									<div id="password-visibility-container">
										<input
											class="input"
											id="new-password-again"
											type="password"
											autocomplete="new-password"
											:ref="
												el =>
													(inputElements[
														'passwordAgain'
													] = el)
											"
											placeholder="Enter password here..."
											v-model="inputs.passwordAgain.value"
											@keyup.enter="changePassword()"
											@keypress="onInput('passwordAgain')"
											@paste="onInput('passwordAgain')"
										/>
										<a
											@click="
												togglePasswordVisibility(
													'passwordAgain'
												)
											"
										>
											<i class="material-icons">
												{{
													!inputs.passwordAgain
														.visible
														? "visibility"
														: "visibility_off"
												}}
											</i>
										</a>
									</div>

									<transition name="fadein-helpbox">
										<input-help-box
											:entered="
												inputs.passwordAgain.entered
											"
											:valid="inputs.passwordAgain.valid"
											:message="
												inputs.passwordAgain.message
											"
										/>
									</transition>

									<button
										id="change-password-button"
										class="button is-success"
										@click="changePassword()"
									>
										Change password
									</button>
								</div>
							</div>

							<div
								class="reset-status-box"
								v-if="step === 4"
								key="4"
							>
								<i class="material-icons success-icon"
									>check_circle</i
								>
								<h2>Password successfully reset</h2>
								<router-link
									class="button is-dark"
									to="/settings"
									><i class="material-icons icon-with-button"
										>undo</i
									>Return to Settings</router-link
								>
							</div>

							<div
								class="reset-status-box"
								v-if="step === 5"
								key="5"
							>
								<i class="material-icons error-icon">error</i>
								<h2>
									Password reset failed, please try again
									later
								</h2>
								<router-link
									class="button is-dark"
									to="/settings"
									><i class="material-icons icon-with-button"
										>undo</i
									>Return to Settings</router-link
								>
							</div>
						</div>
					</transition-group>
				</div>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<style lang="less" scoped>
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

.content-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.container {
	padding: 25px;

	#title {
		color: var(--black);
		font-size: 42px;
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
			color: var(--dark-red);
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
