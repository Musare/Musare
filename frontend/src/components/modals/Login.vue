<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const email = ref("");
const password = ref({
	value: "",
	visible: false
});
const passwordElement = ref();

const configStore = useConfigStore();
const { registrationDisabled } = storeToRefs(configStore);
const { login } = useUserAuthStore();

const { openModal, closeCurrentModal } = useModalsStore();

const submitModal = () => {
	if (!email.value || !password.value.value) return;

	login({
		email: email.value,
		password: password.value.value
	})
		.then((res: any) => {
			if (res.status === "success") window.location.reload();
		})
		.catch(err => new Toast(err.message));
};

const checkForAutofill = (type, event) => {
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
							autocomplete="username"
							placeholder="Username/Email..."
							@input="checkForAutofill('email', $event)"
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
							autocomplete="current-password"
							ref="passwordElement"
							placeholder="Password..."
							@input="checkForAutofill('password', $event)"
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

.is-primary:focus {
	background-color: var(--primary-color) !important;
}

.invert {
	filter: brightness(5);
}
</style>
