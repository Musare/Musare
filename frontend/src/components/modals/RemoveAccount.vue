<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useWebsocketsStore } from "@/stores/websockets";
import { useRemoveAccountStore } from "@/stores/removeAccount";
import { useModalsStore } from "@/stores/modals";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const settingsStore = useSettingsStore();
const route = useRoute();

const { socket } = useWebsocketsStore();

const removeAccountStore = useRemoveAccountStore(props);
const { githubLinkConfirmed } = storeToRefs(removeAccountStore);

const { isPasswordLinked, isGithubLinked } = settingsStore;

const { closeCurrentModal } = useModalsStore();

const step = ref("confirm-identity");
const apiDomain = ref("");
const accountRemovalMessage = ref("");
const password = ref({
	value: "",
	visible: false
});
const passwordElement = ref();
const githubAuthentication = ref(false);

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

const confirmGithubLink = () =>
	socket.dispatch("users.confirmGithubLink", res => {
		if (res.status === "success") {
			if (res.data.linked) step.value = "remove-account";
			else {
				new Toast(
					`Your GitHub account isn't linked. Please re-link your account and try again.`
				);
				step.value = "relink-github";
			}
		} else new Toast(res.message);
	});

const relinkGithub = () => {
	localStorage.setItem(
		"github_redirect",
		`${window.location.pathname + window.location.search}${
			!route.query.removeAccount ? "&removeAccount=relinked-github" : ""
		}`
	);
};

const remove = () =>
	socket.dispatch("users.remove", res => {
		if (res.status === "success") {
			return socket.dispatch("users.logout", () =>
				lofig.get("cookie").then(cookie => {
					document.cookie = `${cookie.SIDname}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
					closeCurrentModal();
					window.location.href = "/";
				})
			);
		}

		return new Toast(res.message);
	});

onMounted(async () => {
	apiDomain.value = await lofig.get("backend.apiDomain");
	accountRemovalMessage.value = await lofig.get("messages.accountRemoval");
	githubAuthentication.value = await lofig.get(
		"siteSettings.githubAuthentication"
	);

	if (githubLinkConfirmed.value === true) confirmGithubLink();
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
						selected:
							(isPasswordLinked && step === 'export-data') ||
							step === 'relink-github'
					}"
				>
					2
				</p>
				<span class="divider"></span>
				<p
					class="step"
					:class="{
						selected:
							(isPasswordLinked && step === 'remove-account') ||
							step === 'export-data'
					}"
				>
					3
				</p>
				<span class="divider" v-if="!isPasswordLinked"></span>
				<p
					class="step"
					:class="{ selected: step === 'remove-account' }"
					v-if="!isPasswordLinked"
				>
					4
				</p>
			</div>

			<div
				class="content-box"
				id="password-linked"
				v-if="
					step === 'confirm-identity' &&
					(isPasswordLinked || !githubAuthentication)
				"
			>
				<h2 class="content-box-title">Enter your password</h2>
				<p class="content-box-description">
					Confirming your password will let us verify your identity.
				</p>

				<p class="content-box-optional-helper">
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
				v-else-if="
					githubAuthentication &&
					isGithubLinked &&
					step === 'confirm-identity'
				"
			>
				<h2 class="content-box-title">Verify your GitHub</h2>
				<p class="content-box-description">
					Check your account is still linked to remove your account.
				</p>

				<div class="content-box-inputs">
					<a class="button is-github" @click="confirmGithubLink()">
						<div class="icon">
							<img
								class="invert"
								src="/assets/social/github.svg"
							/>
						</div>
						&nbsp; Check GitHub is linked
					</a>
				</div>
			</div>

			<div
				class="content-box"
				v-if="githubAuthentication && step === 'relink-github'"
			>
				<h2 class="content-box-title">Re-link GitHub</h2>
				<p class="content-box-description">
					Re-link your GitHub account in order to verify your
					identity.
				</p>

				<div class="content-box-inputs">
					<a
						class="button is-github"
						@click="relinkGithub()"
						:href="`${apiDomain}/auth/github/link`"
					>
						<div class="icon">
							<img
								class="invert"
								src="/assets/social/github.svg"
							/>
						</div>
						&nbsp; Re-link GitHub to account
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
					{{ accountRemovalMessage }}
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
