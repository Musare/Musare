<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";

const route = useRoute();

const email = ref("");
const password = ref({
	value: "",
	visible: false
});
const apiDomain = ref("");
const siteSettings = ref({
	registrationDisabled: false,
	githubAuthentication: false
});
const passwordElement = ref();

const { login } = useUserAuthStore();

const { openModal, closeCurrentModal } = useModalsStore();

const submitModal = () => {
	login({
		email: email.value,
		password: password.value.value
	})
		.then((res: any) => {
			if (res.status === "success") window.location.reload();
		})
		.catch(err => new Toast(err.message));
};

const checkForAutofill = event => {
	if (
		event.target.value !== "" &&
		event.inputType === undefined &&
		event.data === undefined &&
		event.dataTransfer === undefined &&
		event.isComposing === undefined
	)
		submitModal();
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

const changeToRegisterModal = () => {
	closeCurrentModal();
	openModal("register");
};

const githubRedirect = () => {
	localStorage.setItem("github_redirect", route.path);
};

onMounted(async () => {
	apiDomain.value = await lofig.get("backend.apiDomain");
	siteSettings.value = await lofig.get("siteSettings");
});
</script>

<template>
	<div>
		<modal
			title="Login"
			class="login-modal"
			:size="'slim'"
			@closed="closeCurrentModal()"
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
							@keyup.enter="submitModal()"
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
							ref="passwordElement"
							placeholder="Password..."
							@input="checkForAutofill($event)"
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

					<p class="content-box-optional-helper">
						<router-link
							id="forgot-password"
							to="/reset_password"
							@click="closeCurrentModal()"
						>
							Forgot password?
						</router-link>
					</p>

					<br />
					<p>
						By logging in you agree to our
						<router-link to="/terms" @click="closeCurrentModal()">
							Terms of Service
						</router-link>
						and
						<router-link to="/privacy" @click="closeCurrentModal()">
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
						v-if="siteSettings.githubAuthentication"
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
					v-if="!siteSettings.registrationDisabled"
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
