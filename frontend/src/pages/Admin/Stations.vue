<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { TableColumn, TableFilter } from "@/types/advancedTable";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const { socket } = useWebsocketsStore();

const { hasPermission } = useUserAuthStore();

const columnDefault = ref<TableColumn>({
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 150,
	maxWidth: 600
});
const columns = ref<TableColumn[]>([
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "name"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: hasPermission("stations.remove") ? 129 : 85,
		defaultWidth: hasPermission("stations.remove") ? 129 : 85
	},
	{
		name: "_id",
		displayName: "Station ID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 230,
		defaultWidth: 230
	},
	{
		name: "name",
		displayName: "Name",
		properties: ["name"],
		sortProperty: "name"
	},
	{
		name: "displayName",
		displayName: "Display Name",
		properties: ["displayName"],
		sortProperty: "displayName"
	},
	{
		name: "description",
		displayName: "Description",
		properties: ["description"],
		sortProperty: "description",
		defaultVisibility: "hidden"
	},
	{
		name: "type",
		displayName: "Type",
		properties: ["type"],
		sortProperty: "type"
	},
	{
		name: "privacy",
		displayName: "Privacy",
		properties: ["privacy"],
		sortProperty: "privacy"
	},
	{
		name: "owner",
		displayName: "Owner",
		properties: ["owner", "type"],
		sortProperty: "owner",
		defaultWidth: 150
	},
	{
		name: "theme",
		displayName: "Theme",
		properties: ["theme"],
		sortProperty: "theme",
		defaultVisibility: "hidden"
	},
	{
		name: "requestsEnabled",
		displayName: "Requests Enabled",
		properties: ["requests.enabled"],
		sortProperty: "requests.enabled",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	},
	{
		name: "requestsAccess",
		displayName: "Requests Access",
		properties: ["requests.access"],
		sortProperty: "requests.access",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	},
	{
		name: "requestsLimit",
		displayName: "Requests Limit",
		properties: ["requests.limit"],
		sortProperty: "requests.limit",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	},
	{
		name: "autofillEnabled",
		displayName: "Autofill Enabled",
		properties: ["autofill.enabled"],
		sortProperty: "autofill.enabled",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	},
	{
		name: "autofillLimit",
		displayName: "Autofill Limit",
		properties: ["autofill.limit"],
		sortProperty: "autofill.limit",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	},
	{
		name: "autofillMode",
		displayName: "Autofill Mode",
		properties: ["autofill.mode"],
		sortProperty: "autofill.mode",
		minWidth: 180,
		defaultWidth: 180,
		defaultVisibility: "hidden"
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Station ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "name",
		displayName: "Name",
		property: "name",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "displayName",
		displayName: "Display Name",
		property: "displayName",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "description",
		displayName: "Description",
		property: "description",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "type",
		displayName: "Type",
		property: "type",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["official", "Official"],
			["community", "Community"]
		]
	},
	{
		name: "privacy",
		displayName: "Privacy",
		property: "privacy",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["public", "Public"],
			["unlisted", "Unlisted"],
			["private", "Private"]
		]
	},
	{
		name: "owner",
		displayName: "Owner",
		property: "owner",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "theme",
		displayName: "Theme",
		property: "theme",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["blue", "Blue"],
			["purple", "Purple"],
			["teal", "Teal"],
			["orange", "Orange"],
			["red", "Red"]
		]
	},
	{
		name: "requestsEnabled",
		displayName: "Requests Enabled",
		property: "requests.enabled",
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
	},
	{
		name: "requestsAccess",
		displayName: "Requests Access",
		property: "requests.access",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["owner", "Owner"],
			["user", "User"]
		]
	},
	{
		name: "requestsLimit",
		displayName: "Requests Limit",
		property: "requests.limit",
		filterTypes: [
			"numberLesserEqual",
			"numberLesser",
			"numberGreater",
			"numberGreaterEqual",
			"numberEquals"
		],
		defaultFilterType: "numberLesser"
	},
	{
		name: "autofillEnabled",
		displayName: "Autofill Enabled",
		property: "autofill.enabled",
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
	},
	{
		name: "autofillLimit",
		displayName: "Autofill Limit",
		property: "autofill.limit",
		filterTypes: [
			"numberLesserEqual",
			"numberLesser",
			"numberGreater",
			"numberGreaterEqual",
			"numberEquals"
		],
		defaultFilterType: "numberLesser"
	},
	{
		name: "autofillMode",
		displayName: "Autofill Mode",
		property: "autofill.mode",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["random", "Random"],
			["sequential", "Sequential"]
		]
	}
]);
const jobs = ref([]);
if (hasPermission("stations.clearEveryStationQueue"))
	jobs.value.push({
		name: "Clear every station queue",
		socket: "stations.clearEveryStationQueue"
	});

const { openModal } = useModalsStore();

const remove = stationId => {
	socket.dispatch(
		"stations.remove",
		stationId,
		res => new Toast(res.message)
	);
};
</script>

<template>
	<div class="admin-tab">
		<page-metadata title="Admin | Stations" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Stations</h1>
				<p>Manage stations or create an official station</p>
			</div>
			<div class="button-row">
				<button
					v-if="hasPermission('stations.create.official')"
					class="button is-primary"
					@click="
						openModal({
							modal: 'createStation',
							props: { official: true }
						})
					"
				>
					Create Station
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			model="stations"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'manageStation',
								props: {
									stationId: slotProps.item._id,
									sector: 'admin'
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="Manage Station"
						v-tippy
					>
						settings
					</button>
					<quick-confirm
						v-if="hasPermission('stations.remove')"
						@confirm="remove(slotProps.item._id)"
						:disabled="slotProps.item.removed"
					>
						<button
							class="button is-danger icon-with-button material-icons"
							content="Remove Station"
							v-tippy
						>
							delete_forever
						</button>
					</quick-confirm>
					<router-link
						:to="{ path: `/${slotProps.item.name}` }"
						target="_blank"
						class="button is-primary icon-with-button material-icons"
						:disabled="slotProps.item.removed"
						content="View Station"
						v-tippy
					>
						radio
					</router-link>
				</div>
			</template>
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
			<template #column-name="slotProps">
				<span :title="slotProps.item.name">{{
					slotProps.item.name
				}}</span>
			</template>
			<template #column-displayName="slotProps">
				<span :title="slotProps.item.displayName">{{
					slotProps.item.displayName
				}}</span>
			</template>
			<template #column-type="slotProps">
				<span :title="slotProps.item.type">{{
					slotProps.item.type
				}}</span>
			</template>
			<template #column-description="slotProps">
				<span :title="slotProps.item.description">{{
					slotProps.item.description
				}}</span>
			</template>
			<template #column-privacy="slotProps">
				<span :title="slotProps.item.privacy">{{
					slotProps.item.privacy
				}}</span>
			</template>
			<template #column-owner="slotProps">
				<span v-if="slotProps.item.type === 'official'">Musare</span>
				<user-link v-else :user-id="slotProps.item.owner._id" />
			</template>
			<template #column-theme="slotProps">
				<span :title="slotProps.item.theme">{{
					slotProps.item.theme
				}}</span>
			</template>
			<template #column-requestsEnabled="slotProps">
				<span :title="slotProps.item.requests.enabled">{{
					slotProps.item.requests.enabled
				}}</span>
			</template>
			<template #column-requestsAccess="slotProps">
				<span :title="slotProps.item.requests.access">{{
					slotProps.item.requests.access
				}}</span>
			</template>
			<template #column-requestsLimit="slotProps">
				<span :title="slotProps.item.requests.limit">{{
					slotProps.item.requests.limit
				}}</span>
			</template>
			<template #column-autofillEnabled="slotProps">
				<span :title="slotProps.item.autofill.enabled">{{
					slotProps.item.autofill.enabled
				}}</span>
			</template>
			<template #column-autofillLimit="slotProps">
				<span :title="slotProps.item.autofill.limit">{{
					slotProps.item.autofill.limit
				}}</span>
			</template>
			<template #column-autofillMode="slotProps">
				<span :title="slotProps.item.autofill.mode">{{
					slotProps.item.autofill.mode
				}}</span>
			</template>
		</advanced-table>
	</div>
</template>
