<script setup lang="ts">
import { defineAsyncComponent, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import validation from "@/validation";
import { useEvents } from "@/composables/useEvents";
import { useModels } from "@/composables/useModels";
import { useWebsocketStore } from "@/stores/websocket";
import { useForm } from "@/composables/useForm";

const InputHelpBox = defineAsyncComponent(
	() => import("@/components/InputHelpBox.vue")
);
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const route = useRoute();

const { socket } = useWebsocketsStore();

const { openModal } = useModalsStore();

const { runJob } = useWebsocketStore();
const { onReady } = useEvents();
const { registerModel } = useModels();

const userAuthStore = useUserAuthStore();

const { currentUser } = storeToRefs(userAuthStore);

const { inputs, saveButton, validate, save, setModelValues } = useForm(
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
		}
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			runJob(`data.users.updateById`, {
				_id: currentUser.value._id,
				query: values
			})
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
	}
);

const removeActivities = () => {
	socket.dispatch("activities.removeAllForUser", res => {
		new Toast(res.message);
	});
};

onMounted(async () => {
	await onReady(async () => {
		setModelValues(await registerModel(currentUser.value), [
			"username",
			"emailAddress"
		]);
	});

	if (
		route.query.removeAccount === "relinked-github" &&
		!localStorage.getItem("github_redirect")
	) {
		openModal({
			modal: "removeAccount",
			props: { githubLinkConfirmed: true }
		});
	}
});
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
				v-model="inputs.username.value"
				@input="validate('username')"
				maxlength="32"
				autocomplete="off"
			/>
			<span v-if="inputs.username.value" class="character-counter">
				{{ inputs.username.value.length }}/32
			</span>
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

		<p class="control is-expanded">
			<label for="email">Email</label>
			<input
				class="input"
				id="email"
				type="text"
				placeholder="Enter email address here..."
				v-model="inputs.emailAddress.value"
				@input="validate('emailAddress')"
				autocomplete="off"
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

		<SaveButton ref="saveButton" @clicked="save()" />

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
