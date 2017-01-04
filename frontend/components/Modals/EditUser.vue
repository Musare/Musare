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
			</div>
			<div slot='footer'>
				<!--button class='button is-warning'>
					<span>&nbsp;Send Verification Email</span>
				</button>
				<button class='button is-warning'>
					<span>&nbsp;Send Password Reset Email</span>
				</button-->
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

	export default {
		components: { Modal },
		data() {
			return {
				editing: {},
				video: {
					player: null,
					paused: false,
					playerReady: false
				}
			}
		},
		methods: {
			updateUsername: function () {
				this.socket.emit(`users.updateUsername`, this.editing._id, this.editing.username, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			updateEmail: function () {
				this.socket.emit(`users.updateEmail`, this.editing._id, this.editing.email, res => {
					Toast.methods.addToast(res.message, 4000);
				});
			},
			updateRole: function () {
				let _this = this;
				this.socket.emit(`users.updateRole`, this.editing._id, this.editing.role, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === 'success' && _this.editing.role === 'default') location.reload();
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
</style>