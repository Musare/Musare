<script setup lang="ts">
import { defineAsyncComponent, watch, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { useForm } from "@/composables/useForm";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	userId: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const { closeCurrentModal, preventCloseUnsaved } = useModalsStore();

const { hasPermission } = useUserAuthStore();

const {
	inputs: usernameInputs,
	unsavedChanges: usernameUnsaved,
	save: saveUsername,
	setOriginalValue: setUsername
} = useForm(
	{
		username: {
			value: "",
			validate: value => {
				if (!validation.isLength(value, 2, 32))
					return "Username must have between 2 and 32 characters.";
				if (!validation.regex.custom("a-zA-Z0-9_-").test(value))
					return "Invalid username format. Allowed characters: a-z, A-Z, 0-9, _ and -.";
				return true;
			}
		}
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				"users.updateUsername",
				props.userId,
				values.username,
				res => {
					if (res.status === "success") {
						resolve();
						new Toast(res.message);
					} else reject(new Error(res.message));
				}
			);
		else {
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

const {
	inputs: emailInputs,
	unsavedChanges: emailUnsaved,
	save: saveEmail,
	setOriginalValue: setEmail
} = useForm(
	{
		email: {
			value: "",
			validate: value => {
				if (!validation.isLength(value, 3, 254))
					return "Email must have between 3 and 254 characters.";
				if (
					value.indexOf("@") !== value.lastIndexOf("@") ||
					!validation.regex.emailSimple.test(value) ||
					!validation.regex.ascii.test(value)
				)
					return "Invalid email format.";
				return true;
			}
		}
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				"users.updateEmail",
				props.userId,
				values.email,
				res => {
					if (res.status === "success") {
						resolve();
						new Toast(res.message);
					} else reject(new Error(res.message));
				}
			);
		else {
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

const {
	inputs: roleInputs,
	unsavedChanges: roleUnsaved,
	save: saveRole,
	setOriginalValue: setRole
} = useForm(
	{ role: "" },
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				"users.updateRole",
				props.userId,
				values.role,
				res => {
					if (res.status === "success") {
						resolve();
						new Toast(res.message);
					} else reject(new Error(res.message));
				}
			);
		else {
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

const {
	inputs: banInputs,
	unsavedChanges: banUnsaved,
	save: saveBan
} = useForm(
	{
		reason: {
			value: "",
			validate: value => {
				if (!validation.isLength(value, 1, 64))
					return "Reason must have between 1 and 64 characters.";
				if (!validation.regex.ascii.test(value))
					return "Invalid reason format. Only ascii characters are allowed.";
				return true;
			}
		},
		expiresAt: "1h"
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				"users.banUserById",
				props.userId,
				values.reason,
				values.expiresAt,
				res => {
					new Toast(res.message);
					if (res.status === "success") resolve();
					else reject(new Error(res.message));
				}
			);
		else {
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

const resendVerificationEmail = () => {
	socket.dispatch(`users.resendVerifyEmail`, props.userId, res => {
		new Toast(res.message);
	});
};

const requestPasswordReset = () => {
	socket.dispatch(`users.adminRequestPasswordReset`, props.userId, res => {
		new Toast(res.message);
	});
};

const removeAccount = () => {
	socket.dispatch(`users.adminRemove`, props.userId, res => {
		new Toast(res.message);
	});
};

const removeSessions = () => {
	socket.dispatch(`users.removeSessions`, props.userId, res => {
		new Toast(res.message);
	});
};

watch(
	() => hasPermission("users.get") && hasPermission("users.update"),
	value => {
		if (!value) closeCurrentModal(true);
	}
);

onMounted(() => {
	preventCloseUnsaved[props.modalUuid] = () =>
		usernameUnsaved.value.length +
			emailUnsaved.value.length +
			roleUnsaved.value.length +
			banUnsaved.value.length >
		0;

	socket.onConnect(() => {
		socket.dispatch(`users.getUserFromId`, props.userId, res => {
			if (res.status === "success") {
				setUsername({ username: res.data.username });
				setEmail({ email: res.data.email.address });
				setRole({ role: res.data.role });

				socket.dispatch("apis.joinRoom", `edit-user.${props.userId}`);
			} else {
				new Toast("User with that ID not found");
				closeCurrentModal();
			}
		});
	});

	socket.on(
		"event:user.removed",
		res => {
			if (res.data.userId === props.userId) closeCurrentModal(true);
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	delete preventCloseUnsaved[props.modalUuid];
	socket.dispatch("apis.leaveRoom", `edit-user.${props.userId}`, () => {});
});
</script>

<template>
	<div>
		<modal title="Edit User">
			<template #body>
				<div class="section">
					<label class="label"> Change username </label>
					<p class="control is-grouped">
						<span class="control is-expanded">
							<input
								v-model="usernameInputs['username'].value"
								class="input"
								type="text"
								placeholder="Username"
								autofocus
							/>
						</span>
						<span
							v-if="hasPermission('users.update')"
							class="control"
						>
							<a class="button is-info" @click="saveUsername()"
								>Update Username</a
							>
						</span>
					</p>

					<label class="label"> Change email address </label>
					<p class="control is-grouped">
						<span class="control is-expanded">
							<input
								v-model="emailInputs['email'].value"
								class="input"
								type="text"
								placeholder="Email Address"
								autofocus
								:disabled="
									!hasPermission('users.update.restricted')
								"
							/>
						</span>
						<span
							v-if="hasPermission('users.update.restricted')"
							class="control"
						>
							<a class="button is-info" @click="saveEmail()"
								>Update Email Address</a
							>
						</span>
					</p>

					<label class="label"> Change user role </label>
					<div class="control is-grouped">
						<div class="control is-expanded select">
							<select
								v-model="roleInputs['role'].value"
								:disabled="
									!hasPermission('users.update.restricted')
								"
							>
								<option>user</option>
								<option>moderator</option>
								<option>admin</option>
							</select>
						</div>
						<p
							v-if="hasPermission('users.update.restricted')"
							class="control"
						>
							<a class="button is-info" @click="saveRole()"
								>Update Role</a
							>
						</p>
					</div>
				</div>

				<div v-if="hasPermission('users.ban')" class="section">
					<label class="label"> Punish/Ban User </label>
					<p class="control is-grouped">
						<span class="control select">
							<select v-model="banInputs['expiresAt'].value">
								<option value="1h">1 Hour</option>
								<option value="12h">12 Hours</option>
								<option value="1d">1 Day</option>
								<option value="1w">1 Week</option>
								<option value="1m">1 Month</option>
								<option value="3m">3 Months</option>
								<option value="6m">6 Months</option>
								<option value="1y">1 Year</option>
							</select>
						</span>
						<span class="control is-expanded">
							<input
								v-model="banInputs['reason'].value"
								class="input"
								type="text"
								placeholder="Ban reason"
								autofocus
							/>
						</span>
						<span class="control">
							<a class="button is-danger" @click="saveBan()">
								Ban user
							</a>
						</span>
					</p>
				</div>
			</template>
			<template #footer>
				<quick-confirm
					v-if="hasPermission('users.resendVerifyEmail')"
					@confirm="resendVerificationEmail()"
				>
					<a class="button is-warning"> Resend verification email </a>
				</quick-confirm>
				<quick-confirm
					v-if="hasPermission('users.requestPasswordReset')"
					@confirm="requestPasswordReset()"
				>
					<a class="button is-warning"> Request password reset </a>
				</quick-confirm>
				<quick-confirm
					v-if="hasPermission('users.remove.sessions')"
					@confirm="removeSessions()"
				>
					<a class="button is-warning"> Remove all sessions </a>
				</quick-confirm>
				<quick-confirm
					v-if="hasPermission('users.remove')"
					@confirm="removeAccount()"
				>
					<a class="button is-danger"> Remove account </a>
				</quick-confirm>
			</template>
		</modal>
	</div>
</template>

<style lang="less" scoped>
.night-mode .section {
	background-color: transparent !important;
}

.section {
	padding: 15px 0 !important;
}

.save-changes {
	color: var(--white);
}

.select:after {
	border-color: var(--primary-color);
}
</style>
