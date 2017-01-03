<template>
	<div class='container'>
		<table class='table is-striped'>
			<thead>
			<tr>
				<td>Profile Picture</td>
				<td>User ID</td>
				<td>GitHub ID</td>
				<td>Password</td>
				<td>Username</td>
				<td>Role</td>
				<td>Email Address</td>
				<td>Email Verified</td>
				<td>Likes</td>
				<td>Dislikes</td>
				<td>Songs Requested</td>
				<td>Options</td>
			</tr>
			</thead>
			<tbody>
			<tr v-for='(index, user) in users' track-by='$index'>
				<td>
					<img class='user-avatar' src='/assets/notes-transparent.png'>
				</td>
				<td>{{ user._id }}</td>
				<td v-if='user.services.github'>{{ user.services.github.id }}</td>
				<td v-else>Not Linked</td>
				<td v-if='user.hasPassword'>Yes</td>
				<td v-else>Not Linked</td>
				<td>{{ user.username }}</td>
				<td>{{ user.role }}</td>
				<td>{{ user.email.address }}</td>
				<td>{{ user.email.verified }}</td>
				<td>{{ user.liked.length }}</td>
				<td>{{ user.disliked.length }}</td>
				<td>{{ user.songsRequested }}</td>
				<td>
					<button class='button is-primary' @click='edit(user)'>Edit</button>
				</td>
			</tr>
			</tbody>
		</table>
	</div>
	<edit-user v-show='modals.editUser'></edit-user>
</template>

<script>
	import EditUser from '../Modals/EditUser.vue';
	import io from '../../io';

	export default {
		components: { EditUser },
		data() {
			return {
				users: [],
				modals: { editUser: false }
			}
		},
		methods: {
			toggleModal: function () {
				this.modals.editUser = !this.modals.editUser;
			},
			edit: function (user) {
				this.$broadcast('editUser', user);
			},
			init: function () {
				let _this = this;
				_this.socket.emit('users.index', result => {
					if (result.status === 'success') _this.users = result.data;
				});
				_this.socket.emit('apis.joinAdminRoom', 'users', () => {});
				_this.socket.on('event:user.username.changed', username => {
					_this.$parent.$parent.username = username;
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket(socket => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				io.onConnect(() => _this.init());
			});
		}
	}
</script>

<style lang='scss' scoped>
	body { font-family: 'Roboto', sans-serif; }

	.user-avatar {
		display: block;
		max-width: 50px;
		margin: 0 auto;
	}

	td { vertical-align: middle; }

	.is-primary:focus { background-color: #029ce3 !important; }
</style>
