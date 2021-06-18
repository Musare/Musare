<template>
	<div>
		<metadata title="Admin | Reports" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Summary</td>
						<td>YouTube / Song ID</td>
						<td>Categories Included</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="report in reports" :key="report._id">
						<td>
							<div class="report-item-header">
								<div class="report-item-info">
									<div class="report-item-icon">
										<profile-picture
											v-if="report.createdBy.avatar"
											:avatar="report.createdBy.avatar"
											:name="
												report.createdBy.name
													? report.createdBy.name
													: report.createdBy.username
											"
										/>
									</div>

									<div class="report-item-summary">
										<p class="report-item-summary-title">
											Reported by
											<router-link
												v-if="report.createdBy.username"
												:to="{
													path: `/u/${report.createdBy.username}`
												}"
												:title="report.createdBy._id"
											>
												{{ report.createdBy.username }}
											</router-link>
											<span v-else>{{
												report.createdBy._id
											}}</span>
										</p>
										<p
											class="report-item-summary-description"
										>
											{{
												formatDistance(
													new Date(report.createdAt),
													new Date(),
													{
														addSuffix: true
													}
												)
											}}
										</p>
									</div>
								</div>
							</div>
						</td>
						<td>
							<span>
								<a
									:href="
										'https://www.youtube.com/watch?v=' +
											`${report.song.youtubeId}`
									"
									target="_blank"
								>
									{{ report.song.youtubeId }}</a
								>
								<br />
								{{ report.song._id }}
							</span>
						</td>

						<td id="categories-column">
							<ul>
								<li
									v-for="category in getCategories(
										report.issues
									)"
									:key="category"
								>
									{{ category }}
								</li>
							</ul>
						</td>
						<td id="options-column">
							<a
								class="button is-primary"
								href="#"
								@click="view(report)"
								content="Expand"
								v-tippy
							>
								<i class="material-icons icon-with-button">
									open_in_full
								</i>
								Expand
							</a>
							<a
								class="button is-success "
								href="#"
								@click="resolve(report._id)"
								content="Resolve"
								v-tippy
							>
								<i class="material-icons icon-with-button">
									done_all
								</i>
								Resolve
							</a>
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

		<edit-song v-if="modals.editSong" song-type="songs" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { formatDistance } from "date-fns";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";
import ProfilePicture from "@/components/ProfilePicture.vue";
import ws from "@/ws";

export default {
	components: {
		ViewReport: defineAsyncComponent(() =>
			import("@/components/modals/ViewReport.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong/index.vue")
		),
		ProfilePicture
	},
	data() {
		return {
			viewingReportId: "",
			reports: []
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
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

		this.socket.on("event:admin.report.resolved", res => {
			this.reports = this.reports.filter(report => {
				return report._id !== res.data.reportId;
			});
		});

		this.socket.on("event:admin.report.created", res =>
			this.reports.unshift(res.data.report)
		);

		// if (this.$route.query.id) {
		// 	this.socket.dispatch(
		// 		"reports.findOne",
		// 		this.$route.query.id,
		// 		res => {
		// 			if (res.status === "success") this.view(res.data.report);
		// 			else new Toast("Report with that ID not found");
		// 		}
		// 	);
		// }
	},
	methods: {
		formatDistance,
		init() {
			this.socket.dispatch("apis.joinAdminRoom", "reports", () => {});
		},
		getCategories(issues) {
			const categories = [];

			issues.forEach(issue => {
				if (categories.indexOf(issue.category) === -1)
					categories.push(issue.category);
			});

			return categories;
		},
		view(report) {
			this.viewingReportId = report._id;
			this.openModal("viewReport");
		},
		resolve(reportId) {
			return this.resolveReport(reportId)
				.then(res => {
					if (res.status === "success" && this.modals.viewReport)
						this.closeModal("viewReport");
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

	.report-item-header {
		background-color: var(--dark-grey-4) !important;
	}
}

#options-column {
	a:not(:last-of-type) {
		margin-right: 5px;
	}
}

#categories-column {
	text-transform: capitalize;
}

td {
	word-wrap: break-word;
	max-width: 10vw;
	vertical-align: middle;
}

li {
	list-style: inside;
}

.report-item-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
	background-color: var(--light-grey);
	padding: 5px;
	border-radius: 5px;

	.report-item-info {
		display: flex;
		align-items: center;

		.report-item-icon {
			display: flex;
			align-items: center;

			.profile-picture,
			i {
				margin-right: 10px;
				width: 45px;
				height: 45px;
			}

			i {
				font-size: 30px;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		.report-item-summary {
			.report-item-summary-title {
				font-size: 14px;
				text-transform: capitalize;
			}

			.report-item-summary-description {
				text-transform: capitalize;
				font-size: 12px;
			}
		}
	}
}
</style>
