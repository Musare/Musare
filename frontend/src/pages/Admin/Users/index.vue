<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const ProfilePicture = defineAsyncComponent(
	() => import("@/components/ProfilePicture.vue")
);

const route = useRoute();

const columnDefault = ref(<TableColumn>{
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 150,
	maxWidth: 600
});
const columns = ref(<TableColumn[]>[
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "username"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 85,
		defaultWidth: 85
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
	{
		name: "hasPassword",
		displayName: "Has Password",
		properties: ["hasPassword"],
		sortProperty: "hasPassword"
	},
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
]);
const filters = ref(<TableFilter[]>[
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
	{
		name: "hasPassword",
		displayName: "Has Password",
		property: "hasPassword",
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
	},
	{
		name: "role",
		displayName: "Role",
		property: "role",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["admin", "Admin"],
			["moderator", "Moderator"],
			["user", "User"]
		]
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
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
	},
	{
		name: "songsRequested",
		displayName: "Songs Requested",
		property: "statistics.songsRequested",
		filterTypes: [
			"numberLesserEqual",
			"numberLesser",
			"numberGreater",
			"numberGreaterEqual",
			"numberEquals"
		],
		defaultFilterType: "numberLesser"
	}
]);
const events = ref(<TableEvents>{
	adminRoom: "users",
	updated: {
		event: "admin.user.updated",
		id: "user._id",
		item: "user"
	},
	removed: {
		event: "user.removed",
		id: "userId"
	}
});

const { openModal } = useModalsStore();

const { hasPermission } = useUserAuthStore();

const edit = userId => {
	openModal({ modal: "editUser", data: { userId } });
};

onMounted(() => {
	if (route.query.userId) edit(route.query.userId);
});
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | Users" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Users</h1>
				<p>Manage users</p>
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			data-action="users.getData"
			name="admin-users"
			:max-width="1200"
			:events="events"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						v-if="hasPermission('users.update')"
						class="button is-primary icon-with-button material-icons"
						@click="edit(slotProps.item._id)"
						:disabled="slotProps.item.removed"
						content="Edit User"
						v-tippy
					>
						edit
					</button>
					<router-link
						:to="{ path: `/u/${slotProps.item.username}` }"
						target="_blank"
						class="button is-primary icon-with-button material-icons"
						:disabled="slotProps.item.removed"
						content="View Profile"
						v-tippy
					>
						person
					</router-link>
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
			<template #column-hasPassword="slotProps">
				<span :title="slotProps.item.hasPassword">{{
					slotProps.item.hasPassword
				}}</span>
			</template>
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
</template>

<style lang="less" scoped>
.profile-picture {
	max-width: 50px !important;
	max-height: 50px !important;
}

:deep(.profile-picture.using-initials span) {
	font-size: 20px !important; // 2/5th of .profile-picture height/width
}
</style>
