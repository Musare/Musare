<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

defineProps({
	modalUuid: { type: String, required: true }
});

const configStore = useConfigStore();
const { cookie, oidcAuthentication, messages } = storeToRefs(configStore);

const { socket } = useWebsocketsStore();

const { closeCurrentModal } = useModalsStore();

const step = ref("confirm-identity");
const password = ref({
	value: "",
	visible: false
});
const passwordElement = ref();

const checkForAutofill = (cb, event) => {
	if (
		event.target.value !== "" &&
		event.inputType === undefined &&
		event.data === undefined &&
		event.dataTransfer === undefined &&
		event.isComposing === undefined
	)
		cb();
};

const submitOnEnter = (cb, event) => {
	if (event.which === 13) cb();
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

const confirmPasswordMatch = () =>
	socket.dispatch("users.confirmPasswordMatch", password.value.value, res => {
		if (res.status === "success") step.value = "remove-account";
		else new Toast(res.message);
	});

const confirmOIDCLink = () => {
	// TODO
	step.value = "remove-account";
};

const remove = () =>
	socket.dispatch("users.remove", res => {
		if (res.status === "success") {
			return socket.dispatch("users.logout", () => {
				document.cookie = `${cookie.value}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
				closeCurrentModal();
				window.location.href = "/";
			});
		}

		return new Toast(res.message);
	});
</script>

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
						selected: step === 'export-data'
					}"
				>
					2
				</p>
				<span class="divider"></span>
				<p
					class="step"
					:class="{
						selected: step === 'remove-account'
					}"
				>
					3
				</p>
			</div>

			<div
				class="content-box"
				id="password-linked"
				v-if="!oidcAuthentication && step === 'confirm-identity'"
			>
				<h2 class="content-box-title">Enter your password</h2>
				<p class="content-box-description">
					Confirming your password will let us verify your identity.
				</p>

				<p
					v-if="configStore.mailEnabled"
					class="content-box-optional-helper"
				>
					<router-link id="forgot-password" to="/reset_password">
						Forgot password?
					</router-link>
				</p>

				<div class="content-box-inputs">
					<div class="control is-grouped input-with-button">
						<div id="password-visibility-container">
							<input
								class="input"
								type="password"
								placeholder="Enter password here..."
								autofocus
								ref="passwordElement"
								v-model="password.value"
								@input="
									checkForAutofill(
										confirmPasswordMatch,
										$event
									)
								"
								@keypress="
									submitOnEnter(confirmPasswordMatch, $event)
								"
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
							<button
								class="button is-info"
								@click="confirmPasswordMatch()"
							>
								Check
							</button>
						</p>
					</div>
				</div>
			</div>

			<div
				class="content-box"
				v-else-if="oidcAuthentication && step === 'confirm-identity'"
			>
				<h2 class="content-box-title">Verify your OIDC</h2>
				<p class="content-box-description">
					Check your account is still linked to remove your account.
				</p>

				<div class="content-box-inputs">
					<a class="button is-oidc" @click="confirmOIDCLink()">
						<div class="icon">
							<img
								class="invert"
								src="/assets/social/github.svg"
							/>
						</div>
						&nbsp; Check whether OIDC is linked
					</a>
				</div>
			</div>

			<div v-if="step === 'export-data'">
				DOWNLOAD A BACKUP OF YOUR DATA BEFORE ITS PERMENATNELY DELETED
			</div>

			<div
				class="content-box"
				id="remove-account-container"
				v-if="step === 'remove-account'"
			>
				<h2 class="content-box-title">Remove your account</h2>
				<p class="content-box-description">
					{{ messages.accountRemoval }}
				</p>

				<div class="content-box-inputs">
					<quick-confirm placement="right" @confirm="remove()">
						<button class="button">
							<i class="material-icons">delete</i>
							&nbsp;Remove Account
						</button>
					</quick-confirm>
				</div>
			</div>
		</template>
	</modal>
</template>

<style lang="less">
.confirm-account-removal-modal {
	.modal-card {
		width: 650px;
	}
}
</style>

<style lang="less" scoped>
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
	#password-visibility-container {
		width: 100%;
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
