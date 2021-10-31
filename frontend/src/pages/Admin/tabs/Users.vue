<template>
	<div>
		<page-metadata title="Admin | Users" />
		<div class="container">
			<h2 v-if="dataRequests.length > 0">Data Requests</h2>

			<table class="table is-striped" v-if="dataRequests.length > 0">
				<thead>
					<tr>
						<td>User ID</td>
						<td>Request Type</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(request, index) in dataRequests" :key="index">
						<td>{{ request.userId }}</td>
						<td>
							{{
								request.type === "remove"
									? "Remove all associated data"
									: request.type
							}}
						</td>
						<td>
							<button
								class="button is-primary"
								@click="resolveDataRequest(request._id)"
							>
								Resolve
							</button>
						</td>
					</tr>
				</tbody>
			</table>

			<h1 id="page-title">Users</h1>

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
						<td>Songs Requested</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in users" :key="user._id">
						<td>
							<profile-picture
								:avatar="user.avatar"
								:name="user.name ? user.name : user.username"
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
import { defineAsyncComponent } from "vue";
import Toast from "toasters";

import ProfilePicture from "@/components/ProfilePicture.vue";
import ws from "@/ws";

export default {
	components: {
		EditUser: defineAsyncComponent(() =>
			import("@/components/modals/EditUser.vue")
		),
		ProfilePicture
	},
	data() {
		return {
			editingUserId: "",
			dataRequests: [],
			users: []
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on("event:admin.dataRequests.created", res =>
			this.dataRequests.push(res.data.request)
		);

		this.socket.on("event:admin.dataRequests.resolved", res => {
			this.dataRequests = this.dataRequests.filter(
				request => request._id !== res.data.dataRequestId
			);
		});
	},
	methods: {
		edit(user) {
			this.editingUserId = user._id;
			this.openModal("editUser");
		},
		init() {
			this.socket.dispatch("users.index", res => {
				if (res.status === "success") {
					this.users = res.data.users;
					if (this.$route.query.userId) {
						const user = this.users.find(
							user => user._id === this.$route.query.userId
						);
						if (user) this.edit(user);
					}
				}
			});

			this.socket.dispatch("dataRequests.index", res => {
				if (res.status === "success")
					this.dataRequests = res.data.requests;
			});

			this.socket.dispatch("apis.joinAdminRoom", "users", () => {});
		},
		resolveDataRequest(id) {
			this.socket.dispatch("dataRequests.resolve", id, res => {
				if (res.status === "success") new Toast(res.message);
			});
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

h2 {
	font-size: 30px;
	text-align: center;

	@media only screen and (min-width: 700px) {
		font-size: 35px;
	}
}

.profile-picture {
	max-width: 50px !important;
	max-height: 50px !important;
}

/deep/ .profile-picture.using-initials span {
	font-size: 20px; // 2/5th of .profile-picture height/width
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
