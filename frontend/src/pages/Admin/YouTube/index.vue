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
									data: {
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

import Toast from "toasters";

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
			events: {
				adminRoom: "youtube",
				removed: {
					event: "admin.youtubeApiRequest.removed",
					id: "requestId"
				}
			},
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
		removeApiRequest(requestId) {
			this.socket.dispatch(
				"youtube.removeStoredApiRequest",
				requestId,
				res => new Toast(res.message)
			);
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

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
				background-color: var(--light-grey-2) !important;
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
