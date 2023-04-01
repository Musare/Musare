<script setup lang="ts">
import { defineAsyncComponent, ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import validation from "@/validation";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);

const route = useRoute();

const username = ref({
	value: "",
	valid: false,
	entered: false,
	message: "Only letters, numbers and underscores are allowed."
});
const email = ref({
	value: "",
	valid: false,
	entered: false,
	message: "Please enter a valid email address."
});
const password = ref({
	value: "",
	valid: false,
	entered: false,
	visible: false,
	message:
		"Include at least one lowercase letter, one uppercase letter, one number and one special character."
});
const recaptchaToken = ref("");
const passwordElement = ref();

const { register } = useUserAuthStore();

const configStore = useConfigStore();
const { openModal, closeCurrentModal } = useModalsStore();

const submitModal = () => {
	if (!username.value.valid || !email.value.valid || !password.value.valid)
		return new Toast("Please ensure all fields are valid.");

	return register({
		username: username.value.value,
		email: email.value.value,
		password: password.value.value,
		recaptchaToken: recaptchaToken.value
	})
		.then((res: any) => {
			if (res.status === "success") window.location.reload();
		})
		.catch(err => new Toast(err.message));
};

const togglePasswordVisibility = () => {
	if (passwordElement.value.type === "password") {
		passwordElement.value.type = "text";
		password.value.visible = true;
	} else {
		passwordElement.value.type = "password";
		password.value.visible = false;
	}
};

const changeToLoginModal = () => {
	closeCurrentModal();
	openModal("login");
};

const githubRedirect = () => {
	localStorage.setItem("github_redirect", route.path);
};

watch(
	() => username.value.value,
	value => {
		username.value.entered = true;
		if (!validation.isLength(value, 2, 32)) {
			username.value.message =
				"Username must have between 2 and 32 characters.";
			username.value.valid = false;
		} else if (!validation.regex.azAZ09_.test(value)) {
			username.value.message =
				"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _.";
			username.value.valid = false;
		} else if (value.replaceAll(/[_]/g, "").length === 0) {
			username.value.message =
				"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number.";
			username.value.valid = false;
		} else {
			username.value.message = "Everything looks great!";
			username.value.valid = true;
		}
	}
);
watch(
	() => email.value.value,
	value => {
		email.value.entered = true;
		if (!validation.isLength(value, 3, 254)) {
			email.value.message =
				"Email must have between 3 and 254 characters.";
			email.value.valid = false;
		} else if (
			value.indexOf("@") !== value.lastIndexOf("@") ||
			!validation.regex.emailSimple.test(value)
		) {
			email.value.message = "Invalid format.";
			email.value.valid = false;
		} else {
			email.value.message = "Everything looks great!";
			email.value.valid = true;
		}
	}
);
watch(
	() => password.value.value,
	value => {
		password.value.entered = true;
		if (!validation.isLength(value, 6, 200)) {
			password.value.message =
				"Password must have between 6 and 200 characters.";
			password.value.valid = false;
		} else if (!validation.regex.password.test(value)) {
			password.value.message =
				"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
			password.value.valid = false;
		} else {
			password.value.message = "Everything looks great!";
			password.value.valid = true;
		}
	}
);

onMounted(async () => {
	if (configStore.get("registrationDisabled")) {
		new Toast("Registration is disabled.");
		closeCurrentModal();
	}

	if (configStore.get("recaptcha.enabled")) {
		const recaptchaScript = document.createElement("script");
		recaptchaScript.onload = () => {
			grecaptcha.ready(() => {
				grecaptcha
					.execute(configStore.get("recaptcha.key"), {
						action: "login"
					})
					.then(token => {
						recaptchaToken.value = token;
					});
			});
		};

		recaptchaScript.setAttribute(
			"src",
			`https://www.google.com/recaptcha/api.js?render=${configStore.get(
				"recaptcha.key"
			)}`
		);
		document.head.appendChild(recaptchaScript);
	}
});
</script>

<template>
	<div>
		<modal
			title="Register"
			class="register-modal"
			:size="'slim'"
			@closed="closeCurrentModal()"
		>
			<template #body>
				<!-- email address -->
				<p class="control">
					<label class="label">Email</label>
					<input
						v-model="email.value"
						class="input"
						type="email"
						placeholder="Email..."
						@keyup.enter="submitModal()"
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
						@keyup.enter="submitModal()"
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
						ref="passwordElement"
						placeholder="Password..."
						@keyup.enter="submitModal()"
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
					<router-link to="/terms" @click="closeCurrentModal()">
						Terms of Service
					</router-link>
					and
					<router-link to="/privacy" @click="closeCurrentModal()">
						Privacy Policy</router-link
					>.
				</p>
			</template>
			<template #footer>
				<div id="actions">
					<button class="button is-primary" @click="submitModal()">
						Register
					</button>
					<a
						v-if="configStore.get('githubAuthentication')"
						class="button is-github"
						:href="configStore.urls.api + '/auth/github/authorize'"
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
					<a @click="changeToLoginModal()">
						Already have an account?
					</a>
				</p>
			</template>
		</modal>
	</div>
</template>

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

<style lang="less">
.grecaptcha-badge {
	z-index: 2000;
}
</style>
