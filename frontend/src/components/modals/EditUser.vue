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
import { mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import validation from "@/validation";
import ws from "@/ws";

const mapModalState = function(namespace, map) {
	const modalState = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalState[mapKey] = function() {
			return mapValue(namespace.replace("MODAL_UUID", this.modalUuid).split("/").reduce((a, b) => a[b], this.$store.state));
		}
	});
	return modalState;
}

const mapModalActions = function(namespace, map) {
	const modalState = {};
	map.forEach(mapValue => {
		modalState[mapValue] = function(value) {
			return this.$store.dispatch(`${namespace.replace("MODAL_UUID", this.modalUuid)}/${mapValue}`, value);
		}
	});
	return modalState;
}

export default {
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			ban: {
				expiresAt: "1h"
			}
		};
	},
	computed: {
		...mapModalState("modals/editUser/MODAL_UUID", {
			userId: state => state.userId,
			user: state => state.user
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// When the userId changes, run init. There can be a delay between the modal opening and the required data (userId) being available
		userId() {
			// Note: is it possible for this to run before the socket is ready?
			this.init();
		}
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
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule(["modals", "editUser", this.modalUuid]);
	},
	methods: {
		init() {
			if (this.userId)
				this.socket.dispatch(
					`users.getUserFromId`,
					this.userId,
					res => {
						if (res.status === "success") {
							const user = res.data;
							this.setUser(user);

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
					}
				);
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
		...mapModalActions("modals/editUser/MODAL_UUID", ["setUser"]),
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
