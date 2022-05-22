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
			<div class="card-content">
				<p v-if="fromDate">As of {{ fromDate }}</p>
				<table class="table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Quota cost</th>
							<th>URL</th>
							<th>Request ID</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="apiRequest in apiRequests"
							:key="apiRequest._id"
						>
							<td>
								<router-link
									:to="`?fromDate=${apiRequest.date}`"
								>
									{{ apiRequest.date }}
								</router-link>
							</td>
							<td>{{ apiRequest.quotaCost }}</td>
							<td>{{ apiRequest.url }}</td>
							<td>
								<router-link
									:to="`?apiRequestId=${apiRequest._id}`"
								>
									{{ apiRequest._id }}
								</router-link>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
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

import { mapGetters } from "vuex";

import ws from "@/ws";

export default {
	components: {
		VueJsonPretty
	},
	data() {
		return {
			quotaStatus: {},
			apiRequests: [],
			currentApiRequest: null,
			fromDate: null
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

			this.socket.dispatch(
				"youtube.getApiRequests",
				this.fromDate,
				res => {
					if (res.status === "success")
						this.apiRequests = res.data.apiRequests;
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
		}
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
