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
						<!-- <td>Likes</td>
						<td>Dislikes</td> -->
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
						<td v-else>Not Linked</td>
						<td v-if="user.hasPassword">Yes</td>
						<td v-else>Not Linked</td>
						<td>
							<a :href="'/u/' + user.username" target="_blank">{{
								user.username
							}}</a>
						</td>
						<td>{{ user.role }}</td>
						<td>{{ user.email.address }}</td>
						<td>{{ user.email.verified }}</td>
						<!-- <td>{{ user.liked.length }}</td>
						<td>{{ user.disliked.length }}</td> -->
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
		<edit-user
			v-if="modals.editUser"
			:user-id="editingUserId"
			sector="admin"
		/>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import EditUser from "../EditUser.vue";
import io from "../../../io";

export default {
	components: { EditUser },
	data() {
		return {
			editingUserId: "",
			users: []
		};
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	mounted() {
		console.log("mounted");

		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => this.init());
		});
	},
	methods: {
		edit(user) {
			this.editingUserId = user._id;
			this.openModal({ sector: "admin", modal: "editUser" });
		},
		init() {
			this.socket.emit("users.index", res => {
				console.log(res);
				if (res.status === "success") {
					this.users = res.data;
					if (this.$route.query.userId) {
						const user = this.users.find(
							user => user._id === this.$route.query.userId
						);
						if (user) this.edit(user);
					}
				}
			});
			this.socket.emit("apis.joinAdminRoom", "users", () => {});
		},
		...mapActions("modals", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

.night-mode {
	.table {
		color: $night-mode-text;
		background-color: $night-mode-bg-secondary;

		thead tr {
			background: $night-mode-bg-secondary;
			td {
				color: #fff;
			}
		}

		tbody tr:hover {
			background-color: #111 !important;
		}

		tbody tr:nth-child(even) {
			background-color: #444;
		}

		strong {
			color: $night-mode-text;
		}
	}
}

body {
	font-family: "Hind", sans-serif;
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
