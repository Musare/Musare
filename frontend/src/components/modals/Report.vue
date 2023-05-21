<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, computed } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useForm } from "@/composables/useForm";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const MediaItem = defineAsyncComponent(
	() => import("@/components/MediaItem.vue")
);
const ReportInfoItem = defineAsyncComponent(
	() => import("@/components/ReportInfoItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	song: { type: Object, required: true }
});

const { socket } = useWebsocketsStore();

const { openModal, closeCurrentModal } = useModalsStore();

const existingReports = ref([]);

const { inputs, save } = useForm(
	{
		video: {
			value: {
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
			}
		},
		title: {
			value: {
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
			}
		},
		duration: {
			value: {
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
			}
		},
		artists: {
			value: {
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
			}
		},
		thumbnail: {
			value: {
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
		},
		custom: { value: [] }
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			const issues: {
				category: string;
				title: string;
				description?: string;
			}[] = [];
			Object.entries(values).forEach(([name, value]) => {
				if (name === "custom")
					value.forEach(issue => {
						issues.push({ category: "custom", title: issue });
					});
				else
					value.issues.forEach(issue => {
						if (issue.enabled)
							issues.push({
								category: name,
								title: issue.title,
								description: issue.description
							});
					});
			});
			if (issues.length > 0)
				socket.dispatch(
					"reports.create",
					{
						issues,
						mediaSource: props.song.mediaSource
					},
					res => {
						if (res.status === "success") {
							new Toast(res.message);
							resolve();
						} else reject(new Error(res.message));
					}
				);
			else reject(new Error("Reports must have at least one issue"));
		} else if (status === "unchanged")
			reject(new Error("Reports must have at least one issue"));
		else {
			Object.values(messages).forEach(message => {
				new Toast({ content: message, timeout: 8000 });
			});
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid
	}
);

const categories = computed(() =>
	Object.entries(inputs.value)
		.filter(([name]) => name !== "custom")
		.map(input => {
			const { category, issues } = input[1].value;
			return { category, issues };
		})
);

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch("reports.myReportsForSong", props.song._id, res => {
			if (res.status === "success") {
				existingReports.value = res.data.reports;
				existingReports.value.forEach(report =>
					socket.dispatch(
						"apis.joinRoom",
						`view-report.${report._id}`
					)
				);
			}
		});
	});

	socket.on(
		"event:admin.report.resolved",
		res => {
			existingReports.value = existingReports.value.filter(
				report => report._id !== res.data.reportId
			);
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:admin.report.removed",
		res => {
			existingReports.value = existingReports.value.filter(
				report => report._id !== res.data.reportId
			);
		},
		{ modalUuid: props.modalUuid }
	);
});
</script>

<template>
	<div>
		<modal
			class="report-modal"
			title="Report"
			:size="existingReports.length > 0 ? 'wide' : null"
		>
			<template #body>
				<div class="report-modal-inner-container">
					<div id="left-part">
						<media-item
							:song="song"
							:duration="false"
							:disabled-actions="['report']"
							header="Selected Song.."
						/>

						<div class="columns is-multiline">
							<div
								v-for="category in categories"
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
											@click="
												inputs.custom.value.push('')
											"
										>
											<i
												class="material-icons icon-with-button"
												>add</i
											>
											<span> Add Custom Issue </span>
										</button>
									</div>

									<div
										class="custom-issue control is-grouped input-with-button"
										v-for="(issue, index) in inputs.custom
											.value"
										:key="index"
									>
										<p class="control is-expanded">
											<input
												type="text"
												class="input"
												v-model="
													inputs.custom.value[index]
												"
												placeholder="Provide information..."
											/>
										</p>
										<p class="control">
											<button
												class="button is-danger"
												content="Remove custom issue"
												v-tippy
												@click="
													inputs.custom.value.splice(
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
										v-if="inputs.custom.value.length <= 0"
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
							about this song already
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
											@click="
												openModal({
													modal: 'viewReport',
													props: {
														reportId: report._id
													}
												})
											"
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
				<button
					class="button is-success"
					@click="save(closeCurrentModal)"
				>
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Create</span>
				</button>
				<a class="button is-danger" @click="closeCurrentModal()">
					<span>&nbsp;Cancel</span>
				</a>
			</template>
		</modal>
	</div>
</template>

<style lang="less">
.report-modal .song-item {
	height: 130px !important;

	.thumbnail-and-info .thumbnail {
		min-width: 130px;
		width: 130px;
	}
}
</style>

<style lang="less" scoped>
.night-mode {
	@media screen and (max-width: 900px) {
		#right-part {
			background-color: var(--dark-grey-3) !important;
		}
	}
	.columns {
		background-color: var(--dark-grey-3) !important;
		border-radius: @border-radius;
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
			border-radius: @border-radius;
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
	display: flex;
	flex-wrap: wrap;
	margin-left: unset;
	margin-right: unset;
	margin-top: 20px;

	.column {
		flex-basis: 50%;
		@media screen and (max-width: 900px) {
			flex-basis: 100% !important;
		}
	}

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
