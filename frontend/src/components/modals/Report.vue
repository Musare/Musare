<template>
	<modal title="Report">
		<div slot="body">
			<div class="edit-report-wrapper">
				<song-item
					:song="localSong"
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
							class="control"
							:key="reason"
						>
							<label class="checkbox">
								<input
									type="checkbox"
									@click="toggleIssue(issue.name, reason)"
								/>
								{{ reason }}
							</label>
						</p>
					</div>
					<div class="column">
						<label class="label">Other</label>
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
				</div>
			</div>
		</div>
		<div slot="footer">
			<a class="button is-success" @click="create()" href="#">
				<i class="material-icons save-changes">done</i>
				<span>&nbsp;Create</span>
			</a>
			<a class="button is-danger" href="#" @click="closeModal('report')">
				<span>&nbsp;Cancel</span>
			</a>
		</div>
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
			localSong: null,
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
						"Doesn't exist",
						"It's private",
						"It's not available in my country",
						"Unofficial"
					]
				},
				{
					name: "Title",
					reasons: ["Incorrect", "Inappropriate"]
				},
				{
					name: "Duration",
					reasons: [
						"Skips too soon",
						"Skips too late",
						"Starts too soon",
						"Starts too late"
					]
				},
				{
					name: "Artists",
					reasons: ["Incorrect", "Inappropriate"]
				},
				{
					name: "Thumbnail",
					reasons: ["Incorrect", "Inappropriate", "Doesn't exist"]
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
		if (this.song !== null) {
			this.localSong = this.song;
			this.report.youtubeId = this.song.youtubeId;
			this.reportSong(null);
		}
	},
	methods: {
		create() {
			this.socket.dispatch("reports.create", this.report, res => {
				new Toast(res.message);
				if (res.status === "success") this.closeModal("report");
			});
		},
		toggleIssue(name, reason) {
			for (let z = 0; z < this.report.issues.length; z += 1) {
				if (this.report.issues[z].name === name) {
					if (this.report.issues[z].reasons.indexOf(reason) > -1) {
						this.report.issues[z].reasons.splice(
							this.report.issues[z].reasons.indexOf(reason),
							1
						);
					} else this.report.issues[z].reasons.push(reason);
				}
			}
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
}
</style>
