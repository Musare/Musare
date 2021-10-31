<template>
	<div>
		<metadata title="Admin | Users" />
		<div class="container">
			<table class="table is-striped">
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
					<tr v-for="(user, index) in users" :key="index">
						<td>
							<img
								class="user-avatar"
								src="/assets/notes-transparent.png"
							/>
						</td>
						<td>{{ user._id }}</td>
						<td v-if="user.services.github">
							{{ user.services.github.id }}
						</td>
						<td v-else>
							Not Linked
						</td>
						<td v-if="user.hasPassword">
							Yes
						</td>
						<td v-else>
							Not Linked
						</td>
						<td>{{ user.username }}</td>
						<td>{{ user.role }}</td>
						<td>{{ user.email.address }}</td>
						<td>{{ user.email.verified }}</td>
						<td>{{ user.liked.length }}</td>
						<td>{{ user.disliked.length }}</td>
						<td>{{ user.songsRequested }}</td>
						<td>
							<button
								class="button is-primary"
								@click="edit(user)"
							>
								Edit
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<edit-user v-if="modals.editUser" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import EditUser from "../Modals/EditUser.vue";
import io from "../../io";

export default {
	components: { EditUser },
	data() {
		return {
			users: []
		};
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	methods: {
		edit(user) {
			this.editUser(user);
			this.openModal({ sector: "admin", modal: "editUser" });
		},
		init() {
			this.socket.emit("users.index", result => {
				if (result.status === "success") this.users = result.data;
			});
			this.socket.emit("apis.joinAdminRoom", "users", () => {});
		},
		...mapActions("admin/users", ["editUser"]),
		...mapActions("modals", ["openModal"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => this.init());
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

body {
	font-family: "Roboto", sans-serif;
}

.user-avatar {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}

td {
	vertical-align: middle;
}

.is-primary:focus {
	background-color: $primary-color !important;
}
</style>
