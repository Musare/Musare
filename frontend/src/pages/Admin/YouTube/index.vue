<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";
import utils from "@/utils";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);
const LineChart = defineAsyncComponent(
	() => import("@/components/LineChart.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const route = useRoute();

const { socket } = useWebsocketsStore();

const quotaStatus = ref<
	Record<
		string,
		{
			title: string;
			quotaUsed: number;
			limit: number;
			quotaExceeded: boolean;
		}
	>
>({});
const fromDate = ref();
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
		properties: ["_id"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 85,
		defaultWidth: 85
	},
	{
		name: "quotaCost",
		displayName: "Quota Cost",
		properties: ["quotaCost"],
		sortProperty: "quotaCost",
		minWidth: 150,
		defaultWidth: 150
	},
	{
		name: "timestamp",
		displayName: "Timestamp",
		properties: ["date"],
		sortProperty: "date",
		minWidth: 150,
		defaultWidth: 150
	},
	{
		name: "url",
		displayName: "URL",
		properties: ["url"],
		sortProperty: "url"
	},
	{
		name: "_id",
		displayName: "Request ID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 230,
		defaultWidth: 230
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Request ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "quotaCost",
		displayName: "Quota Cost",
		property: "quotaCost",
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
		name: "timestamp",
		displayName: "Timestamp",
		property: "date",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	},
	{
		name: "url",
		displayName: "URL",
		property: "url",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	}
]);
const events = ref<TableEvents>({
	adminRoom: "youtube",
	removed: {
		event: "admin.youtubeApiRequest.removed",
		id: "requestId"
	}
});
const charts = ref({
	quotaUsage: {},
	apiRequests: {}
});
const jobs = ref([
	{
		name: "Reset stored API requests",
		socket: "youtube.resetStoredApiRequests"
	}
]);

const { openModal } = useModalsStore();

const removeApiRequest = requestId => {
	socket.dispatch(
		"youtube.removeStoredApiRequest",
		requestId,
		res => new Toast(res.message)
	);
};

onMounted(() => {
	socket.onConnect(() => {
		if (route.query.fromDate) fromDate.value = route.query.fromDate;

		socket.dispatch("youtube.getQuotaStatus", fromDate.value, res => {
			if (res.status === "success") quotaStatus.value = res.data.status;
		});

		socket.dispatch(
			"youtube.getQuotaChartData",
			"days",
			new Date().setDate(new Date().getDate() - 6),
			new Date().setDate(new Date().getDate() + 1),
			"usage",
			res => {
				if (res.status === "success")
					charts.value.quotaUsage = res.data;
			}
		);

		socket.dispatch(
			"youtube.getQuotaChartData",
			"days",
			new Date().setDate(new Date().getDate() - 6),
			new Date().setDate(new Date().getDate() + 1),
			"count",
			res => {
				if (res.status === "success")
					charts.value.apiRequests = res.data;
			}
		);
	});
});
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>YouTube API</h1>
				<p>
					Analyze YouTube quota usage and API requests made on this
					instance
				</p>
			</div>
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<div v-if="charts" class="card charts">
			<div class="chart">
				<h4 class="has-text-centered">Quota Usage</h4>
				<line-chart
					v-if="charts.quotaUsage"
					chart-id="youtube-quota-usage"
					:data="charts.quotaUsage"
				/>
			</div>
			<div class="chart">
				<h4 class="has-text-centered">API Requests</h4>
				<line-chart
					v-if="charts.apiRequests"
					chart-id="youtube-api-requests"
					:data="charts.apiRequests"
				/>
			</div>
		</div>
		<div class="card">
			<h4>Quota Stats</h4>
			<hr class="section-horizontal-rule" />
			<div class="quotas">
				<div
					v-for="[quotaName, quotaObject] in Object.entries(
						quotaStatus
					)"
					:key="quotaName"
					class="card quota"
				>
					<h5>{{ quotaObject.title }}</h5>
					<p>
						<strong>Quota used:</strong> {{ quotaObject.quotaUsed }}
					</p>
					<p><strong>Limit:</strong> {{ quotaObject.limit }}</p>
					<p>
						<strong>Quota exceeded:</strong>
						{{ quotaObject.quotaExceeded }}
					</p>
				</div>
			</div>
		</div>
		<div class="card">
			<h4>API Requests</h4>
			<hr class="section-horizontal-rule" />
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				:events="events"
				data-action="youtube.getApiRequests"
				name="admin-youtube-api-requests"
				:max-width="1140"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="button is-primary icon-with-button material-icons"
							@click="
								openModal({
									modal: 'viewApiRequest',
									props: {
										requestId: slotProps.item._id,
										removeAction:
											'youtube.removeStoredApiRequest'
									}
								})
							"
							:disabled="slotProps.item.removed"
							content="View API Request"
							v-tippy
						>
							open_in_full
						</button>
						<quick-confirm
							@confirm="removeApiRequest(slotProps.item._id)"
							:disabled="slotProps.item.removed"
						>
							<button
								class="button is-danger icon-with-button material-icons"
								content="Remove API Request"
								v-tippy
							>
								delete_forever
							</button>
						</quick-confirm>
					</div>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
				<template #column-quotaCost="slotProps">
					<span :title="slotProps.item.quotaCost">{{
						slotProps.item.quotaCost
					}}</span>
				</template>
				<template #column-timestamp="slotProps">
					<span :title="new Date(slotProps.item.date).toString()">{{
						utils.getDateFormatted(slotProps.item.date)
					}}</span>
				</template>
				<template #column-url="slotProps">
					<span :title="slotProps.item.url">{{
						slotProps.item.url
					}}</span>
				</template>
			</advanced-table>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode .admin-tab {
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
			background-color: var(--dark-grey-2) !important;
		}

		strong {
			color: var(--light-grey-2);
		}
	}

	.card .quotas .card.quota {
		background-color: var(--dark-grey-2) !important;
	}
}

.admin-tab {
	td {
		vertical-align: middle;
	}

	.is-primary:focus {
		background-color: var(--primary-color) !important;
	}

	.card {
		&.charts {
			flex-direction: row !important;

			.chart {
				width: 50%;
			}

			@media screen and (max-width: 1100px) {
				flex-direction: column !important;

				.chart {
					width: unset;

					&:not(:first-child) {
						margin-top: 10px;
					}
				}
			}
		}

		.quotas {
			display: flex;
			flex-direction: row !important;
			row-gap: 10px;
			column-gap: 10px;

			.card.quota {
				background-color: var(--light-grey) !important;
				padding: 10px !important;
				flex-basis: 33.33%;

				&:not(:last-child) {
					margin-right: 10px;
				}

				h5 {
					margin-bottom: 5px !important;
				}
			}

			@media screen and (max-width: 1100px) {
				flex-direction: column !important;

				.card.quota {
					flex-basis: unset;
				}
			}
		}
	}
}
</style>
