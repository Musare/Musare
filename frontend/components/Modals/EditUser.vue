<template>
	<div>
		<modal title="Edit User">
			<div slot="body">
				<p class="control has-addons">
					<input
						v-model="editing.username"
						class="input is-expanded"
						type="text"
						placeholder="Username"
						autofocus
					/>
					<a class="button is-info" v-on:click="updateUsername()"
						>Update Username</a
					>
				</p>
				<p class="control has-addons">
					<input
						v-model="editing.email.address"
						class="input is-expanded"
						type="text"
						placeholder="Email Address"
						autofocus
					/>
					<a class="button is-info" v-on:click="updateEmail()"
						>Update Email Address</a
					>
				</p>
				<p class="control has-addons">
					<span class="select">
						<select v-model="editing.role">
							<option>default</option>
							<option>admin</option>
						</select>
					</span>
					<a class="button is-info" v-on:click="updateRole()"
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
					<a class="button is-error" v-on:click="banUser()"
						>Ban user</a
					>
				</p>
			</div>
			<div slot="footer">
				<!--button class='button is-warning'>
					<span>&nbsp;Send Verification Email</span>
				</button>
				<button class='button is-warning'>
					<span>&nbsp;Send Password Reset Email</span>
        </button-->
				<button class="button is-warning" v-on:click="removeSessions()">
					<span>&nbsp;Remove all sessions</span>
				</button>
				<button
					class="button is-danger"
					@click="
						closeModal({
							sector: 'admin',
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

import { Toast } from "vue-roaster";
import io from "../../io";
import Modal from "./Modal.vue";
import validation from "../../validation";

export default {
	components: { Modal },
	data() {
		return {
			ban: {
				expiresAt: "1h"
			}
		};
	},
	computed: {
		...mapState("admin/users", {
			editing: state => state.editing
		}),
		...mapState({
			userId: state => state.user.auth.userId
		})
	},
	methods: {
		updateUsername() {
			const { username } = this.editing;
			if (!validation.isLength(username, 2, 32))
				return Toast.methods.addToast(
					"Username must have between 2 and 32 characters.",
					8000
				);
			if (!validation.regex.azAZ09_.test(username))
				return Toast.methods.addToast(
					"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.",
					8000
				);

			return this.socket.emit(
				`users.updateUsername`,
				this.editing._id,
				username,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		updateEmail() {
			const { email } = this.editing;
			if (!validation.isLength(email, 3, 254))
				return Toast.methods.addToast(
					"Email must have between 3 and 254 characters.",
					8000
				);
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email)
			)
				return Toast.methods.addToast("Invalid email format.", 8000);

			return this.socket.emit(
				`users.updateEmail`,
				this.editing._id,
				email,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		updateRole() {
			this.socket.emit(
				`users.updateRole`,
				this.editing._id,
				this.editing.role,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (
						res.status === "success" &&
						this.editing.role === "default" &&
						this.editing._id === this.userId
					)
						window.location.reload();
				}
			);
		},
		banUser() {
			const { reason } = this.ban;
			if (!validation.isLength(reason, 1, 64))
				return Toast.methods.addToast(
					"Reason must have between 1 and 64 characters.",
					8000
				);
			if (!validation.regex.ascii.test(reason))
				return Toast.methods.addToast(
					"Invalid reason format. Only ascii characters are allowed.",
					8000
				);

			return this.socket.emit(
				`users.banUserById`,
				this.editing._id,
				this.ban.reason,
				this.ban.expiresAt,
				res => {
					Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		removeSessions() {
			this.socket.emit(`users.removeSessions`, this.editing._id, res => {
				Toast.methods.addToast(res.message, 4000);
			});
		},
		...mapActions("modals", ["closeModal"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			return socket;
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.save-changes {
	color: $white;
}

.tag:not(:last-child) {
	margin-right: 5px;
}

.select:after {
	border-color: $primary-color;
}
</style>
