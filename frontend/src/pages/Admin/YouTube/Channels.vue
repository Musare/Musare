<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import {
	TableColumn,
	TableFilter,
	TableEvents,
	TableBulkActions
} from "@/types/advancedTable";
import utils from "@/utils";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);

const columnDefault = ref<TableColumn>({
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 200,
	maxWidth: 600
});
const columns = ref<TableColumn[]>([
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "youtubeId", "songId"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 85,
		defaultWidth: 85
	},
	{
		name: "channelId",
		displayName: "Channel ID",
		properties: ["channelId"],
		sortProperty: "channelId",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "_id",
		displayName: "Channel OID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 215,
		defaultWidth: 215
	},
	{
		name: "title",
		displayName: "Title",
		properties: ["title"],
		sortProperty: "title"
	},
	{
		name: "custom_url",
		displayName: "Custom URL",
		properties: ["custom_url"],
		sortProperty: "custom_url"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		properties: ["createdAt"],
		sortProperty: "createdAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Channel OID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "channelId",
		displayName: "Channel ID",
		property: "channelId",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "title",
		displayName: "Title",
		property: "title",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "custom_url",
		displayName: "Custom URL",
		property: "custom_url",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		property: "createdAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	}
]);
const events = ref<TableEvents>({
	adminRoom: "youtubeChannels",
	updated: {
		event: "admin.youtubeChannel.updated",
		id: "youtubeChannel._id",
		item: "youtubeChannel"
	},
	removed: {
		event: "admin.youtubeChannel.removed",
		id: "channelId"
	}
});
const bulkActions = ref<TableBulkActions>({ width: 200 });
const jobs = ref([]);

jobs.value.push({
	name: "Get missing YouTube channels from YouTube video's",
	socket: "youtube.getMissingChannels"
});
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube | Channels" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>YouTube Channels</h1>
				<p>Manage YouTube channel cache</p>
			</div>
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			:events="events"
			data-action="youtube.getChannels"
			name="admin-youtube-channels"
			:max-width="1140"
			:bulk-actions="bulkActions"
		>
			<template #column-channelId="slotProps">
				<a
					:href="`https://www.youtube.com/channels/${slotProps.item.channelId}`"
					target="_blank"
				>
					{{ slotProps.item.channelId }}
				</a>
			</template>
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
			<template #column-title="slotProps">
				<span :title="slotProps.item.title">{{
					slotProps.item.title
				}}</span>
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt).toString()">{{
					utils.getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
		</advanced-table>
	</div>
</template>
