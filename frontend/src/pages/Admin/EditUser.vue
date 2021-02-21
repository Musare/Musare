<template>
	<div>
		<modal title="Edit User">
			<div slot="body" v-if="user && user._id">
				<p class="control has-addons">
					<input
						v-model="user.username"
						class="input is-expanded"
						type="text"
						placeholder="Username"
						autofocus
					/>
					<a class="button is-info" @click="updateUsername()"
						>Update Username</a
					>
				</p>
				<p class="control has-addons">
					<input
						v-model="user.email.address"
						class="input is-expanded"
						type="text"
						placeholder="Email Address"
						autofocus
					/>
					<a class="button is-info" @click="updateEmail()"
						>Update Email Address</a
					>
				</p>
				<p class="control has-addons">
					<span class="select">
						<select v-model="user.role">
							<option>default</option>
							<option>admin</option>
						</select>
					</span>
					<a class="button is-info" @click="updateRole()"
						>Update Role</a
					>
				</p>
				<hr />
				<p class="control has-addons">
					<span class="select">
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
					<input
						v-model="ban.reason"
						class="input is-expanded"
						type="text"
						placeholder="Ban reason"
						autofocus
					/>
					<a class="button is-error" @click="banUser()">Ban user</a>
				</p>
			</div>
			<div slot="footer">
				<!--button class='button is-warning'>
					<span>&nbsp;Send Verification Email</span>
				</button>
				<button class='button is-warning'>
					<span>&nbsp;Send Password Reset Email</span>
        </button-->
				<button class="button is-warning" @click="removeSessions()">
					<span>&nbsp;Remove all sessions</span>
				</button>
				<button
					class="button is-danger"
					@click="
						closeModal({
							sector,
							modal: 'editUser'
						})
					"
				>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import Toast from "toasters";
import io from "../../io";
import Modal from "../../components/Modal.vue";
import validation from "../../validation";

export default {
	components: { Modal },
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
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit(`users.getUserFromId`, this.userId, res => {
				if (res.status === "success") {
					const user = res.data;
					this.editUser(user);
				} else {
					new Toast({
						content: "User with that ID not found",
						timeout: 3000
					});
					this.closeModal({
						sector: this.sector,
						modal: "editUser"
					});
				}
			});

			return socket;
		});
	},
	methods: {
		updateUsername() {
			const { username } = this.user;
			if (!validation.isLength(username, 2, 32))
				return new Toast({
					content: "Username must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.custom("a-zA-Z0-9_-").test(username))
				return new Toast({
					content:
						"Invalid username format. Allowed characters: a-z, A-Z, 0-9, _ and -.",
					timeout: 8000
				});

			return this.socket.emit(
				`users.updateUsername`,
				this.user._id,
				username,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		updateEmail() {
			const email = this.user.email.address;
			if (!validation.isLength(email, 3, 254))
				return new Toast({
					content: "Email must have between 3 and 254 characters.",
					timeout: 8000
				});
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email) ||
				!validation.regex.ascii.test(email)
			)
				return new Toast({
					content: "Invalid email format.",
					timeout: 8000
				});

			return this.socket.emit(
				`users.updateEmail`,
				this.user._id,
				email,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		updateRole() {
			this.socket.emit(
				`users.updateRole`,
				this.user._id,
				this.user.role,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		banUser() {
			const { reason } = this.ban;
			if (!validation.isLength(reason, 1, 64))
				return new Toast({
					content: "Reason must have between 1 and 64 characters.",
					timeout: 8000
				});
			if (!validation.regex.ascii.test(reason))
				return new Toast({
					content:
						"Invalid reason format. Only ascii characters are allowed.",
					timeout: 8000
				});

			return this.socket.emit(
				`users.banUserById`,
				this.user._id,
				this.ban.reason,
				this.ban.expiresAt,
				res => {
					new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		removeSessions() {
			this.socket.emit(`users.removeSessions`, this.user._id, res => {
				new Toast({ content: res.message, timeout: 4000 });
			});
		},
		...mapActions("modals/editUser", ["editUser"]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
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
