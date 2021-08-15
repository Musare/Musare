<template>
	<div>
		<modal class="report-modal" title="Report">
			<template #body>
				<div class="report-modal-inner-container">
					<div id="left-part">
						<song-item
							:song="song"
							:duration="false"
							:disabled-actions="['report']"
							header="Selected Song.."
						/>

						<div class="columns is-multiline">
							<div
								v-for="category in predefinedCategories"
								class="column is-half"
								:key="category.category"
							>
								<label class="label">{{
									category.category
								}}</label>

								<p
									v-for="issue in category.issues"
									class="control checkbox-control"
									:key="issue.title"
								>
									<span class="align-horizontally">
										<span>
											<label class="switch">
												<input
													type="checkbox"
													:id="issue.title"
													v-model="issue.enabled"
												/>
												<span
													class="slider round"
												></span>
											</label>

											<label :for="issue.title">
												<span></span>
												<p>{{ issue.title }}</p>
											</label>
										</span>

										<i
											class="material-icons"
											content="Provide More info"
											v-tippy
											@click="
												issue.showDescription =
													!issue.showDescription
											"
										>
											info
										</i>
									</span>

									<input
										type="text"
										class="input"
										v-model="issue.description"
										v-if="issue.showDescription"
										placeholder="Provide more information..."
										@keyup="issue.enabled = true"
									/>
								</p>
							</div>
							<!-- allow for multiple custom issues with plus/add button and then a input textbox -->
							<!-- do away with textbox -->

							<div class="column is-half">
								<div id="custom-issues">
									<div id="custom-issues-title">
										<label class="label"
											>Issues not listed</label
										>

										<button
											class="button tab-actionable-button"
											content="Add an issue that isn't listed"
											v-tippy
											@click="customIssues.push('')"
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>add</i
											>
											<span> Add Custom Issue </span>
										</button>
									</div>

									<div
										class="
											custom-issue
											control
											is-grouped
											input-with-button
										"
										v-for="(issue, index) in customIssues"
										:key="index"
									>
										<p class="control is-expanded">
											<input
												type="text"
												class="input"
												v-model="customIssues[index]"
												placeholder="Provide information..."
											/>
										</p>
										<p class="control">
											<button
												class="button is-danger"
												content="Remove custom issue"
												v-tippy
												@click="
													customIssues.splice(
														index,
														1
													)
												"
											>
												<i class="material-icons">
													delete
												</i>
											</button>
										</p>
									</div>

									<p
										id="no-issues-listed"
										v-if="customIssues.length <= 0"
									>
										<em>
											Add any issues that aren't listed
											above.
										</em>
									</p>
								</div>
							</div>
						</div>
					</div>
					<div id="right-part" v-if="existingReports.length > 0">
						<h4 class="section-title">Previous Reports</h4>

						<p class="section-description">
							You have made
							{{
								existingReports.length > 1
									? "multiple reports"
									: "a report"
							}}
							about this song already.
						</p>

						<hr class="section-horizontal-rule" />

						<div class="report-items">
							<div
								class="report-item"
								v-for="report in existingReports"
								:key="report._id"
							>
								<report-info-item
									:created-at="report.createdAt"
									:created-by="report.createdBy"
								>
									<template #actions>
										<i
											class="material-icons"
											content="View Report"
											v-tippy
											@click="view(report._id)"
										>
											open_in_full
										</i>
									</template>
								</report-info-item>
							</div>
						</div>
					</div>
				</div>
			</template>
			<template #footer>
				<a class="button is-success" @click="create()" href="#">
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Create</span>
				</a>
				<a
					class="button is-danger"
					href="#"
					@click="closeModal('report')"
				>
					<span>&nbsp;Cancel</span>
				</a>
			</template>
		</modal>
		<view-report v-if="modals.viewReport" />
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import Toast from "toasters";

import ViewReport from "@/components/modals/ViewReport.vue";
import SongItem from "@/components/SongItem.vue";
import ReportInfoItem from "@/components/ReportInfoItem.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, ViewReport, SongItem, ReportInfoItem },
	data() {
		return {
			icons: {
				duration: "timer",
				video: "tv",
				thumbnail: "image",
				artists: "record_voice_over",
				title: "title",
				custom: "lightbulb"
			},
			existingReports: [],
			customIssues: [],
			predefinedCategories: [
				{
					category: "video",
					issues: [
						{
							enabled: false,
							title: "Doesn't exist",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "It's private",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "It's not available in my country",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Unofficial",
							description: "",
							showDescription: false
						}
					]
				},
				{
					category: "title",
					issues: [
						{
							enabled: false,
							title: "Incorrect",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Inappropriate",
							description: "",
							showDescription: false
						}
					]
				},
				{
					category: "duration",
					issues: [
						{
							enabled: false,
							title: "Skips too soon",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Skips too late",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Starts too soon",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Starts too late",
							description: "",
							showDescription: false
						}
					]
				},
				{
					category: "artists",
					issues: [
						{
							enabled: false,
							title: "Incorrect",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Inappropriate",
							description: "",
							showDescription: false
						}
					]
				},
				{
					category: "thumbnail",
					issues: [
						{
							enabled: false,
							title: "Incorrect",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Inappropriate",
							description: "",
							showDescription: false
						},
						{
							enabled: false,
							title: "Doesn't exist",
							description: "",
							showDescription: false
						}
					]
				}
			]
		};
	},
	computed: {
		...mapState({
			song: state => state.modals.report.song
		}),
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("reports.myReportsForSong", this.song._id, res => {
			if (res.status === "success") {
				this.existingReports = res.data.reports;
				this.existingReports.forEach(report =>
					this.socket.dispatch(
						"apis.joinRoom",
						`view-report.${report._id}`
					)
				);
			}
		});

		this.socket.on(
			"event:admin.report.resolved",
			res => {
				this.existingReports = this.existingReports.filter(
					report => report._id !== res.data.reportId
				);
			},
			{ modal: "report" }
		);
	},
	methods: {
		view(reportId) {
			this.viewReport(reportId);
			this.openModal("viewReport");
		},
		create() {
			const issues = [];

			// any predefined issues that are enabled
			this.predefinedCategories.forEach(category =>
				category.issues.forEach(issue => {
					if (issue.enabled)
						issues.push({
							category: category.category,
							title: issue.title,
							description: issue.description
						});
				})
			);

			// any custom issues
			this.customIssues.forEach(issue =>
				issues.push({ category: "custom", title: issue })
			);

			if (issues.length === 0)
				return new Toast("Reports must have at least one issue");

			return this.socket.dispatch(
				"reports.create",
				{
					issues,
					youtubeId: this.song.youtubeId
				},
				res => {
					new Toast(res.message);
					if (res.status === "success") this.closeModal("report");
				}
			);
		},
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("modals/viewReport", ["viewReport"])
	}
};
</script>

<style lang="scss">
.report-modal {
	.modal-card {
		width: 1050px;
	}

	.song-item {
		.thumbnail {
			min-width: 130px;
			width: 130px;
			height: 130px;
		}
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	@media screen and (max-width: 900px) {
		#right-part {
			background-color: var(--dark-grey-3) !important;
		}
	}
	.columns {
		background-color: var(--dark-grey-3) !important;
		border-radius: 5px;
	}
}

.report-modal-inner-container {
	display: flex;

	@media screen and (max-width: 900px) {
		flex-wrap: wrap-reverse;

		#left-part {
			width: 100%;
		}

		#right-part {
			border-left: 0 !important;
			margin-left: 0 !important;
			width: 100%;
			min-width: 0 !important;
			margin-bottom: 20px;
			padding: 20px;
			background-color: var(--light-grey);
		}
	}

	#right-part {
		border-left: 1px solid var(--light-grey-3);
		padding-left: 20px;
		margin-left: 20px;
		min-width: 325px;

		.report-items {
			max-height: 485px;
			overflow: auto;

			.report-item:not(:first-of-type) {
				margin-top: 10px;
			}
		}
	}
}

.label {
	text-transform: capitalize;
}

.columns {
	margin-left: unset;
	margin-right: unset;
	margin-top: 20px;

	.control {
		display: flex;
		flex-direction: column;

		span.align-horizontally {
			width: 100%;
			display: flex;
			align-items: center;
			justify-content: space-between;

			span {
				display: flex;
			}
		}

		i {
			cursor: pointer;
		}

		input[type="text"] {
			height: initial;
			margin: 10px 0;
		}
	}
}

#custom-issues {
	height: 100%;

	#custom-issues-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 15px;

		button {
			padding: 3px 5px;
			height: initial;
		}

		label {
			margin: 0;
		}
	}

	#no-issues-listed {
		display: flex;
		height: calc(100% - 32px - 15px);
		align-items: center;
		justify-content: center;
	}

	.custom-issue {
		flex-direction: row;

		input {
			height: 36px;
			margin: 0;
		}
	}
}
</style>
