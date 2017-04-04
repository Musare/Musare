<template>
	<div>
		<modal title='Edit User'>
			<div slot='body'>
				<p class="control has-addons">
					<input class='input is-expanded' type='text' placeholder='Username' v-model='editing.username' autofocus>
					<a class="button is-info" @click='updateUsername()'>Update Username</a>
				</p>
				<p class="control has-addons">
					<input class='input is-expanded' type='text' placeholder='Username' v-model='editing.email' autofocus>
					<a class="button is-info" @click='updateEmail()'>Update Email Address</a>
				</p>
				<p class="control has-addons">
					<span class="select">
						<select v-model="editing.role">
							<option>default</option>
							<option>admin</option>
						</select>
					</span>
					<a class="button is-info" @click='updateRole()'>Update Role</a>
				</p>
				<hr>
				<p class="control has-addons">
					<input class='input is-expanded' type='text' placeholder='Ban reason' v-model='ban.reason' autofocus>
					<a class="button is-error" @click='banUser()'>Ban user</a>
				</p>
			</div>
			<div slot='footer'>
				<!--button class='button is-warning'>
					<span>&nbsp;Send Verification Email</span>
				</button>
				<button class='button is-warning'>
					<span>&nbsp;Send Password Reset Email</span>
				</button-->
				<button class='button is-warning' @click='removeSessions()'>
					<span>&nbsp;Remove all sessions</span>
				</button>
				<button class='button is-danger' @click='$parent.toggleModal()'>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
	import io from '../../io';
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';
	import validation from '../../validation';

	export default {
		components: { Modal },
		data() {
			return {
				editing: {},
				ban: {}
			}
		},
		methods: {
			updateUsername: function () {
				const username = this.editing.username;
				if (!validation.isLength(username, 2, 32)) return Toast.methods.addToast('Username must have between 2 and 32 characters.', 8000);
				if (!validation.regex.azAZ09_.test(username)) return Toast.methods.addToast('Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.', 8000);


				this.socket.emit(`users.updateUsername`, this.editing._id, username, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			updateEmail: function () {
				const email = this.editing.email;
				if (!validation.isLength(email, 3, 254)) return Toast.methods.addToast('Email must have between 3 and 254 characters.', 8000);
				if (email.indexOf('@') !== email.lastIndexOf('@') || !validation.regex.emailSimple.test(email)) return Toast.methods.addToast('Invalid email format.', 8000);


				this.socket.emit(`users.updateEmail`, this.editing._id, email, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			updateRole: function () {
				this.socket.emit(`users.updateRole`, this.editing._id, this.editing.role, res => {
					Toast.methods.addToast(res.message, 4000);
					if (
							res.status === 'success' &&
							this.editing.role === 'default' &&
							this.editing._id === this.$parent.$parent.$parent.userId
					) location.reload();
				});
			},
			banUser: function () {
				const reason = this.ban.reason;
				if (!validation.isLength(reason, 1, 64)) return Toast.methods.addToast('Reason must have between 1 and 64 characters.', 8000);
				if (!validation.regex.ascii.test(reason)) return Toast.methods.addToast('Invalid reason format. Only ascii characters are allowed.', 8000);

				this.socket.emit(`users.banUserById`, this.editing._id, this.ban.reason, '1h', res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			removeSessions: function () {
				this.socket.emit(`users.removeSessions`, this.editing._id, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket(socket => _this.socket = socket );
		},
		events: {
			closeModal: function () {
				this.$parent.modals.editUser = false;
			},
			editUser: function (user) {
				this.editing = {
					_id: user._id,
					username: user.username,
					email: user.email.address,
					role: user.role
				};
				this.$parent.toggleModal();
			}
		}
	}
</script>

<style type='scss' scoped>
	.save-changes { color: #fff; }

	.tag:not(:last-child) { margin-right: 5px; }

	.select:after { border-color: #029ce3; }
</style>
