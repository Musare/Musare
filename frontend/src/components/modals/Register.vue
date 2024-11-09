<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import validation from "@/validation";
import { useEvents } from "@/composables/useEvents";
import { useWebsocketStore } from "@/stores/websocket";
import { useForm } from "@/composables/useForm";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);

const passwordVisible = ref(false);
const passwordElement = ref();

const configStore = useConfigStore();
const { registrationDisabled } = storeToRefs(configStore);
const { openModal, closeCurrentModal } = useModalsStore();

const { runJob } = useWebsocketStore();
const { onReady } = useEvents();

const { login } = useUserAuthStore();

const togglePasswordVisibility = () => {
	if (passwordElement.value.type === "password") {
		passwordElement.value.type = "text";
		passwordVisible.value = true;
	} else {
		passwordElement.value.type = "password";
		passwordVisible.value = false;
	}
};

const changeToLoginModal = () => {
	closeCurrentModal();
	openModal("login");
};

const { inputs, validate, save } = useForm(
	{
		username: {
			value: null,
			validate: (value: string) => {
				if (!validation.isLength(value, 2, 32))
					return "Username must have between 2 and 32 characters.";
				if (!validation.regex.azAZ09_.test(value))
					return "Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.";
				if (value.replaceAll(/[_]/g, "").length === 0)
					return "Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number.";
				return true;
			}
		},
		emailAddress: {
			value: null,
			validate: (value: string) => {
				if (!validation.isLength(value, 3, 254))
					return "Email address must have between 3 and 254 characters.";
				if (
					value.indexOf("@") !== value.lastIndexOf("@") ||
					!validation.regex.emailSimple.test(value)
				)
					return "Invalid email address format.";
				return true;
			}
		},
		password: {
			value: null,
			validate: (value: string) => {
				if (!validation.isLength(value, 6, 200))
					return "Password must have between 6 and 200 characters.";
				if (!validation.regex.password.test(value))
					return "Include at least one lowercase letter, one uppercase letter, one number and one special character.";
				return true;
			}
		}
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			runJob('data.users.register', {
				query: values
			})
				.then(async data => {
					await login(data.sessionId);

					window.location.reload();

					resolve();
				})
				.catch(reject);
		} else {
			if (status === "unchanged") new Toast(messages.unchanged);
			else if (status === "error")
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
			resolve();
		}
	}
);

onMounted(async () => {
	await onReady(async () => {
		if (registrationDisabled.value) {
			new Toast("Registration is disabled.");
			closeCurrentModal();

			return;
		}
	});
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
				<form>
					<!-- email address -->
					<p class="control">
						<label class="label">Email</label>
						<input
							v-model="inputs.emailAddress.value"
							class="input"
							type="email"
							autocomplete="email"
							placeholder="Email..."
							@input="validate('emailAddress')"
							@keyup.enter="save()"
							autofocus
						/>
					</p>
					<transition name="fadein-helpbox">
						<input-help-box
							:entered="inputs.emailAddress.value?.length > 1"
							:valid="inputs.emailAddress.errors.length === 0"
							:message="
								inputs.emailAddress.errors[0] ?? 'Everything looks great!'
							"
						/>
					</transition>

					<!-- username -->
					<p class="control">
						<label class="label">Username</label>
						<input
							v-model="inputs.username.value"
							class="input"
							type="text"
							autocomplete="username"
							placeholder="Username..."
							@input="validate('username')"
							@keyup.enter="save()"
						/>
					</p>
					<transition name="fadein-helpbox">
						<input-help-box
							:entered="inputs.username.value?.length > 1"
							:valid="inputs.username.errors.length === 0"
							:message="
								inputs.username.errors[0] ?? 'Everything looks great!'
							"
						/>
					</transition>

					<!-- password -->
					<p class="control">
						<label class="label">Password</label>
					</p>

					<div id="password-visibility-container">
						<input
							v-model="inputs.password.value"
							class="input"
							type="password"
							autocomplete="new-password"
							ref="passwordElement"
							placeholder="Password..."
							@input="validate('password')"
							@keyup.enter="save()"
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

					<transition name="fadein-helpbox">
						<input-help-box
							:entered="inputs.password.value?.length > 1"
							:valid="inputs.password.errors.length === 0"
							:message="
								inputs.password.errors[0] ?? 'Everything looks great!'
							"
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
				</form>
			</template>
			<template #footer>
				<div id="actions">
					<button class="button is-primary" @click="save()">
						Register
					</button>
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

.invert {
	filter: brightness(5);
}

a {
	color: var(--primary-color);
}
</style>
