<template>
	<div>
		<metadata title="Admin | Reports" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Song ID</td>
						<td>Author</td>
						<td>Time of report</td>
						<td>Description</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(report, index) in reports" :key="index">
						<td>
							<span>
								{{ report.song.youtubeId }}
								<br />
								{{ report.song._id }}
							</span>
						</td>
						<td>
							<user-id-to-username
								:user-id="report.createdBy"
								:link="true"
							/>
						</td>
						<td>
							<span :content="report.createdAt" v-tippy>{{
								formatDistance(
									new Date(report.createdAt),
									new Date(),
									{ addSuffix: true }
								)
							}}</span>
						</td>
						<td>
							<span>{{ report.description }}</span>
						</td>
						<td>
							<a
								class="button is-warning"
								href="#"
								@click="view(report)"
								>View</a
							>
							<a
								class="button is-primary"
								href="#"
								@click="resolve(report._id)"
								>Resolve</a
							>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<view-report
			v-if="modals.viewReport"
			:report-id="viewingReportId"
			sector="admin"
		/>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { formatDistance } from "date-fns";

import Toast from "toasters";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import ws from "@/ws";

export default {
	components: {
		ViewReport: () => import("@/components/modals/ViewReport.vue"),
		UserIdToUsername
	},
	data() {
		return {
			viewingReportId: "",
			reports: []
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals.admin
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());

		this.socket.dispatch("reports.index", res => {
			if (res.status === "success") this.reports = res.data.reports;
		});

		this.socket.on("event:admin.report.resolved", reportId => {
			this.reports = this.reports.filter(report => {
				return report._id !== reportId;
			});
		});

		this.socket.on("event:admin.report.created", report =>
			this.reports.push(report)
		);

		if (this.$route.query.id) {
			this.socket.dispatch(
				"reports.findOne",
				this.$route.query.id,
				res => {
					if (res.status === "success") this.view(res.data.report);
					else new Toast("Report with that ID not found");
				}
			);
		}
	},
	methods: {
		formatDistance,
		init() {
			this.socket.dispatch("apis.joinAdminRoom", "reports", () => {});
		},
		view(report) {
			// this.viewReport(report);
			this.viewingReportId = report._id;
			this.openModal({ sector: "admin", modal: "viewReport" });
		},
		resolve(reportId) {
			return this.resolveReport(reportId)
				.then(res => {
					if (res.status === "success" && this.modals.viewReport)
						this.closeModal({
							sector: "admin",
							modal: "viewReport"
						});
				})
				.catch(err => new Toast(err.message));
		},
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("admin/reports", ["resolveReport"])
	}
};
</script>

<style lang="scss" scoped>
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

.tag:not(:last-child) {
	margin-right: 5px;
}

td {
	word-wrap: break-word;
	max-width: 10vw;
	vertical-align: middle;
}
</style>
