<template>
	<div>
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
							<span>{{ report.songId }}</span>
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
								@click="toggleModal(report)"
								>Issues Modal</a
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

		<issues-modal v-if="modals.report" />
	</div>
</template>

<script>
import { Toast } from "vue-roaster";
import io from "../../io";

import IssuesModal from "../Modals/IssuesModal.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	components: { IssuesModal, UserIdToUsername },
	data() {
		return {
			reports: [],
			modals: {
				report: false
			}
		};
	},
	mounted: function() {
		let _this = this;
		io.getSocket(socket => {
			_this.socket = socket;
			if (_this.socket.connected) _this.init();
			_this.socket.emit("reports.index", res => {
				_this.reports = res.data;
			});
			_this.socket.on("event:admin.report.resolved", reportId => {
				_this.reports = _this.reports.filter(report => {
					return report._id !== reportId;
				});
			});
			_this.socket.on("event:admin.report.created", report => {
				_this.reports.push(report);
			});
			io.onConnect(() => {
				_this.init();
			});
		});
		if (this.$route.query.id) {
			this.socket.emit("reports.findOne", this.$route.query.id, res => {
				if (res.status === "success") _this.toggleModal(res.data);
				else
					Toast.methods.addToast(
						"Report with that ID not found",
						3000
					);
			});
		}
	},
	methods: {
		init: function() {
			this.socket.emit("apis.joinAdminRoom", "reports", () => {});
		},
		toggleModal: function(report) {
			this.modals.report = !this.modals.report;
			if (this.modals.report) this.editing = report;
		},
		resolve: function(reportId) {
			let _this = this;
			this.socket.emit("reports.resolve", reportId, res => {
				Toast.methods.addToast(res.message, 3000);
				if (res.status === "success" && this.modals.report)
					_this.toggleModal();
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.tag:not(:last-child) {
	margin-right: 5px;
}

td {
	word-wrap: break-word;
	max-width: 10vw;
	vertical-align: middle;
}
</style>
