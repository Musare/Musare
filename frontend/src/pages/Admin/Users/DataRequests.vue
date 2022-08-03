<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);

const { socket } = useWebsocketsStore();

const columnDefault = ref({
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 230,
	maxWidth: 600
});
const columns = ref([
	{
		name: "options",
		displayName: "Options",
		properties: ["_id"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 76,
		defaultWidth: 76
	},
	{
		name: "resolved",
		displayName: "Resolved",
		properties: ["resolved"],
		sortProperty: "resolved",
		minWidth: 150
	},
	{
		name: "type",
		displayName: "Type",
		properties: ["type"],
		sortable: false
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
]);
const filters = ref([
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
		name: "resolved",
		displayName: "Resolved",
		property: "resolved",
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
	}
]);
const events = ref({
	adminRoom: "users",
	updated: {
		event: "admin.dataRequests.updated",
		id: "dataRequest._id",
		item: "dataRequest"
	}
});

const resolveDataRequest = (id, resolved) => {
	socket.dispatch("dataRequests.resolve", id, resolved, res => {
		if (res.status === "success") new Toast(res.message);
	});
};
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | Users | Data Requests" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Data Requests</h1>
				<p>Manage data requests made by users</p>
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			data-action="dataRequests.getData"
			name="admin-data-requests"
			:max-width="1200"
			:events="events"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						v-if="slotProps.item.resolved"
						class="button is-danger material-icons icon-with-button"
						@click="resolveDataRequest(slotProps.item._id, false)"
						:disabled="slotProps.item.removed"
						content="Unresolve Data Request"
						v-tippy
					>
						remove_done
					</button>
					<button
						v-else
						class="button is-success material-icons icon-with-button"
						@click="resolveDataRequest(slotProps.item._id, true)"
						:disabled="slotProps.item.removed"
						content="Resolve Data Request"
						v-tippy
					>
						done_all
					</button>
				</div>
			</template>
			<template #column-resolved="slotProps">
				<span :title="slotProps.item.resolved">{{
					slotProps.item.resolved
				}}</span>
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
	</div>
</template>
