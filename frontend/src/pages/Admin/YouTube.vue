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
		<div class="card charts">
			<div class="chart">
				<h4 class="has-text-centered">Quota Usage</h4>
				<line-chart
					chart-id="youtube-quota-usage"
					:data="charts.quotaUsage"
				/>
			</div>
			<div class="chart">
				<h4 class="has-text-centered">API Requests</h4>
				<line-chart
					chart-id="youtube-api-requests"
					:data="charts.apiRequests"
				/>
			</div>
		</div>
		<div class="card">
			<h4>Quota Stats</h4>
			<hr class="section-horizontal-rule" />
			<div class="card-content">
				<p v-if="fromDate">As of {{ fromDate }}</p>
				<div
					v-for="[quotaName, quotaObject] in Object.entries(
						quotaStatus
					)"
					:key="quotaName"
				>
					<p>{{ quotaName }}</p>
					<hr />
					<p>Quota used: {{ quotaObject.quotaUsed }}</p>
					<p>Limit: {{ quotaObject.limit }}</p>
					<p>Quota exceeded: {{ quotaObject.quotaExceeded }}</p>
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
									data: {
										requestId: slotProps.item._id
									}
								})
							"
							:disabled="slotProps.item.removed"
							content="View API Request"
							v-tippy
						>
							open_in_full
						</button>
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
					<span :title="new Date(slotProps.item.date)">{{
						getDateFormatted(slotProps.item.date)
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

<script>
import { mapActions, mapGetters } from "vuex";

import AdvancedTable from "@/components/AdvancedTable.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";
import LineChart from "@/components/LineChart.vue";

import ws from "@/ws";

export default {
	components: {
		AdvancedTable,
		RunJobDropdown,
		LineChart
	},
	data() {
		return {
			quotaStatus: {},
			fromDate: null,
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
					displayName: "Options",
					properties: ["_id"],
					hidable: false,
					resizable: false,
					minWidth: 76,
					defaultWidth: 76
				},
				{
					name: "quotaCost",
					displayName: "Quota Cost",
					properties: ["quotaCost"],
					sortProperty: ["quotaCost"],
					minWidth: 150,
					defaultWidth: 150
				},
				{
					name: "timestamp",
					displayName: "Timestamp",
					properties: ["date"],
					sortProperty: ["date"],
					minWidth: 150,
					defaultWidth: 150
				},
				{
					name: "url",
					displayName: "URL",
					properties: ["url"],
					sortProperty: ["url"]
				},
				{
					name: "_id",
					displayName: "Request ID",
					properties: ["_id"],
					sortProperty: ["_id"],
					minWidth: 230,
					defaultWidth: 230
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
			],
			charts: {
				quotaUsage: {
					labels: [
						"Mon",
						"Tues",
						"Wed",
						"Thurs",
						"Fri",
						"Sat",
						"Sun"
					],
					datasets: [
						{
							label: "Type A",
							data: [300, 122, 0, 67, 23, 280, 185],
							fill: true,
							borderColor: "rgb(2, 166, 242)"
						}
					]
				},
				apiRequests: {
					labels: [
						"Mon",
						"Tues",
						"Wed",
						"Thurs",
						"Fri",
						"Sat",
						"Sun"
					],
					datasets: [
						{
							label: "Type A",
							data: [30, 6, 0, 9, 4, 26, 19],
							borderColor: "rgb(2, 166, 242)"
						}
					]
				}
			},
			jobs: [
				{
					name: "Reset stored API requests",
					socket: "youtube.resetStoredApiRequests"
				}
			]
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			if (this.$route.query.fromDate)
				this.fromDate = this.$route.query.fromDate;

			this.socket.dispatch(
				"youtube.getQuotaStatus",
				this.fromDate,
				res => {
					if (res.status === "success")
						this.quotaStatus = res.data.status;
				}
			);
		},
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="less" scoped>
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

td {
	vertical-align: middle;
}

.is-primary:focus {
	background-color: var(--primary-color) !important;
}

.card.charts {
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
</style>
