<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { useReports } from "@/composables/useReports";
import { Report } from "@/types/report";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const ReportInfoItem = defineAsyncComponent(
	() => import("@/components/ReportInfoItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	reportId: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const { openModal, closeCurrentModal } = useModalsStore();

const { resolveReport, removeReport } = useReports();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;

const icons = ref({
	duration: "timer",
	video: "tv",
	thumbnail: "image",
	artists: "record_voice_over",
	title: "title",
	custom: "lightbulb"
});
const report = ref<Report>({});
const song = ref();

const resolve = value =>
	resolveReport({ reportId: props.reportId, value })
		.then((res: any) => {
			if (res.status !== "success") new Toast(res.message);
		})
		.catch(err => new Toast(err.message));

const remove = () =>
	removeReport(props.reportId)
		.then((res: any) => {
			if (res.status === "success") closeCurrentModal();
		})
		.catch(err => new Toast(err.message));

const toggleIssue = issueId => {
	socket.dispatch("reports.toggleIssue", props.reportId, issueId, res => {
		if (res.status !== "success") new Toast(res.message);
	});
};

const openSong = () => {
	openModal({
		modal: "editSong",
		props: { song: report.value.song }
	});
};

watch(
	() => hasPermission("reports.get"),
	value => {
		if (!value) closeCurrentModal();
	}
);

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch("reports.findOne", props.reportId, res => {
			if (res.status === "success") {
				report.value = res.data.report;

				socket.dispatch(
					"apis.joinRoom",
					`view-report.${props.reportId}`
				);

				socket.dispatch(
					"songs.getSongFromSongId",
					report.value.song._id,
					res => {
						if (res.status === "success")
							song.value = res.data.song;
						else {
							new Toast(
								"Cannot find the report's associated song"
							);
							closeCurrentModal();
						}
					}
				);

				socket.on(
					"event:admin.report.resolved",
					res => {
						report.value.resolved = res.data.resolved;
					},
					{ modalUuid: props.modalUuid }
				);

				socket.on(
					"event:admin.report.removed",
					() => closeCurrentModal(),
					{
						modalUuid: props.modalUuid
					}
				);

				socket.on(
					"event:admin.report.issue.toggled",
					res => {
						if (props.reportId === res.data.reportId) {
							const issue = report.value.issues.find(
								issue =>
									issue._id.toString() === res.data.issueId
							);

							issue.resolved = res.data.resolved;
						}
					},
					{ modalUuid: props.modalUuid }
				);
			} else {
				new Toast("Report with that ID not found");
				closeCurrentModal();
			}
		});
	});
});

onBeforeUnmount(() => {
	socket.dispatch("apis.leaveRoom", `view-report.${props.reportId}`);
});
</script>

<template>
	<modal class="view-report-modal" title="View Report">
		<template #body v-if="report && report._id">
			<div class="report-item">
				<div id="song-and-report-items">
					<report-info-item
						:created-at="`${report.createdAt}`"
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
								v-if="
									!issue.resolved &&
									hasPermission('reports.update')
								"
								@click="toggleIssue(issue._id)"
							>
								done
							</i>
							<i
								class="material-icons unresolve-icon"
								content="Unresolve"
								v-tippy
								v-else-if="
									issue.resolved &&
									hasPermission('reports.update')
								"
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
			<a
				v-if="hasPermission('songs.update')"
				class="button is-primary material-icons icon-with-button"
				@click="openSong()"
				content="Edit Song"
				v-tippy
			>
				edit
			</a>
			<button
				v-if="report.resolved && hasPermission('reports.update')"
				class="button is-danger material-icons icon-with-button"
				@click="resolve(false)"
				content="Unresolve"
				v-tippy
			>
				remove_done
			</button>
			<button
				v-else-if="!report.resolved && hasPermission('reports.update')"
				class="button is-success material-icons icon-with-button"
				@click="resolve(true)"
				content="Resolve"
				v-tippy
			>
				done_all
			</button>
			<div class="right">
				<quick-confirm
					v-if="hasPermission('reports.remove')"
					@confirm="remove()"
				>
					<button
						class="button is-danger material-icons icon-with-button"
						content="Delete Report"
						v-tippy
					>
						delete_forever
					</button>
				</quick-confirm>
			</div>
		</template>
	</modal>
</template>

<style lang="less" scoped>
.night-mode {
	.report-sub-items {
		background-color: var(--dark-grey-2) !important;

		.report-sub-item {
			border: 0.5px solid var(--white) !important;
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

	:deep(.report-info-item) {
		justify-content: flex-start;

		.item-title-description {
			.item-title {
				font-size: 20px;
				font-family: Karla, Arial, sans-serif;
			}

			.item-description {
				font-size: 14px;
				line-height: 15px;
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
			padding: 8px;
			display: flex;

			&:first-child {
				border-radius: @border-radius @border-radius 0 0;
			}

			&:last-child {
				border-radius: 0 0 @border-radius @border-radius;
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
					font-size: 16px;
				}

				.report-sub-item-description {
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
		color: var(--dark-red);
		cursor: pointer;
	}
}
</style>
