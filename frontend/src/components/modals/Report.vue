<template>
	<modal title="Report">
		<div slot="body">
			<div class="columns song-types">
				<div v-if="previousSong !== null" class="column song-type">
					<div
						class="card is-fullwidth"
						:class="{ 'is-highlight-active': isPreviousSongActive }"
						@click="highlight('previousSong')"
					>
						<header class="card-header">
							<p class="card-header-title">Previous Song</p>
						</header>
						<div class="card-content">
							<article class="media">
								<figure class="media-left">
									<song-thumbnail
										class="image is-64x64"
										:song="previousSong"
									/>
								</figure>
								<div class="media-content">
									<div class="content">
										<p>
											<strong>{{
												previousSong.title
											}}</strong>
											<br />
											<small>{{
												previousSong.artists.join(", ")
											}}</small>
										</p>
									</div>
								</div>
							</article>
						</div>
						<a
							href="#"
							class="absolute-a"
							@click="highlight('previousSong')"
						/>
					</div>
				</div>
				<div v-if="localSong !== null" class="column song-type">
					<div
						class="card is-fullwidth"
						:class="{ 'is-highlight-active': isLocalSongActive }"
						@click="highlight('localSong')"
					>
						<header class="card-header">
							<p class="card-header-title">Selected Song</p>
						</header>
						<div class="card-content">
							<article class="media">
								<figure class="media-left">
									<song-thumbnail
										class="image is-64x64"
										:song="localSong"
									/>
								</figure>
								<div class="media-content">
									<div class="content">
										<p>
											<strong>{{
												localSong.title
											}}</strong>
											<br />
											<small>{{
												localSong.artists.join(", ")
											}}</small>
										</p>
									</div>
								</div>
							</article>
						</div>
						<a
							href="#"
							class="absolute-a"
							@click="highlight('localSong')"
						/>
					</div>
				</div>
			</div>
			<div class="edit-report-wrapper">
				<div class="columns is-multiline">
					<div
						v-for="(issue, issueIndex) in issues"
						class="column is-half"
						:key="issueIndex"
					>
						<label class="label">{{ issue.name }}</label>
						<p
							v-for="(reason, reasonIndex) in issue.reasons"
							class="control"
							:key="reasonIndex"
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
			<a
				class="button is-danger"
				href="#"
				@click="
					closeModal({
						sector: 'station',
						modal: 'report'
					})
				"
			>
				<span>&nbsp;Cancel</span>
			</a>
		</div>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import Modal from "../Modal.vue";
import SongThumbnail from "../SongThumbnail.vue";

export default {
	components: { Modal, SongThumbnail },
	data() {
		return {
			isPreviousSongActive: false,
			isLocalSongActive: true,
			localSong: null,
			report: {
				resolved: false,
				songId: "",
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
			previousSong: state => state.station.previousSong,
			song: state => state.modals.report.song
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.song !== null) {
			this.localSong = this.song;
			this.report.songId = this.song.songId;
			this.reportSong(null);
		}
	},
	methods: {
		create() {
			this.socket.dispatch("reports.create", this.report, res => {
				new Toast(res.message);
				if (res.status === "success")
					this.closeModal({
						sector: "station",
						modal: "report"
					});
			});
		},
		highlight(type) {
			if (type === "localSong") {
				this.report.songId = this.localSong.songId;
				this.isPreviousSongActive = false;
				this.isLocalSongActive = true;
			} else if (type === "previousSong") {
				this.report.songId = this.previousSong.songId;
				this.isLocalSongActive = false;
				this.isPreviousSongActive = true;
			}
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

<style lang="scss" scoped>
h6 {
	margin-bottom: 15px;
}

.song-type:first-of-type {
	padding-left: 0;
}
.song-type:last-of-type {
	padding-right: 0;
}

.thumbnail.image.is-64x64 {
	min-width: 64px;
	margin: 0;
}

.media-content {
	display: flex;
	align-items: center;
	height: 64px;
}

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

.edit-report-wrapper {
	padding: 20px;
}

.is-highlight-active {
	border: 3px var(--primary-color) solid;
}
</style>
