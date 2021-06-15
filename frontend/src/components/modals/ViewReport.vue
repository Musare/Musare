<template>
	<modal title="View Report">
		<template #body v-if="report && report._id">
			<div class="report-item">
				<div class="report-item-header">
					<div class="report-item-info">
						<div class="report-item-icon">
							<profile-picture
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
									:to="{
										path: `/u/${report.createdBy.username}`
									}"
									:title="report.createdBy._id"
								>
									{{ report.createdBy.username }}
								</router-link>
							</p>
							<p class="report-item-summary-description">
								{{
									formatDistance(
										new Date(report.createdAt),
										new Date(),
										{
											addSuffix: true
										}
									)
								}}
								/ YouTube:
								<a
									:href="
										'https://www.youtube.com/watch?v=' +
											`${report.song.youtubeId}`
									"
									target="_blank"
								>
									{{ report.song.youtubeId }}</a
								>
								/ Song ID: {{ report.song._id }}
							</p>
						</div>
					</div>
				</div>
				<div class="report-sub-items">
					<div
						class="report-sub-item report-sub-item-unresolved"
						:class="[
							'report',
							issue.resolved
								? 'report-sub-item-resolved'
								: 'report-sub-item-unresolved'
						]"
						v-for="(issue, issueIndex) in report.issues"
						:key="issueIndex"
					>
						<i
							class="material-icons duration-icon report-sub-item-left-icon"
							:content="issue.category"
							v-tippy
						>
							{{ icons[issue.category] }}
						</i>
						<p class="report-sub-item-info">
							<span class="report-sub-item-title">
								{{ issue.title }}
							</span>
							<span
								class="report-sub-item-description"
								v-if="issue.description"
							>
								{{ issue.description }}
							</span>
						</p>

						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								v-if="!issue.resolved"
								@click="toggleIssue(report._id, issue._id)"
							>
								done
							</i>
							<i
								class="material-icons unresolve-icon"
								content="Unresolve"
								v-tippy
								v-else
								@click="toggleIssue(report._id, issue._id)"
							>
								remove
							</i>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer v-if="report && report._id">
			<a class="button is-primary" @click="openSong()">
				<i
					class="material-icons icon-with-button"
					content="Edit Song"
					v-tippy
				>
					edit
				</i>
				Edit Song
			</a>
			<a class="button is-success" href="#" @click="resolve(report._id)">
				<i
					class="material-icons icon-with-button"
					content="Resolve"
					v-tippy
				>
					done_all
				</i>
				Resolve
			</a>
		</template>
	</modal>
</template>

<script>
import { mapActions, mapGetters } from "vuex";
import { formatDistance } from "date-fns";
import Toast from "toasters";

import ProfilePicture from "@/components/ProfilePicture.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, ProfilePicture },
	props: {
		reportId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
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
			report: {}
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("reports.findOne", this.reportId, res => {
			if (res.status === "success") {
				const { report } = res.data;

				this.socket.dispatch(
					"apis.joinRoom",
					`view-report.${report._id}`
				);

				this.report = report;
			} else {
				new Toast("Report with that ID not found");
				this.closeModal("viewReport");
			}
		});

		this.socket.on(
			"event:admin.report.resolved",
			() => this.closeModal("viewReport"),
			{ modal: "viewReport" }
		);

		this.socket.on(
			"event:admin.report.issue.toggled",
			res => {
				if (this.report._id === res.data.reportId) {
					const issue = this.report.issues.find(
						issue => issue._id.toString() === res.data.issueId
					);

					issue.resolved = !issue.resolved;
				}
			},
			{ modal: "viewReport" }
		);
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRoom", `view-report.${this.reportId}`);
	},
	methods: {
		formatDistance,
		resolve(reportId) {
			return this.resolveReport(reportId)
				.then(res => {
					if (res.status === "success") this.closeModal("viewReport");
				})
				.catch(err => new Toast(err.message));
		},
		toggleIssue(reportId, issueId) {
			this.socket.dispatch(
				"reports.toggleIssue",
				reportId,
				issueId,
				res => {
					if (res.status !== "success") new Toast(res.message);
				}
			);
		},
		openSong() {
			this.editSong({ _id: this.report.song._id });
			this.openModal("editSong");
		},
		...mapActions("admin/reports", ["indexReports", "resolveReport"]),
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>

<style lang="scss" scoped>
.report-item {
	background-color: var(--white);
	border: 0.5px solid var(--primary-color);
	border-radius: 5px;
	padding: 8px;

	&:not(:first-of-type) {
		margin-bottom: 16px;
	}

	.report-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		background-color: var(--light-grey);
		// padding: 5px;
		padding: 10px;
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
					// font-size: 14px;
					font-size: 16px;
					text-transform: capitalize;
				}

				.report-item-summary-description {
					text-transform: capitalize;
					// font-size: 12px;
					font-size: 14px;
				}
			}
		}

		.report-item-actions {
			height: 24px;
			margin-right: 4px;
		}
	}

	.report-sub-items {
		.report-sub-item {
			border: 0.5px solid var(--black);
			margin-top: -1px;
			line-height: 24px;
			display: flex;
			// padding: 4px;
			padding: 8px;
			display: flex;

			&:first-child {
				border-radius: 3px 3px 0 0;
			}

			&:last-child {
				border-radius: 0 0 3px 3px;
			}

			&.report-sub-item-resolved {
				.report-sub-item-description,
				.report-sub-item-title {
					text-decoration: line-through;
				}
			}

			.report-sub-item-left-icon {
				margin-right: 8px;
				margin-top: auto;
				margin-bottom: auto;
			}

			.report-sub-item-info {
				flex: 1;
				display: flex;
				flex-direction: column;

				.report-sub-item-title {
					// font-size: 14px;
					font-size: 16px;
				}

				.report-sub-item-description {
					// font-size: 12px;
					font-size: 14px;
					line-height: 16px;
				}
			}

			.report-sub-item-actions {
				height: 24px;
				margin-left: 8px;
				margin-top: auto;
				margin-bottom: auto;
			}
		}
	}

	.resolve-icon {
		color: var(--green);
		cursor: pointer;
	}

	.unresolve-icon {
		color: var(--red);
		cursor: pointer;
	}
}
</style>
