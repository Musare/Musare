<template>
	<div>
		<page-metadata title="Admin | Users" />
		<div class="container">
			<h2>Data Requests</h2>

			<advanced-table
				:column-default="dataRequests.columnDefault"
				:columns="dataRequests.columns"
				:filters="dataRequests.filters"
				data-action="dataRequests.getData"
				name="admin-data-requests"
				max-width="1200"
				:query="false"
				:events="dataRequests.events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<quick-confirm
							placement="right"
							@confirm="resolveDataRequest(slotProps.item._id)"
							:disabled="slotProps.item.removed"
						>
							<button
								class="
									button
									is-success
									icon-with-button
									material-icons
								"
								content="Resolve Data Request"
								v-tippy
							>
								done_all
							</button>
						</quick-confirm>
					</div>
				</template>
				<template #column-type="slotProps">
					<span
						:title="
							slotProps.item.type
								? 'Remove all associated data'
								: slotProps.item.type
						"
						>{{
							slotProps.item.type
								? "Remove all associated data"
								: slotProps.item.type
						}}</span
					>
				</template>
				<template #column-userId="slotProps">
					<span :title="slotProps.item.userId">{{
						slotProps.item.userId
					}}</span>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
			</advanced-table>

			<h1 id="page-title">Users</h1>

			<advanced-table
				:column-default="users.columnDefault"
				:columns="users.columns"
				:filters="users.filters"
				data-action="users.getData"
				name="admin-users"
				max-width="1200"
				:events="users.events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="
								button
								is-primary
								icon-with-button
								material-icons
							"
							@click="edit(slotProps.item._id)"
							:disabled="slotProps.item.removed"
							content="Edit User"
							v-tippy
						>
							edit
						</button>
					</div>
				</template>
				<template #column-profilePicture="slotProps">
					<profile-picture
						:avatar="slotProps.item.avatar"
						:name="
							slotProps.item.name
								? slotProps.item.name
								: slotProps.item.username
						"
					/>
				</template>
				<template #column-name="slotProps">
					<span :title="slotProps.item.name">{{
						slotProps.item.name
					}}</span>
				</template>
				<template #column-username="slotProps">
					<span :title="slotProps.item.username">{{
						slotProps.item.username
					}}</span>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
				<template #column-githubId="slotProps">
					<span
						v-if="slotProps.item.services.github"
						:title="slotProps.item.services.github.id"
						>{{ slotProps.item.services.github.id }}</span
					>
				</template>
				<!-- <template #column-hasPassword="slotProps">
					<span :title="slotProps.item.hasPassword">{{
						slotProps.item.hasPassword
					}}</span>
				</template> -->
				<template #column-role="slotProps">
					<span :title="slotProps.item.role">{{
						slotProps.item.role
					}}</span>
				</template>
				<template #column-emailAddress="slotProps">
					<span :title="slotProps.item.email.address">{{
						slotProps.item.email.address
					}}</span>
				</template>
				<template #column-emailVerified="slotProps">
					<span :title="slotProps.item.email.verified">{{
						slotProps.item.email.verified
					}}</span>
				</template>
				<template #column-songsRequested="slotProps">
					<span :title="slotProps.item.statistics.songsRequested">{{
						slotProps.item.statistics.songsRequested
					}}</span>
				</template>
			</advanced-table>
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

import AdvancedTable from "@/components/AdvancedTable.vue";
import ProfilePicture from "@/components/ProfilePicture.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";
// import ws from "@/ws";

export default {
	components: {
		EditUser: defineAsyncComponent(() =>
			import("@/components/modals/EditUser.vue")
		),
		AdvancedTable,
		ProfilePicture,
		QuickConfirm
	},
	data() {
		return {
			editingUserId: "",
			dataRequests: {
				columnDefault: {
					sortable: true,
					hidable: true,
					defaultVisibility: "shown",
					draggable: true,
					resizable: true,
					minWidth: 150,
					maxWidth: 600
				},
				columns: [
					{
						name: "options",
						displayName: "Edit",
						properties: ["_id"],
						sortable: false,
						hidable: false,
						resizable: false,
						minWidth: 51,
						defaultWidth: 51
					},
					{
						name: "type",
						displayName: "Type",
						properties: ["type"],
						sortProperty: "type"
					},
					{
						name: "userId",
						displayName: "User ID",
						properties: ["userId"],
						sortProperty: "userId"
					},
					{
						name: "_id",
						displayName: "Request ID",
						properties: ["_id"],
						sortProperty: "_id"
					}
				],
				filters: [
					{
						name: "_id",
						displayName: "Request ID",
						property: "_id",
						filterTypes: ["exact"],
						defaultFilterType: "exact"
					},
					{
						name: "userId",
						displayName: "User ID",
						property: "userId",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					{
						name: "type",
						displayName: "Type",
						property: "type",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					}
				],
				events: {
					adminRoom: "users",
					removed: {
						event: "admin.dataRequests.resolved",
						id: "dataRequestId"
					}
				}
			},
			users: {
				columnDefault: {
					sortable: true,
					hidable: true,
					defaultVisibility: "shown",
					draggable: true,
					resizable: true,
					minWidth: 150,
					maxWidth: 600
				},
				columns: [
					{
						name: "options",
						displayName: "Edit",
						properties: ["_id"],
						sortable: false,
						hidable: false,
						resizable: false,
						minWidth: 51,
						defaultWidth: 51
					},
					{
						name: "profilePicture",
						displayName: "Image",
						properties: ["avatar", "name", "username"],
						sortable: false,
						resizable: false,
						minWidth: 71,
						defaultWidth: 71
					},
					{
						name: "name",
						displayName: "Display Name",
						properties: ["name"],
						sortProperty: "name"
					},
					{
						name: "username",
						displayName: "Username",
						properties: ["username"],
						sortProperty: "username"
					},
					{
						name: "_id",
						displayName: "User ID",
						properties: ["_id"],
						sortProperty: "_id",
						minWidth: 230,
						defaultWidth: 230
					},
					{
						name: "githubId",
						displayName: "GitHub ID",
						properties: ["services.github.id"],
						sortProperty: "services.github.id",
						minWidth: 115,
						defaultWidth: 115
					},
					// {
					// 	name: "hasPassword",
					// 	displayName: "Has Password",
					// 	properties: ["hasPassword"],
					// 	sortProperty: "hasPassword"
					// }
					{
						name: "role",
						displayName: "Role",
						properties: ["role"],
						sortProperty: "role",
						minWidth: 90,
						defaultWidth: 90
					},
					{
						name: "emailAddress",
						displayName: "Email Address",
						properties: ["email.address"],
						sortProperty: "email.address",
						defaultVisibility: "hidden"
					},
					{
						name: "emailVerified",
						displayName: "Email Verified",
						properties: ["email.verified"],
						sortProperty: "email.verified",
						defaultVisibility: "hidden",
						minWidth: 140,
						defaultWidth: 140
					},
					{
						name: "songsRequested",
						displayName: "Songs Requested",
						properties: ["statistics.songsRequested"],
						sortProperty: "statistics.songsRequested",
						minWidth: 170,
						defaultWidth: 170
					}
				],
				filters: [
					{
						name: "_id",
						displayName: "User ID",
						property: "_id",
						filterTypes: ["exact"],
						defaultFilterType: "exact"
					},
					{
						name: "name",
						displayName: "Display Name",
						property: "name",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					{
						name: "username",
						displayName: "Username",
						property: "username",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					{
						name: "githubId",
						displayName: "GitHub ID",
						property: "services.github.id",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					// {
					// 	name: "hasPassword",
					// 	displayName: "Has Password",
					// 	property: "hasPassword",
					// 	filterTypes: ["contains", "exact", "regex"],
					// 	defaultFilterType: "contains"
					// },
					{
						name: "role",
						displayName: "Role",
						property: "role",
						filterTypes: ["array", "regex"],
						defaultFilterType: "array",
						filterValues: ["admin", "default"]
					},
					{
						name: "emailAddress",
						displayName: "Email Address",
						property: "email.address",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					{
						name: "emailVerified",
						displayName: "Email Verified",
						property: "email.verified",
						filterTypes: ["contains", "exact", "regex"],
						defaultFilterType: "contains"
					},
					{
						name: "songsRequested",
						displayName: "Songs Requested",
						property: "statistics.songsRequested",
						filterTypes: [
							"numberLesser",
							"numberGreater",
							"numberEquals",
							"exact",
							"regex"
						],
						defaultFilterType: "numberLesser"
					}
				],
				events: {
					adminRoom: "users",
					removed: {
						event: "user.removed",
						id: "userId"
					}
				}
			}
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
		if (this.$route.query.userId) this.edit(this.$route.query.userId);
	},
	methods: {
		edit(userId) {
			this.editingUserId = userId;
			this.openModal("editUser");
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
#page-title {
	margin: 30px 0;
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
</style>
