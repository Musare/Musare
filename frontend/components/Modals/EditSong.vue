<template>
	<div>
		<modal title="Edit Song">
			<div slot="body">
				<h5 class="has-text-centered">Video Preview</h5>
				<div class="video-container">
					<div id="player"></div>
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
				<article class="message" v-if="editing.type === 'songs'">
					<div class="message-body">
						<span class="reports-length">
							{{ reports.length }}
							<span
								v-if="reports.length > 1 || reports.length <= 0"
								>&nbsp;Reports</span
							>
							<span v-else>&nbsp;Report</span>
						</span>
						<div v-for="(report, index) in reports" :key="index">
							<a
								:href="`/admin/reports?id=${report}`"
								class="report-link"
								>Report - {{ report }}</a
							>
						</div>
					</div>
				</article>
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
						toggleModal({ sector: 'admin', modal: 'editSong' })
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

import io from "../../io";
import validation from "../../validation";
import { Toast } from "vue-roaster";
import Modal from "./Modal.vue";

export default {
	components: { Modal },
	data() {
		return {
			reports: 0,
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
		save: function(song, close) {
			let _this = this;

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
			if (!validation.isLength(song.title, 1, 64))
				return Toast.methods.addToast(
					"Title must have between 1 and 64 characters.",
					8000
				);
			if (!validation.regex.ascii.test(song.title))
				return Toast.methods.addToast(
					"Invalid title format. Only ascii characters are allowed.",
					8000
				);

			// Artists
			if (song.artists.length < 1 || song.artists.length > 10)
				return Toast.methods.addToast(
					"Invalid artists. You must have at least 1 artist and a maximum of 10 artists.",
					8000
				);
			let error;
			song.artists.forEach(artist => {
				if (!validation.isLength(artist, 1, 32))
					return (error =
						"Artist must have between 1 and 32 characters.");
				if (!validation.regex.ascii.test(artist))
					return (error =
						"Invalid artist format. Only ascii characters are allowed.");
				if (artist === "NONE")
					return (error =
						'Invalid artist format. Artists are not allowed to be named "NONE".');
			});
			if (error) return Toast.methods.addToast(error, 8000);

			// Genres
			error = undefined;
			song.genres.forEach(genre => {
				if (!validation.isLength(genre, 1, 16))
					return (error =
						"Genre must have between 1 and 16 characters.");
				if (!validation.regex.az09_.test(genre))
					return (error =
						"Invalid genre format. Only ascii characters are allowed.");
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

			this.socket.emit(
				`${_this.editing.type}.update`,
				song._id,
				song,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						_this.$parent.songs.forEach(lSong => {
							if (song._id === lSong._id) {
								for (let n in song) {
									lSong[n] = song[n];
								}
							}
						});
					}
					if (close) _this.closeCurrentModal();
				}
			);
		},
		settings: function(type) {
			let _this = this;
			switch (type) {
				case "stop":
					_this.stopVideo();
					_this.pauseVideo(true);
					break;
				case "pause":
					_this.pauseVideo(true);
					break;
				case "play":
					_this.pauseVideo(false);
					break;
				case "skipToLast10Secs":
					_this.video.player.seekTo(
						_this.editing.song.duration -
							10 +
							_this.editing.song.skipDuration
					);
					break;
			}
		},
		changeVolume: function() {
			let local = this;
			let volume = document.getElementById("volumeSlider").value;
			localStorage.setItem("volume", volume);
			local.video.player.setVolume(volume);
			if (volume > 0) local.video.player.unMute();
		},
		addTag: function(type) {
			if (type == "genres") {
				let genre = document
					.getElementById("new-genre")
					.value.toLowerCase()
					.trim();
				if (this.editing.song.genres.indexOf(genre) !== -1)
					return Toast.methods.addToast("Genre already exists", 3000);
				if (genre) {
					this.editing.song.genres.push(genre);
					document.getElementById("new-genre").value = "";
				} else Toast.methods.addToast("Genre cannot be empty", 3000);
			} else if (type == "artists") {
				let artist = document.getElementById("new-artist").value;
				if (this.editing.song.artists.indexOf(artist) !== -1)
					return Toast.methods.addToast(
						"Artist already exists",
						3000
					);
				if (document.getElementById("new-artist").value !== "") {
					this.editing.song.artists.push(artist);
					document.getElementById("new-artist").value = "";
				} else Toast.methods.addToast("Artist cannot be empty", 3000);
			}
		},
		removeTag: function(type, index) {
			if (type == "genres") this.editing.song.genres.splice(index, 1);
			else if (type == "artists")
				this.editing.song.artists.splice(index, 1);
		},
		getSpotifySongs: function() {
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
		...mapActions("admin/songs", [
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"editSong"
		]),
		...mapActions("modals", ["toggleModal", "closeCurrentModal"])
	},
	mounted: function() {
		let _this = this;

		// if (this.modals.editSong = false) this.video.player.stopVideo();

		// this.loadVideoById(
		//   this.editing.song.songId,
		//   this.editing.song.skipDuration
		// );

		lofig.get("cookie.secure", res => {
			_this.useHTTPS = res;
		});

		io.getSocket(socket => (_this.socket = socket));

		setInterval(() => {
			if (
				_this.video.paused === false &&
				_this.playerReady &&
				_this.video.player.getCurrentTime() -
					_this.editing.song.skipDuration >
					_this.editing.song.duration
			) {
				_this.video.paused = false;
				_this.video.player.stopVideo();
			}
			if (this.playerReady) {
				_this
					.getCurrentTime(3)
					.then(time => (this.youtubeVideoCurrentTime = time));
			}
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
			startSeconds: _this.editing.song.skipDuration,
			events: {
				onReady: () => {
					let volume = parseInt(localStorage.getItem("volume"));
					volume = typeof volume === "number" ? volume : 20;
					console.log("Seekto: " + _this.editing.song.skipDuration);
					_this.video.player.seekTo(_this.editing.song.skipDuration);
					_this.video.player.setVolume(volume);
					if (volume > 0) _this.video.player.unMute();
					this.youtubeVideoDuration = _this.video.player.getDuration();
					this.youtubeVideoNote = "(~)";
					_this.playerReady = true;
				},
				onStateChange: event => {
					if (event.data === 1) {
						if (!_this.video.autoPlayed) {
							_this.video.autoPlayed = true;
							return _this.video.player.stopVideo();
						}

						_this.video.paused = false;
						let youtubeDuration = _this.video.player.getDuration();
						this.youtubeVideoDuration = youtubeDuration;
						this.youtubeVideoNote = "";
						youtubeDuration -= _this.editing.song.skipDuration;
						if (_this.editing.song.duration > youtubeDuration + 1) {
							this.video.player.stopVideo();
							_this.video.paused = true;
							Toast.methods.addToast(
								"Video can't play. Specified duration is bigger than the YouTube song duration.",
								4000
							);
						} else if (_this.editing.song.duration <= 0) {
							this.video.player.stopVideo();
							_this.video.paused = true;
							Toast.methods.addToast(
								"Video can't play. Specified duration has to be more than 0 seconds.",
								4000
							);
						}

						if (
							_this.getCurrentTime(time => {
								return time;
							}) < _this.editing.song.skipDuration
						) {
							_this.video.player.seekTo(
								_this.editing.song.skipDuration
							);
						}
					} else if (event.data === 2) {
						this.video.paused = true;
					}
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
	background: #c2c0c2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-webkit-slider-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: #03a9f4;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-moz-range-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: #c2c0c2;
	border-radius: 0;
	border: 0;
}

input[type="range"]::-moz-range-thumb {
	box-shadow: 0;
	border: 0;
	height: 19px;
	width: 19px;
	border-radius: 15px;
	background: #03a9f4;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -6.5px;
}

input[type="range"]::-ms-track {
	width: 100%;
	height: 5.2px;
	cursor: pointer;
	box-shadow: 0;
	background: #c2c0c2;
	border-radius: 1.3px;
}

input[type="range"]::-ms-fill-lower {
	background: #c2c0c2;
	border: 0;
	border-radius: 0;
	box-shadow: 0;
}

input[type="range"]::-ms-fill-upper {
	background: #c2c0c2;
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
	background: #03a9f4;
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
	color: #fff;
}

.tag:not(:last-child) {
	margin-right: 5px;
}

.reports-length {
	color: #ff4545;
	font-weight: bold;
	display: flex;
	justify-content: center;
}

.report-link {
	color: #000;
}
</style>
