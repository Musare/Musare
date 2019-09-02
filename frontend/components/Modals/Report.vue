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
							<p class="card-header-title">
								Previous Song
							</p>
						</header>
						<div class="card-content">
							<article class="media">
								<figure class="media-left">
									<p class="image is-64x64">
										<img
											:src="previousSong.thumbnail"
											onerror='this.src="/assets/notes-transparent.png"'
										/>
									</p>
								</figure>
								<div class="media-content">
									<div class="content">
										<p>
											<strong>{{
												previousSong.title
											}}</strong>
											<br />
											<small>{{
												previousSong.artists.split(" ,")
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
				<div v-if="currentSong !== {}" class="column song-type">
					<div
						class="card is-fullwidth"
						:class="{ 'is-highlight-active': isCurrentSongActive }"
						@click="highlight('currentSong')"
					>
						<header class="card-header">
							<p class="card-header-title">
								Current Song
							</p>
						</header>
						<div class="card-content">
							<article class="media">
								<figure class="media-left">
									<p class="image is-64x64">
										<img
											:src="currentSong.thumbnail"
											onerror='this.src="/assets/notes-transparent.png"'
										/>
									</p>
								</figure>
								<div class="media-content">
									<div class="content">
										<p>
											<strong>{{
												currentSong.title
											}}</strong>
											<br />
											<small>{{
												currentSong.artists.split(" ,")
											}}</small>
										</p>
									</div>
								</div>
							</article>
						</div>
						<a
							href="#"
							class="absolute-a"
							@click="highlight('currentSong')"
						/>
					</div>
				</div>
			</div>
			<div class="edit-report-wrapper">
				<div class="columns is-multiline">
					<div
						v-for="(issue, index) in issues"
						class="column is-half"
						:key="index"
					>
						<label class="label">{{ issue.name }}</label>
						<p
							v-for="(reason, index) in issue.reasons"
							class="control"
							:key="index"
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
							@keyup="updateCharactersRemaining()"
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
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";
import Modal from "./Modal.vue";
import io from "../../io";

export default {
	components: { Modal },
	data() {
		return {
			charactersRemaining: 400,
			isPreviousSongActive: false,
			isCurrentSongActive: true,
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
						"It's not available in my country"
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
	computed: mapState({
		currentSong: state => state.station.currentSong,
		previousSong: state => state.station.previousSong
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});

		this.report.songId = this.currentSong.songId;
	},
	methods: {
		create() {
			console.log(this.report);
			this.socket.emit("reports.create", this.report, res => {
				Toast.methods.addToast(res.message, 4000);
				if (res.status === "success")
					this.closeModal({
						sector: "station",
						modal: "report"
					});
			});
		},
		updateCharactersRemaining() {
			this.charactersRemaining =
				400 - document.getElementsByClassName("textarea").value.length;
		},
		highlight(type) {
			if (type === "currentSong") {
				this.report.songId = this.currentSong.songId;
				this.isPreviousSongActive = false;
				this.isCurrentSongActive = true;
			} else if (type === "previousSong") {
				this.report.songId = this.previousSong.songId;
				this.isCurrentSongActive = false;
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
		...mapActions("modals", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

h6 {
	margin-bottom: 15px;
}

.song-type:first-of-type {
	padding-left: 0;
}
.song-type:last-of-type {
	padding-right: 0;
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
	border: 3px $primary-color solid;
}
</style>
