<template>
	<div class='container'>
		<table class='table is-striped'>
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
				<tr v-for='(index, report) in reports' track-by='$index'>
					<td>
						<span>{{ report.songId }}</span>
					</td>
					<td>
						<span>{{ report.createdBy }}</span>
					</td>
					<td>
						<span>{{ report.createdAt }}</span>
					</td>
					<td>
						<span>{{ report.description }}</span>
					</td>
					<td>
						<a class='button is-warning' href='#' @click='toggleModal(report)' v-if='report.issues.length > 0'>Issues</a>
						<a class='button is-primary' href='#' @click='resolve(report._id)'>Resolve</a>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<issues-modal v-if='modals.reportIssues'></issues-modal>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	import IssuesModal from '../Modals/IssuesModal.vue';

	export default {
		data() {
			return {
				reports: [],
				modals: {
					reportIssues: false
				}
			}
		},
		methods: {
			init: function() {
				this.socket.emit('apis.joinAdminRoom', 'reports', data => {});
			},
			toggleModal: function (report) {
				this.modals.reportIssues = !this.modals.reportIssues;
				if (this.modals.reportIssues) this.editing = report;
			},
			resolve: function (reportId) {
				let _this = this;
				this.socket.emit('reports.resolve', reportId, res => {
					Toast.methods.addToast(res.message, 3000);
					if (res.status == 'success' && this.modals.reportIssues) _this.toggleModal();
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				_this.socket.emit('reports.index', res => {
					_this.reports = res.data;
				});
				_this.socket.on('event:admin.report.resolved', reportId => {
					_this.reports = _this.reports.filter(report => {
						return report._id !== reportId;
					});
				});
				_this.socket.on('event:admin.report.created', report => {
					_this.reports.push(report);
				});
				io.onConnect(() => {
					_this.init();
				});
			});
		},
		components: { IssuesModal }
	}
</script>

<style lang='scss' scoped>
	.tag:not(:last-child) { margin-right: 5px; }

	td {
		word-wrap: break-word;
		max-width: 10vw;
		vertical-align: middle;
	}
</style>
