<template>
	<modal title="Report">
		<template #body>
			<div class="edit-report-wrapper">
				<song-item
					:song="song"
					:disabled-actions="['report']"
					header="Selected Song.."
				/>

				<div class="columns is-multiline">
					<div
						v-for="issue in issues"
						class="column is-half"
						:key="issue.name"
					>
						<label class="label">{{ issue.name }}</label>

						<p
							v-for="reason in issue.reasons"
							class="control checkbox-control"
							:key="reason.reason"
						>
							<span class="align-horizontally">
								<span>
									<label class="switch">
										<input
											type="checkbox"
											:id="reason.reason"
											v-model="reason.enabled"
										/>
										<span class="slider round"></span>
									</label>

									<label :for="reason.reason">
										<span></span>
										<p>{{ reason.reason }}</p>
									</label>
								</span>

								<i
									class="material-icons"
									content="Provide More Info"
									v-tippy
									@click="reason.showInfo = !reason.showInfo"
								>
									info
								</i>
							</span>

							<input
								type="text"
								class="input"
								v-model="reason.info"
								v-if="reason.showInfo"
								placeholder="Provide more information..."
								@keyup="reason.enabled = true"
							/>
						</p>
					</div>
					<!-- allow for multiple custom issues with plus/add button and then a input textbox -->
					<!-- do away with textbox -->

					<!--
						<div class="column">
						<p class="content-box-optional-helper">
							<a href="#" @click="changeToLoginModal()">
								Issue isn't listed?
							</a>
						</p>

						<br />

		

						<textarea
							v-model="report.description"
							class="textarea"
							maxlength="400"
							placeholder="Any other details..."
						/>
						<div class="textarea-counter">
							{{ charactersRemaining }}
						</div>
					</div>
					-->
				</div>
			</div>
		</template>
		<template #footer>
			<a class="button is-success" @click="create()" href="#">
				<i class="material-icons save-changes">done</i>
				<span>&nbsp;Create</span>
			</a>
			<a class="button is-danger" href="#" @click="closeModal('report')">
				<span>&nbsp;Cancel</span>
			</a>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import SongItem from "@/components/SongItem.vue";
import Modal from "../Modal.vue";

export default {
	components: { Modal, SongItem },
	data() {
		return {
			report: {
				resolved: false,
				youtubeId: "",
				description: "",
				issues: [
					{ name: "Video", reasons: [] },
					{ name: "Title", reasons: [] },
					{ name: "Duration", reasons: [] },
					{ name: "Artists", reasons: [] },
					{ name: "Thumbnail", reasons: [] }
				]
			},
			issues: [
				{
					name: "Video",
					reasons: [
						{
							enabled: false,
							reason: "Doesn't exist",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "It's private",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "It's not available in my country",
							info: "United States",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Unofficial",
							info: "",
							showInfo: false
						}
					]
				},
				{
					name: "Title",
					reasons: [
						{
							enabled: false,
							reason: "Incorrect",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Inappropriate",
							info: "",
							showInfo: false
						}
					]
				},
				{
					name: "Duration",
					reasons: [
						{
							enabled: false,
							reason: "Skips too soon",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Skips too late",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Starts too soon",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Starts too late",
							info: "",
							showInfo: false
						}
					]
				},
				{
					name: "Artists",
					reasons: [
						{
							enabled: false,
							reason: "Incorrect",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Inappropriate",
							info: "",
							showInfo: false
						}
					]
				},
				{
					name: "Thumbnail",
					reasons: [
						{
							enabled: false,
							reason: "Incorrect",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Inappropriate",
							info: "",
							showInfo: false
						},
						{
							enabled: false,
							reason: "Doesn't exist",
							info: "",
							showInfo: false
						}
					]
				}
			]
		};
	},
	computed: {
		charactersRemaining() {
			return 400 - this.report.description.length;
		},
		...mapState({
			song: state => state.modals.report.song
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.song !== null) this.report.youtubeId = this.song.youtubeId;
	},
	methods: {
		create() {
			// generate report from here (filter by enabled reasons)

			this.socket.dispatch("reports.create", this.report, res => {
				new Toast(res.message);
				if (res.status === "success") this.closeModal("report");
			});
		},
		...mapActions("modals/report", ["reportSong"]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss">
.edit-report-wrapper .song-item {
	.song-info {
		width: calc(100% - 150px);
	}
	.thumbnail {
		min-width: 130px;
		width: 130px;
		height: 130px;
	}
}
</style>

<style lang="scss" scoped>
.radio-controls .control {
	display: flex;
	align-items: center;
}

.textarea-counter {
	text-align: right;
}

@media screen and (min-width: 769px) {
	.radio-controls .control-label {
		padding-top: 0 !important;
	}
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
</style>
