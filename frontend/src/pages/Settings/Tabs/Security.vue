<script setup lang="ts">
import { defineAsyncComponent, ref, watch, reactive } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useConfigStore } from "@/stores/config";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import _validation from "@/validation";

const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const configStore = useConfigStore();
const { oidcAuthentication } = storeToRefs(configStore);
const userAuthStore = useUserAuthStore();

const { socket } = useWebsocketsStore();

const validation = reactive({
	oldPassword: {
		value: "",
		visible: false
	},
	newPassword: {
		value: "",
		visible: false,
		valid: false,
		entered: false,
		message:
			"Include at least one lowercase letter, one uppercase letter, one number and one special character."
	}
});

const newPassword = ref();
const oldPassword = ref();

const { userId } = storeToRefs(userAuthStore);

const togglePasswordVisibility = refName => {
	const ref = refName === "oldPassword" ? oldPassword : newPassword;
	if (ref.value.type === "password") {
		ref.value.type = "text";
		validation[refName].visible = true;
	} else {
		ref.value.type = "password";
		validation[refName].visible = false;
	}
};
const onInput = inputName => {
	validation[inputName].entered = true;
};
const changePassword = () => {
	if (oidcAuthentication.value) return null;

	const newPassword = validation.newPassword.value;

	if (validation.oldPassword.value === "")
		return new Toast("Please enter your previous password.");

	if (!validation.newPassword.valid)
		return new Toast("Please enter a valid new password.");

	return socket.dispatch(
		"users.updatePassword",
		validation.oldPassword.value,
		newPassword,
		res => {
			if (res.status !== "success") new Toast(res.message);
			else {
				validation.oldPassword.value = "";
				validation.newPassword.value = "";

				new Toast("Successfully changed password.");
			}
		}
	);
};
const removeSessions = () => {
	socket.dispatch(`users.removeSessions`, userId.value, res => {
		new Toast(res.message);
	});
};

watch(validation, newValidation => {
	const { value } = newValidation.newPassword;
	if (!_validation.isLength(value, 6, 200)) {
		validation.newPassword.message =
			"Password must have between 6 and 200 characters.";
		validation.newPassword.valid = false;
	} else if (!_validation.regex.password.test(value)) {
		validation.newPassword.message =
			"Include at least one lowercase letter, one uppercase letter, one number and one special character.";
		validation.newPassword.valid = false;
	} else {
		validation.newPassword.message = "Everything looks great!";
		validation.newPassword.valid = true;
	}
});
</script>

<template>
	<div class="content security-tab">
		<template v-if="!oidcAuthentication">
			<h4 class="section-title">Change password</h4>

			<p class="section-description">
				You will need to know your previous password
			</p>

			<hr class="section-horizontal-rule" />

			<p class="control is-expanded margin-top-zero">
				<label for="old-password">Previous password</label>
			</p>

			<div id="password-visibility-container">
				<input
					class="input"
					id="old-password"
					ref="oldPassword"
					type="password"
					placeholder="Enter your old password here..."
					v-model="validation.oldPassword.value"
				/>
				<a @click="togglePasswordVisibility('oldPassword')">
					<i class="material-icons">
						{{
							!validation.oldPassword.visible
								? "visibility"
								: "visibility_off"
						}}
					</i>
				</a>
			</div>

			<p class="control is-expanded">
				<label for="new-password">New password</label>
			</p>

			<div id="password-visibility-container">
				<input
					class="input"
					id="new-password"
					type="password"
					ref="newPassword"
					placeholder="Enter new password here..."
					v-model="validation.newPassword.value"
					@keyup.enter="changePassword()"
					@keypress="onInput('newPassword')"
					@paste="onInput('newPassword')"
				/>

				<a @click="togglePasswordVisibility('newPassword')">
					<i class="material-icons">
						{{
							!validation.newPassword.visible
								? "visibility"
								: "visibility_off"
						}}
					</i>
				</a>
			</div>

			<transition name="fadein-helpbox">
				<input-help-box
					:entered="validation.newPassword.entered"
					:valid="validation.newPassword.valid"
					:message="validation.newPassword.message"
				/>
			</transition>

			<p class="control">
				<button
					id="change-password-button"
					class="button is-success"
					@click.prevent="changePassword()"
				>
					Change password
				</button>
			</p>

			<div class="section-margin-bottom" />
		</template>

		<div>
			<h4 class="section-title">Log out everywhere</h4>
			<p class="section-description">
				Remove all currently logged-in sessions for your account
			</p>

			<hr class="section-horizontal-rule" />
			<div class="row">
				<quick-confirm @confirm="removeSessions()">
					<a class="button is-warning">
						<i class="material-icons icon-with-button"
							>exit_to_app</i
						>
						Logout everywhere
					</a>
				</quick-confirm>
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
#change-password-button {
	margin-top: 10px;
}

.control {
	margin-bottom: 2px !important;
}

.row {
	display: flex;
}
</style>
