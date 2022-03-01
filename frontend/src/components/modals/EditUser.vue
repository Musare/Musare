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
						<span class="control">
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
							/>
						</span>
						<span class="control">
							<a class="button is-info" @click="updateEmail()"
								>Update Email Address</a
							>
						</span>
					</p>

					<label class="label"> Change user role </label>
					<div class="control is-grouped">
						<div class="control is-expanded select">
							<select v-model="user.role">
								<option>default</option>
								<option>admin</option>
							</select>
						</div>
						<p class="control">
							<a class="button is-info" @click="updateRole()"
								>Update Role</a
							>
						</p>
					</div>
				</div>

				<div class="section">
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
				<quick-confirm @confirm="resendVerificationEmail()">
					<a class="button is-warning"> Resend verification email </a>
				</quick-confirm>
				<quick-confirm @confirm="requestPasswordReset()">
					<a class="button is-warning"> Request password reset </a>
				</quick-confirm>
				<quick-confirm @confirm="removeSessions()">
					<a class="button is-warning"> Remove all sessions </a>
				</quick-confirm>
				<quick-confirm @confirm="removeAccount()">
					<a class="button is-danger"> Remove account </a>
				</quick-confirm>
			</template>
		</modal>
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import validation from "@/validation";
import ws from "@/ws";
import Modal from "../Modal.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";

export default {
	components: { Modal, QuickConfirm },
	props: {
		userId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			ban: {
				expiresAt: "1h"
			}
		};
	},
	computed: {
		...mapState("modals/editUser", {
			user: state => state.user
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	beforeUnmount() {
		this.socket.dispatch(
			"apis.leaveRoom",
			`edit-user.${this.userId}`,
			() => {}
		);
	},
	methods: {
		init() {
			this.socket.dispatch(`users.getUserFromId`, this.userId, res => {
				if (res.status === "success") {
					const user = res.data;
					this.editUser(user);

					this.socket.dispatch(
						"apis.joinRoom",
						`edit-user.${this.userId}`
					);

					this.socket.on(
						"event:user.removed",
						res => {
							if (res.data.userId === this.userId)
								this.closeModal("editUser");
						},
						{ modal: "editUser" }
					);
				} else {
					new Toast("User with that ID not found");
					this.closeModal("editUser");
				}
			});
		},
		updateUsername() {
			const { username } = this.user;

			if (!validation.isLength(username, 2, 32))
				return new Toast(
					"Username must have between 2 and 32 characters."
				);

			if (!validation.regex.custom("a-zA-Z0-9_-").test(username))
				return new Toast(
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9, _ and -."
				);

			return this.socket.dispatch(
				`users.updateUsername`,
				this.user._id,
				username,
				res => {
					new Toast(res.message);
				}
			);
		},
		updateEmail() {
			const email = this.user.email.address;

			if (!validation.isLength(email, 3, 254))
				return new Toast(
					"Email must have between 3 and 254 characters."
				);

			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email) ||
				!validation.regex.ascii.test(email)
			)
				return new Toast("Invalid email format.");

			return this.socket.dispatch(
				`users.updateEmail`,
				this.user._id,
				email,
				res => {
					new Toast(res.message);
				}
			);
		},
		updateRole() {
			this.socket.dispatch(
				`users.updateRole`,
				this.user._id,
				this.user.role,
				res => {
					new Toast(res.message);
				}
			);
		},
		banUser() {
			const { reason } = this.ban;

			if (!validation.isLength(reason, 1, 64))
				return new Toast(
					"Reason must have between 1 and 64 characters."
				);

			if (!validation.regex.ascii.test(reason))
				return new Toast(
					"Invalid reason format. Only ascii characters are allowed."
				);

			return this.socket.dispatch(
				`users.banUserById`,
				this.user._id,
				this.ban.reason,
				this.ban.expiresAt,
				res => {
					new Toast(res.message);
				}
			);
		},
		resendVerificationEmail() {
			this.socket.dispatch(
				`users.resendVerifyEmail`,
				this.user._id,
				res => {
					new Toast(res.message);
				}
			);
		},
		requestPasswordReset() {
			this.socket.dispatch(
				`users.adminRequestPasswordReset`,
				this.user._id,
				res => {
					new Toast(res.message);
				}
			);
		},
		removeAccount() {
			this.socket.dispatch(`users.adminRemove`, this.user._id, res => {
				new Toast(res.message);
			});
		},
		removeSessions() {
			this.socket.dispatch(`users.removeSessions`, this.user._id, res => {
				new Toast(res.message);
			});
		},
		...mapActions("modals/editUser", ["editUser"]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

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
