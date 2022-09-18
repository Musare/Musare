<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import validation from "@/validation";
import { useEditUserStore } from "@/stores/editUser";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const editUserStore = useEditUserStore(props);

const { socket } = useWebsocketsStore();

const { userId, user } = storeToRefs(editUserStore);
const { setUser } = editUserStore;

const { closeCurrentModal } = useModalsStore();

const { hasPermission } = useUserAuthStore();

const ban = ref({ reason: "", expiresAt: "1h" });

const init = () => {
	if (userId.value)
		socket.dispatch(`users.getUserFromId`, userId.value, res => {
			if (res.status === "success") {
				setUser(res.data);

				socket.dispatch("apis.joinRoom", `edit-user.${userId.value}`);

				socket.on(
					"event:user.removed",
					res => {
						if (res.data.userId === userId.value)
							closeCurrentModal();
					},
					{ modalUuid: props.modalUuid }
				);
			} else {
				new Toast("User with that ID not found");
				closeCurrentModal();
			}
		});
};

const updateUsername = () => {
	const { username } = user.value;

	if (!validation.isLength(username, 2, 32))
		return new Toast("Username must have between 2 and 32 characters.");

	if (!validation.regex.custom("a-zA-Z0-9_-").test(username))
		return new Toast(
			"Invalid username format. Allowed characters: a-z, A-Z, 0-9, _ and -."
		);

	return socket.dispatch(
		`users.updateUsername`,
		user.value._id,
		username,
		res => {
			new Toast(res.message);
		}
	);
};

const updateEmail = () => {
	const email = user.value.email.address;

	if (!validation.isLength(email, 3, 254))
		return new Toast("Email must have between 3 and 254 characters.");

	if (
		email.indexOf("@") !== email.lastIndexOf("@") ||
		!validation.regex.emailSimple.test(email) ||
		!validation.regex.ascii.test(email)
	)
		return new Toast("Invalid email format.");

	return socket.dispatch(`users.updateEmail`, user.value._id, email, res => {
		new Toast(res.message);
	});
};

const updateRole = () => {
	socket.dispatch(
		`users.updateRole`,
		user.value._id,
		user.value.role,
		res => {
			new Toast(res.message);
		}
	);
};

const banUser = () => {
	const { reason } = ban.value;

	if (!validation.isLength(reason, 1, 64))
		return new Toast("Reason must have between 1 and 64 characters.");

	if (!validation.regex.ascii.test(reason))
		return new Toast(
			"Invalid reason format. Only ascii characters are allowed."
		);

	return socket.dispatch(
		`users.banUserById`,
		user.value._id,
		ban.value.reason,
		ban.value.expiresAt,
		res => {
			new Toast(res.message);
		}
	);
};

const resendVerificationEmail = () => {
	socket.dispatch(`users.resendVerifyEmail`, user.value._id, res => {
		new Toast(res.message);
	});
};

const requestPasswordReset = () => {
	socket.dispatch(`users.adminRequestPasswordReset`, user.value._id, res => {
		new Toast(res.message);
	});
};

const removeAccount = () => {
	socket.dispatch(`users.adminRemove`, user.value._id, res => {
		new Toast(res.message);
	});
};

const removeSessions = () => {
	socket.dispatch(`users.removeSessions`, user.value._id, res => {
		new Toast(res.message);
	});
};

// When the userId changes, run init. There can be a delay between the modal opening and the required data (userId) being available
watch(userId, () => init());
watch(
	() => hasPermission("users.get") && hasPermission("users.update"),
	value => {
		if (!value) closeCurrentModal();
	}
);

onMounted(() => {
	socket.onConnect(init);
});

onBeforeUnmount(() => {
	socket.dispatch("apis.leaveRoom", `edit-user.${userId.value}`, () => {});
	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	editUserStore.$dispose();
});
</script>

<template>
	<div>
		<modal title="Edit User">
			<template #body v-if="user && user._id">
				<div class="section">
					<label class="label"> Change username </label>
					<p class="control is-grouped">
						<span class="control is-expanded">
							<input
								v-model="user.username"
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
							<a class="button is-info" @click="updateUsername()"
								>Update Username</a
							>
						</span>
					</p>

					<label class="label"> Change email address </label>
					<p class="control is-grouped">
						<span class="control is-expanded">
							<input
								v-model="user.email.address"
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
							<a class="button is-info" @click="updateEmail()"
								>Update Email Address</a
							>
						</span>
					</p>

					<label class="label"> Change user role </label>
					<div class="control is-grouped">
						<div class="control is-expanded select">
							<select
								v-model="user.role"
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
							<a class="button is-info" @click="updateRole()"
								>Update Role</a
							>
						</p>
					</div>
				</div>

				<div v-if="hasPermission('users.ban')" class="section">
					<label class="label"> Punish/Ban User </label>
					<p class="control is-grouped">
						<span class="control select">
							<select v-model="ban.expiresAt">
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
								v-model="ban.reason"
								class="input"
								type="text"
								placeholder="Ban reason"
								autofocus
							/>
						</span>
						<span class="control">
							<a class="button is-danger" @click="banUser()">
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

.tag:not(:last-child) {
	margin-right: 5px;
}

.select:after {
	border-color: var(--primary-color);
}
</style>
