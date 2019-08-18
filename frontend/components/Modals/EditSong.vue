<template>
	<div>
		<modal title="Edit Song">
			<div slot="body">
				<h5 class="has-text-centered">Video Preview</h5>
				<div class="video-container">
					<div id="player"></div>
					<canvas
						id="durationCanvas"
						height="40"
						width="560"
					></canvas>
					<div class="controls">
						<form action="#">
							<p style="margin-top: 0; position: relative;">
								<input
									type="range"
									id="volumeSlider"
									min="0"
									max="100"
									class="active"
									v-on:change="changeVolume()"
									v-on:input="changeVolume()"
								/>
							</p>
						</form>
						<p class="control has-addons">
							<button
								class="button"
								v-on:click="settings('pause')"
								v-if="!video.paused"
							>
								<i class="material-icons">pause</i>
							</button>
							<button
								class="button"
								v-on:click="settings('play')"
								v-if="video.paused"
							>
								<i class="material-icons">play_arrow</i>
							</button>
							<button
								class="button"
								v-on:click="settings('stop')"
							>
								<i class="material-icons">stop</i>
							</button>
							<button
								class="button"
								v-on:click="settings('skipToLast10Secs')"
							>
								<i class="material-icons">fast_forward</i>
							</button>
						</p>
						<p>
							YouTube:
							<span>{{ youtubeVideoCurrentTime }}</span> /
							<span>{{ youtubeVideoDuration }}</span>
							{{ youtubeVideoNote }}
						</p>
					</div>
				</div>
				<h5 class="has-text-centered">Thumbnail Preview</h5>
				<img
					class="thumbnail-preview"
					:src="editing.song.thumbnail"
					onerror="this.src='/assets/notes-transparent.png'"
				/>

				<div class="control is-horizontal">
					<div class="control-label">
						<label class="label">Thumbnail URL</label>
					</div>
					<div class="control">
						<input
							class="input"
							type="text"
							v-model="editing.song.thumbnail"
						/>
					</div>
				</div>

				<h5 class="has-text-centered">Edit Information</h5>

				<p class="control">
					<label class="checkbox">
						<input
							type="checkbox"
							v-model="editing.song.explicit"
						/>
						Explicit
					</label>
				</p>
				<label class="label">Song ID & Title</label>
				<div class="control is-horizontal">
					<div class="control is-grouped">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								v-model="editing.song.songId"
							/>
						</p>
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								v-model="editing.song.title"
								autofocus
							/>
						</p>
					</div>
				</div>
				<label class="label">Artists & Genres</label>
				<div class="control is-horizontal">
					<div class="control is-grouped artist-genres">
						<div>
							<p class="control has-addons">
								<input
									class="input"
									id="new-artist"
									type="text"
									placeholder="Artist"
								/>
								<button
									class="button is-info"
									v-on:click="addTag('artists')"
								>
									Add Artist
								</button>
							</p>
							<span
								class="tag is-info"
								v-for="(artist, index) in editing.song.artists"
								:key="index"
							>
								{{ artist }}
								<button
									class="delete is-info"
									v-on:click="removeTag('artists', index)"
								></button>
							</span>
						</div>
						<div>
							<p class="control has-addons">
								<input
									class="input"
									id="new-genre"
									type="text"
									placeholder="Genre"
								/>
								<button
									class="button is-info"
									v-on:click="addTag('genres')"
								>
									Add Genre
								</button>
							</p>
							<span
								class="tag is-info"
								v-for="(genre, index) in editing.song.genres"
								:key="index"
							>
								{{ genre }}
								<button
									class="delete is-info"
									v-on:click="removeTag('genres', index)"
								></button>
							</span>
						</div>
					</div>
				</div>
				<label class="label">Song Duration</label>
				<p class="control">
					<input
						class="input"
						type="text"
						v-model="editing.song.duration"
					/>
				</p>
				<label class="label">Skip Duration</label>
				<p class="control">
					<input
						class="input"
						type="text"
						v-model="editing.song.skipDuration"
					/>
				</p>
				<hr />
				<h5 class="has-text-centered">Spotify Information</h5>
				<label class="label">Song title</label>
				<p class="control">
					<input class="input" type="text" v-model="spotify.title" />
				</p>
				<label class="label">Song artist (1 artist full name)</label>
				<p class="control">
					<input class="input" type="text" v-model="spotify.artist" />
				</p>
				<button
					class="button is-success"
					v-on:click="getSpotifySongs()"
				>
					Get Spotify songs
				</button>
				<hr />
				<article
					class="media"
					v-for="(song, index) in spotify.songs"
					:key="index"
				>
					<figure class="media-left">
						<p class="image is-64x64">
							<img
								:src="song.thumbnail"
								onerror="this.src='/assets/notes-transparent.png'"
							/>
						</p>
					</figure>
					<div class="media-content">
						<div class="content">
							<p>
								<strong>{{ song.title }}</strong>
								<br />
								<small>Artists: {{ song.artists }}</small
								>, <small>Duration: {{ song.duration }}</small
								>,
								<small>Explicit: {{ song.explicit }}</small>
								<br />
								<small>Thumbnail: {{ song.thumbnail }}</small>
							</p>
						</div>
					</div>
				</article>
			</div>
			<div slot="footer">
				<button
					class="button is-success"
					v-on:click="save(editing.song, false)"
				>
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Save</span>
				</button>
				<button
					class="button is-success"
					v-on:click="save(editing.song, true)"
				>
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Save and close</span>
				</button>
				<button
					class="button is-danger"
					v-on:click="
						closeModal({ sector: 'admin', modal: 'editSong' })
					"
				>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { Toast } from "vue-roaster";

import io from "../../io";
import validation from "../../validation";
import Modal from "./Modal.vue";

export default {
	components: { Modal },
	data() {
		return {
			spotify: {
				title: "",
				artist: "",
				songs: []
			},
			youtubeVideoDuration: 0.0,
			youtubeVideoCurrentTime: 0.0,
			youtubeVideoNote: "",
			useHTTPS: false
		};
	},
	computed: {
		...mapState("admin/songs", {
			video: state => state.video,
			editing: state => state.editing
		}),
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	methods: {
		save(song, close) {
			if (!song.title)
				return Toast.methods.addToast(
					"Please fill in all fields",
					8000
				);
			if (!song.thumbnail)
				return Toast.methods.addToast(
					"Please fill in all fields",
					8000
				);

			// Duration
			if (
				Number(song.skipDuration) + Number(song.duration) >
				this.youtubeVideoDuration
			) {
				return Toast.methods.addToast(
					"Duration can't be higher than the length of the video",
					8000
				);
			}

			// Title
			if (!validation.isLength(song.title, 1, 100))
				return Toast.methods.addToast(
					"Title must have between 1 and 100 characters.",
					8000
				);
			/* if (!validation.regex.ascii.test(song.title))
				return Toast.methods.addToast(
					"Invalid title format. Only ascii characters are allowed.",
					8000
				); */

			// Artists
			if (song.artists.length < 1 || song.artists.length > 10)
				return Toast.methods.addToast(
					"Invalid artists. You must have at least 1 artist and a maximum of 10 artists.",
					8000
				);
			let error;
			song.artists.forEach(artist => {
				if (!validation.isLength(artist, 1, 32)) {
					error = "Artist must have between 1 and 32 characters.";
					return error;
				}
				if (!validation.regex.ascii.test(artist)) {
					error =
						"Invalid artist format. Only ascii characters are allowed.";
					return error;
				}
				if (artist === "NONE") {
					error =
						'Invalid artist format. Artists are not allowed to be named "NONE".';
					return error;
				}

				return false;
			});
			if (error) return Toast.methods.addToast(error, 8000);

			// Genres
			error = undefined;
			song.genres.forEach(genre => {
				if (!validation.isLength(genre, 1, 16)) {
					error = "Genre must have between 1 and 16 characters.";
					return error;
				}
				if (!validation.regex.az09_.test(genre)) {
					error =
						"Invalid genre format. Only ascii characters are allowed.";
					return error;
				}

				return false;
			});
			if (error) return Toast.methods.addToast(error, 8000);

			// Thumbnail
			if (!validation.isLength(song.thumbnail, 8, 256))
				return Toast.methods.addToast(
					"Thumbnail must have between 8 and 256 characters.",
					8000
				);
			if (this.useHTTPS && song.thumbnail.indexOf("https://") !== 0) {
				return Toast.methods.addToast(
					'Thumbnail must start with "https://".',
					8000
				);
			}

			if (!this.useHTTPS && song.thumbnail.indexOf("http://") !== 0) {
				return Toast.methods.addToast(
					'Thumbnail must start with "http://".',
					8000
				);
			}

			return this.socket.emit(
				`${this.editing.type}.update`,
				song._id,
				song,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						this.$parent.songs.forEach(originalSong => {
							const updatedSong = song;
							if (originalSong._id === updatedSong._id) {
								Object.keys(originalSong).forEach(n => {
									updatedSong[n] = originalSong[n];
									return originalSong[n];
								});
							}
						});
					}
					if (close)
						this.closeModal({
							sector: "admin",
							modal: "editSong"
						});
				}
			);
		},
		settings(type) {
			switch (type) {
				default:
					break;
				case "stop":
					this.stopVideo();
					this.pauseVideo(true);
					break;
				case "pause":
					this.pauseVideo(true);
					break;
				case "play":
					this.pauseVideo(false);
					break;
				case "skipToLast10Secs":
					this.video.player.seekTo(
						this.editing.song.duration -
							10 +
							this.editing.song.skipDuration
					);
					break;
			}
		},
		changeVolume() {
			const volume = document.getElementById("volumeSlider").value;
			localStorage.setItem("volume", volume);
			this.video.player.setVolume(volume);
			if (volume > 0) this.video.player.unMute();
		},
		addTag(type) {
			if (type === "genres") {
				const genre = document
					.getElementById("new-genre")
					.value.toLowerCase()
					.trim();
				if (this.editing.song.genres.indexOf(genre) !== -1)
					return Toast.methods.addToast("Genre already exists", 3000);
				if (genre) {
					this.editing.song.genres.push(genre);
					document.getElementById("new-genre").value = "";
					return false;
				}

				return Toast.methods.addToast("Genre cannot be empty", 3000);
			}
			if (type === "artists") {
				const artist = document.getElementById("new-artist").value;
				if (this.editing.song.artists.indexOf(artist) !== -1)
					return Toast.methods.addToast(
						"Artist already exists",
						3000
					);
				if (document.getElementById("new-artist").value !== "") {
					this.editing.song.artists.push(artist);
					document.getElementById("new-artist").value = "";
					return false;
				}
				return Toast.methods.addToast("Artist cannot be empty", 3000);
			}

			return false;
		},
		removeTag(type, index) {
			if (type === "genres") this.editing.song.genres.splice(index, 1);
			else if (type === "artists")
				this.editing.song.artists.splice(index, 1);
		},
		getSpotifySongs() {
			this.socket.emit(
				"apis.getSpotifySongs",
				this.spotify.title,
				this.spotify.artist,
				res => {
					if (res.status === "success") {
						Toast.methods.addToast(
							`Succesfully got ${res.songs.length} song${
								res.songs.length !== 1 ? "s" : ""
							}.`,
							3000
						);
						this.spotify.songs = res.songs;
					} else
						Toast.methods.addToast(
							`Failed to get songs. ${res.message}`,
							3000
						);
				}
			);
		},
		initCanvas() {
			const canvasElement = document.getElementById("durationCanvas");
			const ctx = canvasElement.getContext("2d");

			const skipDurationColor = "#ef4a1c";
			const durationColor = "#1dc146";
			const afterDurationColor = "#ef731a";

			ctx.font = "16px Arial";

			ctx.fillStyle = skipDurationColor;
			ctx.fillRect(0, 25, 20, 15);

			ctx.fillStyle = "#000000";
			ctx.fillText("Skip duration", 25, 38);

			ctx.fillStyle = durationColor;
			ctx.fillRect(130, 25, 20, 15);

			ctx.fillStyle = "#000000";
			ctx.fillText("Duration", 155, 38);

			ctx.fillStyle = afterDurationColor;
			ctx.fillRect(230, 25, 20, 15);

			ctx.fillStyle = "#000000";
			ctx.fillText("After duration", 255, 38);
		},
		drawCanvas() {
			const canvasElement = document.getElementById("durationCanvas");
			const ctx = canvasElement.getContext("2d");

			const videoDuration = Number(this.youtubeVideoDuration);

			const skipDuration = Number(this.editing.song.skipDuration);
			const duration = Number(this.editing.song.duration);
			const afterDuration = videoDuration - (skipDuration + duration);

			const width = 560;

			const currentTime = this.video.player.getCurrentTime();

			const widthSkipDuration = (skipDuration / videoDuration) * width;
			const widthDuration = (duration / videoDuration) * width;
			const widthAfterDuration = (afterDuration / videoDuration) * width;

			const widthCurrentTime = (currentTime / videoDuration) * width;

			const skipDurationColor = "#ef4a1c";
			const durationColor = "#1dc146";
			const afterDurationColor = "#ef731a";
			const currentDurationColor = "#3b25e8";

			ctx.fillStyle = skipDurationColor;
			ctx.fillRect(0, 0, widthSkipDuration, 20);
			ctx.fillStyle = durationColor;
			ctx.fillRect(widthSkipDuration, 0, widthDuration, 20);
			ctx.fillStyle = afterDurationColor;
			ctx.fillRect(
				widthSkipDuration + widthDuration,
				0,
				widthAfterDuration,
				20
			);

			ctx.fillStyle = currentDurationColor;
			ctx.fillRect(widthCurrentTime, 0, 1, 20);
		},
		...mapActions("admin/songs", [
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"editSong"
		]),
		...mapActions("modals", ["closeModal"])
	},
	mounted() {
		// if (this.modals.editSong = false) this.video.player.stopVideo();

		// this.loadVideoById(
		//   this.editing.song.songId,
		//   this.editing.song.skipDuration
		// );

		this.initCanvas();

		lofig.get("cookie.secure", res => {
			this.useHTTPS = res;
		});

		io.getSocket(socket => {
			this.socket = socket;
		});

		setInterval(() => {
			if (
				this.video.paused === false &&
				this.playerReady &&
				this.video.player.getCurrentTime() -
					this.editing.song.skipDuration >
					this.editing.song.duration
			) {
				this.video.paused = false;
				this.video.player.stopVideo();
			}
			if (this.playerReady) {
				this.getCurrentTime(3).then(time => {
					this.youtubeVideoCurrentTime = time;
					return time;
				});
			}

			if (this.video.paused === false) this.drawCanvas();
		}, 200);

		this.video.player = new window.YT.Player("player", {
			height: 315,
			width: 560,
			videoId: this.editing.song.songId,
			playerVars: {
				controls: 0,
				iv_load_policy: 3,
				rel: 0,
				showinfo: 0,
				autoplay: 1
			},
			startSeconds: this.editing.song.skipDuration,
			events: {
				onReady: () => {
					let volume = parseInt(localStorage.getItem("volume"));
					volume = typeof volume === "number" ? volume : 20;
					console.log(`Seekto: ${this.editing.song.skipDuration}`);
					this.video.player.seekTo(this.editing.song.skipDuration);
					this.video.player.setVolume(volume);
					if (volume > 0) this.video.player.unMute();
					this.youtubeVideoDuration = this.video.player.getDuration();
					this.youtubeVideoNote = "(~)";
					this.playerReady = true;

					this.drawCanvas();
				},
				onStateChange: event => {
					if (event.data === 1) {
						if (!this.video.autoPlayed) {
							this.video.autoPlayed = true;
							return this.video.player.stopVideo();
						}

						this.video.paused = false;
						let youtubeDuration = this.video.player.getDuration();
						this.youtubeVideoDuration = youtubeDuration;
						this.youtubeVideoNote = "";
						youtubeDuration -= this.editing.song.skipDuration;
						if (this.editing.song.duration > youtubeDuration + 1) {
							this.video.player.stopVideo();
							this.video.paused = true;
							return Toast.methods.addToast(
								"Video can't play. Specified duration is bigger than the YouTube song duration.",
								4000
							);
						}
						if (this.editing.song.duration <= 0) {
							this.video.player.stopVideo();
							this.video.paused = true;
							return Toast.methods.addToast(
								"Video can't play. Specified duration has to be more than 0 seconds.",
								4000
							);
						}

						if (
							this.video.player.getCurrentTime() <
							this.editing.song.skipDuration
						) {
							return this.video.player.seekTo(
								this.editing.song.skipDuration
							);
						}
					} else if (event.data === 2) {
						this.video.paused = true;
					}

					return false;
				}
			}
		});

		let volume = parseInt(localStorage.getItem("volume"));
		document.getElementById("volumeSlider").value = volume =
			typeof volume === "number" ? volume : 20;
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

input[type="range"] {
	-webkit-appearance: none;
	width: 100%;
	margin: 7.3px 0;
}

input[type="range"]:focus {
	outline: none;
}

input[type="range"]::-webkit-slider-runnable-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: $light-grey-2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-webkit-slider-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: $primary-color;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-moz-range-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: $light-grey-2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-moz-range-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: $primary-color;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-ms-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: $light-grey-2;
	border-radius: 1.3px;
}

input[type="range"]::-ms-fill-lower {
	background: $light-grey-2;
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-fill-upper {
	background: $light-grey-2;
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-thumb {
	box-shadow: 0;
	border: 0;
	height: 15px;
	width: 15px;
	border-radius: 15px;
	background: $primary-color;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: 1.5px;
}

.controls {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.artist-genres {
	display: flex;
	justify-content: space-between;
}

#volumeSlider {
	margin-bottom: 15px;
}

.has-text-centered {
	padding: 10px;
}

.thumbnail-preview {
	display: flex;
	margin: 0 auto 25px auto;
	max-width: 200px;
	width: 100%;
}

.modal-card-body,
.modal-card-foot {
	border-top: 0;
}

.label,
.checkbox,
h5 {
	font-weight: normal;
}

.video-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10px;

	iframe {
		pointer-events: none;
	}
}

.save-changes {
	color: $white;
}

.tag:not(:last-child) {
	margin-right: 5px;
}
</style>
