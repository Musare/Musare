<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import { useWebsocketStore } from "@/stores/websocket";
import { useForm } from "@/composables/useForm";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const route = useRoute();

const passwordVisible = ref(false);
const passwordElement = ref();

const configStore = useConfigStore();
const { githubAuthentication, registrationDisabled } = storeToRefs(configStore);
const { login } = useUserAuthStore();

const { openModal, closeCurrentModal } = useModalsStore();
const { runJob } = useWebsocketStore();

const { inputs, save: submitModal } = useForm(
	{
		identifier: "",
		password: ""
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			runJob("data.users.login", {
				query: values
			})
				.then(({ sessionId }) => login(sessionId))
				.then(resolve)
				.catch(reject);
		} else {
			if (status === "unchanged") new Toast(messages.unchanged);
			else if (status === "error")
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid,
		preventCloseUnsaved: false
	}
);

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
		passwordVisible.value = true;
	} else {
		passwordElement.value.type = "password";
		passwordVisible.value = false;
	}
};

const changeToRegisterModal = () => {
	closeCurrentModal();
	openModal("register");
};

const githubRedirect = () => {
	localStorage.setItem("github_redirect", route.path);
};
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
							v-model="inputs.identifier.value"
							class="input"
							type="email"
							autocomplete="username"
							placeholder="Username/Email..."
							@input="checkForAutofill"
							@keyup.enter="submitModal()"
						/>
					</p>

					<!-- password -->
					<p class="control">
						<label class="label">Password</label>
					</p>

					<div id="password-visibility-container">
						<input
							v-model="inputs.password.value"
							class="input"
							type="password"
							autocomplete="current-password"
							ref="passwordElement"
							placeholder="Password..."
							@input="checkForAutofill"
							@keyup.enter="submitModal()"
						/>
						<a @click="togglePasswordVisibility()">
							<i class="material-icons">
								{{
									!passwordVisible
										? "visibility"
										: "visibility_off"
								}}
							</i>
						</a>
					</div>

					<p
						v-if="configStore.mailEnabled"
						class="content-box-optional-helper"
					>
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
						v-if="githubAuthentication"
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
