<template>
	<div>
		<metadata title="Admin | Reports" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Song ID</td>
						<td>Created By</td>
						<td>Created At</td>
						<td>Description</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(report, index) in reports" :key="index">
						<td>
							<span>
								{{ report.song.songId }}
								<br />
								{{ report.song._id }}
							</span>
						</td>
						<td>
							<user-id-to-username
								:userId="report.createdBy"
								:link="true"
							/>
						</td>
						<td>
							<span>{{ report.createdAt }}</span>
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

		<issues-modal v-if="modals.viewReport" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";
import io from "../../io";

import IssuesModal from "../Modals/IssuesModal.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	components: { IssuesModal, UserIdToUsername },
	data() {
		return {
			reports: []
		};
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			this.socket.emit("reports.index", res => {
				this.reports = res.data;
			});
			this.socket.on("event:admin.report.resolved", reportId => {
				this.reports = this.reports.filter(report => {
					return report._id !== reportId;
				});
			});
			this.socket.on("event:admin.report.created", report => {
				this.reports.push(report);
			});
			io.onConnect(() => {
				this.init();
			});
		});

		if (this.$route.query.id) {
			this.socket.emit("reports.findOne", this.$route.query.id, res => {
				if (res.status === "success") this.view(res.data);
				else
					Toast.methods.addToast(
						"Report with that ID not found",
						3000
					);
			});
		}
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	methods: {
		init() {
			this.socket.emit("apis.joinAdminRoom", "reports", () => {});
		},
		view(report) {
			this.viewReport(report);
			this.openModal({ sector: "admin", modal: "viewReport" });
		},
		resolve(reportId) {
			this.socket.emit("reports.resolve", reportId, res => {
				Toast.methods.addToast(res.message, 3000);
				if (res.status === "success" && this.modals.viewReport)
					this.closeModal({
						sector: "admin",
						modal: "viewReport"
					});
			});
		},
		...mapActions("modals", ["openModal", "closeModal"]),
		...mapActions("admin/reports", ["viewReport"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.tag:not(:last-child) {
	margin-right: 5px;
}

td {
	word-wrap: break-word;
	max-width: 10vw;
	vertical-align: middle;
}
</style>
