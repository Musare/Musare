<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube" />
		<div class="card">
			<h1>YouTube API</h1>
			<p>
				Analyze YouTube quota usage and API requests made on this
				instance
			</p>
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
		<div class="card" v-if="currentApiRequest">
			<h4>API Request</h4>
			<hr class="section-horizontal-rule" />
			<div class="card-content">
				<p><b>ID:</b> {{ currentApiRequest._id }}</p>
				<p><b>URL:</b> {{ currentApiRequest.url }}</p>
				<div>
					<b>Params:</b>
					<ul v-if="currentApiRequest.params">
						<li
							v-for="[paramKey, paramValue] in Object.entries(
								currentApiRequest.params
							)"
							:key="paramKey"
						>
							<b>{{ paramKey }}</b
							>: {{ paramValue }}
						</li>
					</ul>
					<span v-else>None/Not found</span>
				</div>
				<div>
					<b>Results:</b>
					<vue-json-pretty
						:data="currentApiRequest.results"
						:show-length="true"
					></vue-json-pretty>
				</div>
				<p><b>Date:</b> {{ currentApiRequest.date }}</p>
				<p><b>Quota cost:</b> {{ currentApiRequest.quotaCost }}</p>
			</div>
		</div>
	</div>
</template>

<script>
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

import { mapActions, mapGetters } from "vuex";

import AdvancedTable from "@/components/AdvancedTable.vue";

import ws from "@/ws";

export default {
	components: {
		VueJsonPretty,
		AdvancedTable
	},
	data() {
		return {
			quotaStatus: {},
			currentApiRequest: null,
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

			if (this.$route.query.apiRequestId) {
				this.socket.dispatch(
					"youtube.getApiRequest",
					this.$route.query.apiRequestId,
					res => {
						if (res.status === "success")
							this.currentApiRequest = res.data.apiRequest;
					}
				);
			}
		},
		round(number) {
			return Math.round(number);
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

ul {
	list-style-type: disc;
	padding-left: 20px;
}
</style>
