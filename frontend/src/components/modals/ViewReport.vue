<template>
	<modal class="view-report-modal" title="View Report">
		<template #body v-if="report && report._id">
			<div class="report-item">
				<div id="song-and-report-items">
					<report-info-item
						:created-at="report.createdAt"
						:created-by="report.createdBy"
					/>

					<song-item
						:song="song"
						:duration="false"
						:disabled-actions="['report']"
					/>
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
								@click="toggleIssue(issue._id)"
							>
								done
							</i>
							<i
								class="material-icons unresolve-icon"
								content="Unresolve"
								v-tippy
								v-else
								@click="toggleIssue(issue._id)"
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
			<a class="button is-success" href="#" @click="resolve()">
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
import { mapActions, mapGetters, mapState } from "vuex";
import Toast from "toasters";

import Modal from "@/components/Modal.vue";
import SongItem from "@/components/SongItem.vue";
import ReportInfoItem from "@/components/ReportInfoItem.vue";

export default {
	components: { Modal, SongItem, ReportInfoItem },
	props: {
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
			report: {},
			song: null
		};
	},
	computed: {
		...mapState("modals/viewReport", {
			reportId: state => state.viewingReportId
		}),
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

				this.socket.dispatch(
					"songs.getSongFromSongId",
					this.report.song._id,
					res => {
						if (res.status === "success") this.song = res.data.song;
						else {
							new Toast(
								"Cannot find the report's associated song"
							);
							this.closeModal("viewReport");
						}
					}
				);
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

					issue.resolved = res.data.resolved;
				}
			},
			{ modal: "viewReport" }
		);
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRoom", `view-report.${this.reportId}`);
	},
	methods: {
		resolve() {
			return this.resolveReport(this.reportId)
				.then(res => {
					if (res.status === "success") this.closeModal("viewReport");
				})
				.catch(err => new Toast(err.message));
		},
		toggleIssue(issueId) {
			this.socket.dispatch(
				"reports.toggleIssue",
				this.reportId,
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
.night-mode {
	.report-sub-items {
		background-color: var(--dark-grey-2) !important;

		.report-sub-item {
			border: 0.5px solid #fff !important;
		}
	}
}

@media screen and (min-width: 650px) {
	.report-info-item {
		margin-right: 10px !important;
	}
}

.report-item {
	#song-and-report-items {
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 20px;

		.universal-item {
			width: fit-content;
			margin: 5px 0;
		}
	}

	/deep/ .report-info-item {
		justify-content: flex-start;

		.item-title-description {
			.item-title {
				font-size: 20px;
				font-family: Karla, Arial, sans-serif;
			}

			.item-description {
				font-size: 14px;
				font-family: Karla, Arial, sans-serif;
			}
		}
	}

	.report-sub-items {
		.report-sub-item {
			border: 1px solid var(--light-grey-3);
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

			&:only-child {
				border-radius: 3px;
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
