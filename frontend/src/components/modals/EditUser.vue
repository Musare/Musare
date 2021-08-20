<template>
	<div>
		<modal title="Edit User">
			<template #body v-if="user && user._id">
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
			</template>
			<template #footer>
				<!--button class='button is-warning'>
					<span>&nbsp;Send Verification Email</span>
				</button>
				<button class='button is-warning'>
					<span>&nbsp;Send Password Reset Email</span>
        </button-->
				<button class="button is-warning" @click="removeSessions()">
					<span>&nbsp;Remove all sessions</span>
				</button>
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
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.socket.dispatch(`users.getUserFromId`, this.userId, res => {
				if (res.status === "success") {
					const user = res.data;
					this.editUser(user);
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
