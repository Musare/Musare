<template>
	<div>
		<metadata title="Admin | Users" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td class="ppRow">Profile Picture</td>
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
							<profile-picture
								:avatar="user.avatar"
								:name="user.name"
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
import { mapState, mapActions, mapGetters } from "vuex";

import ProfilePicture from "../../../components/ui/ProfilePicture.vue";
import ws from "../../../ws";

export default {
	components: {
		EditUser: () => import("../../../components/modals/EditUser.vue"),
		ProfilePicture
	},
	data() {
		return {
			editingUserId: "",
			users: []
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals.admin
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());
	},
	methods: {
		edit(user) {
			this.editingUserId = user._id;
			this.openModal({ sector: "admin", modal: "editUser" });
		},
		init() {
			this.socket.dispatch("users.index", res => {
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
			this.socket.dispatch("apis.joinAdminRoom", "users", () => {});
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}
}

body {
	font-family: "Hind", sans-serif;
}

.profile-picture {
	max-width: 50px !important;
	max-height: 50px !important;
	font-size: 25px !important;
}

td {
	vertical-align: middle;

	&.ppRow {
		max-width: 50px;
	}
}

.is-primary:focus {
	background-color: var(--primary-color) !important;
}
</style>
