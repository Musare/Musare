<script setup lang="ts">
import { defineAsyncComponent, ref, watch, reactive, onMounted } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import _validation from "@/validation";

const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);

const settingsStore = useSettingsStore();
const userAuthStore = useUserAuthStore();
const store = useStore();
const route = useRoute();

const { socket } = useWebsocketsStore();

const saveButton = ref();

const { userId } = storeToRefs(userAuthStore);
const { originalUser, modifiedUser } = settingsStore;

const validation = reactive({
	username: {
		entered: false,
		valid: false,
		message: "Please enter a valid username."
	},
	email: {
		entered: false,
		valid: false,
		message: "Please enter a valid email address."
	}
});

const { updateOriginalUser } = settingsStore;
const openModal = payload =>
	store.dispatch("modalVisibility/openModal", payload);

const onInput = inputName => {
	validation[inputName].entered = true;
};

const changeEmail = () => {
	const email = modifiedUser.email.address;
	if (!_validation.isLength(email, 3, 254))
		return new Toast("Email must have between 3 and 254 characters.");
	if (
		email.indexOf("@") !== email.lastIndexOf("@") ||
		!_validation.regex.emailSimple.test(email)
	)
		return new Toast("Invalid email format.");

	saveButton.value.saveStatus = "disabled";

	return socket.dispatch("users.updateEmail", userId.value, email, res => {
		if (res.status !== "success") {
			new Toast(res.message);
			saveButton.value.handleFailedSave();
		} else {
			new Toast("Successfully changed email address");

			updateOriginalUser({
				property: "email.address",
				value: email
			});

			saveButton.value.handleSuccessfulSave();
		}
	});
};

const changeUsername = () => {
	const { username } = modifiedUser;

	if (!_validation.isLength(username, 2, 32))
		return new Toast("Username must have between 2 and 32 characters.");

	if (!_validation.regex.azAZ09_.test(username))
		return new Toast(
			"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
		);

	if (username.replaceAll(/[_]/g, "").length === 0)
		return new Toast(
			"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number."
		);

	saveButton.value.saveStatus = "disabled";

	return socket.dispatch(
		"users.updateUsername",
		userId.value,
		username,
		res => {
			if (res.status !== "success") {
				new Toast(res.message);
				saveButton.value.handleFailedSave();
			} else {
				new Toast("Successfully changed username");

				updateOriginalUser({
					property: "username",
					value: username
				});

				saveButton.value.handleSuccessfulSave();
			}
		}
	);
};

const saveChanges = () => {
	const usernameChanged = modifiedUser.username !== originalUser.username;
	const emailAddressChanged =
		modifiedUser.email.address !== originalUser.email.address;

	if (usernameChanged) changeUsername();

	if (emailAddressChanged) changeEmail();

	if (!usernameChanged && !emailAddressChanged) {
		saveButton.value.handleFailedSave();

		new Toast("Please make a change before saving.");
	}
};

const removeActivities = () => {
	socket.dispatch("activities.removeAllForUser", res => {
		new Toast(res.message);
	});
};

onMounted(() => {
	if (
		route.query.removeAccount === "relinked-github" &&
		!localStorage.getItem("github_redirect")
	) {
		openModal({
			modal: "removeAccount",
			data: { githubLinkConfirmed: true }
		});
	}
});

watch(
	() => modifiedUser.username,
	value => {
		// const value = newModifiedUser.username;

		if (!_validation.isLength(value, 2, 32)) {
			validation.username.message =
				"Username must have between 2 and 32 characters.";
			validation.username.valid = false;
		} else if (
			!_validation.regex.azAZ09_.test(value) &&
			value !== originalUser.username // Sometimes a username pulled from GitHub won't succeed validation
		) {
			validation.username.message =
				"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _.";
			validation.username.valid = false;
		} else if (value.replaceAll(/[_]/g, "").length === 0) {
			validation.username.message =
				"Invalid format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number.";
			validation.username.valid = false;
		} else {
			validation.username.message = "Everything looks great!";
			validation.username.valid = true;
		}
	}
);

watch(
	() => modifiedUser.email.address,
	value => {
		// const value = newModifiedUser.email.address;

		if (!_validation.isLength(value, 3, 254)) {
			validation.email.message =
				"Email must have between 3 and 254 characters.";
			validation.email.valid = false;
		} else if (
			value.indexOf("@") !== value.lastIndexOf("@") ||
			!_validation.regex.emailSimple.test(value)
		) {
			validation.email.message = "Invalid format.";
			validation.email.valid = false;
		} else {
			validation.email.message = "Everything looks great!";
			validation.email.valid = true;
		}
	}
);
</script>

<template>
	<div class="content account-tab">
		<h4 class="section-title">Change account details</h4>

		<p class="section-description">Keep these details up-to-date</p>

		<hr class="section-horizontal-rule" />

		<p class="control is-expanded margin-top-zero">
			<label for="username">Username</label>
			<input
				class="input"
				id="username"
				type="text"
				placeholder="Enter username here..."
				v-model="modifiedUser.username"
				maxlength="32"
				autocomplete="off"
				@keypress="onInput('username')"
				@paste="onInput('username')"
			/>
			<span v-if="modifiedUser.username" class="character-counter"
				>{{ modifiedUser.username.length }}/32</span
			>
		</p>
		<transition name="fadein-helpbox">
			<input-help-box
				:entered="validation.username.entered"
				:valid="validation.username.valid"
				:message="validation.username.message"
			/>
		</transition>

		<p class="control is-expanded">
			<label for="email">Email</label>
			<input
				class="input"
				id="email"
				type="text"
				placeholder="Enter email address here..."
				v-if="modifiedUser.email"
				v-model="modifiedUser.email.address"
				@keypress="onInput('email')"
				@paste="onInput('email')"
				autocomplete="off"
			/>
		</p>
		<transition name="fadein-helpbox">
			<input-help-box
				:entered="validation.email.entered"
				:valid="validation.email.valid"
				:message="validation.email.message"
			/>
		</transition>

		<SaveButton ref="saveButton" @clicked="saveChanges()" />

		<div class="section-margin-bottom" />

		<h4 class="section-title">Remove any data we hold on you</h4>

		<p class="section-description">
			Permanently remove your account and/or data we store on you
		</p>

		<hr class="section-horizontal-rule" />

		<div class="row">
			<quick-confirm @confirm="removeActivities()">
				<a class="button is-warning">
					<i class="material-icons icon-with-button">cancel</i>
					Clear my activities
				</a>
			</quick-confirm>

			<a class="button is-danger" @click="openModal('removeAccount')">
				<i class="material-icons icon-with-button">delete</i>
				Remove my account
			</a>
		</div>
	</div>
</template>

<style lang="less" scoped>
.control {
	margin-bottom: 2px !important;
}

.row {
	display: flex;
}
</style>
