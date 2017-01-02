<template>
	<div>
		<modal title='Edit Song'>
			<div slot='body'>
				<h5 class='has-text-centered'>Video Preview</h5>
				<div class='video-container'>
					<div id='player'></div>
					<div class="controls">
						<form action="#" class="column is-7-desktop is-4-mobile">
							<p style="margin-top: 0; position: relative;">
								<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="changeVolume()" v-on:input="changeVolume()">
							</p>
						</form>
						<p class='control has-addons'>
							<button class='button' @click='settings("pause")' v-if='!video.paused'>
								<i class='material-icons'>pause</i>
							</button>
							<button class='button' @click='settings("play")' v-if='video.paused'>
								<i class='material-icons'>play_arrow</i>
							</button>
							<button class='button' @click='settings("stop")'>
								<i class='material-icons'>stop</i>
							</button>
							<button class='button' @click='settings("skipToLast10Secs")'>
								<i class='material-icons'>fast_forward</i>
							</button>
						</p>
					</div>
				</div>
				<h5 class='has-text-centered'>Thumbnail Preview</h5>
				<img class='thumbnail-preview' :src='editing.song.thumbnail' onerror="this.src='/assets/notes-transparent.png'">

				<div class="control is-horizontal">
					<div class="control-label">
						<label class="label">Thumbnail URL</label>
					</div>
					<div class="control">
						<input class='input' type='text' v-model='editing.song.thumbnail'>
					</div>
				</div>

				<h5 class='has-text-centered'>Edit Info</h5>

				<p class='control'>
					<label class='checkbox'>
						<input type='checkbox' v-model='editing.song.explicit'>
						Explicit
					</label>
				</p>
				<label class='label'>Song ID & Title</label>
				<div class="control is-horizontal">
					<div class="control is-grouped">
						<p class='control is-expanded'>
							<input class='input' type='text' v-model='editing.song._id'>
						</p>
						<p class='control is-expanded'>
							<input class='input' type='text' v-model='editing.song.title' autofocus>
						</p>
					</div>
				</div>
				<label class='label'>Artists & Genres</label>
				<div class='control is-horizontal'>
					<div class='control is-grouped artist-genres'>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-artist' type='text' placeholder='Artist'>
								<button class='button is-info' @click='addTag("artists")'>Add Artist</button>
							</p>
							<span class='tag is-info' v-for='(index, artist) in editing.song.artists' track-by='$index'>
								{{ artist }}
								<button class='delete is-info' @click='removeTag("artists", index)'></button>
							</span>
						</div>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-genre' type='text' placeholder='Genre'>
								<button class='button is-info' @click='addTag("genres")'>Add Genre</button>
							</p>
							<span class='tag is-info' v-for='(index, genre) in editing.song.genres' track-by='$index'>
								{{ genre }}
								<button class='delete is-info' @click='removeTag("genres", index)'></button>
							</span>
						</div>
					</div>
				</div>
				<label class='label'>Song Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.duration'>
				</p>
				<label class='label'>Skip Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.skipDuration'>
				</p>
			</div>
			<div slot='footer'>
				<button class='button is-success' @click='save(editing.song, false)'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Save</span>
				</button>
				<button class='button is-success' @click='save(editing.song, true)'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Save and close</span>
				</button>
				<button class='button is-danger' @click='$parent.toggleModal()'>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
	</div>
</template>

<script>
	import io from '../../io';
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';

	export default {
		components: { Modal },
		data() {
			return {
				editing: {
					index: 0,
					song: {},
					type: ''
				},
				video: {
					player: null,
					paused: false,
					playerReady: false
				}
			}
		},
		methods: {
			save: function (song, close) {
				let _this = this;
				this.socket.emit(`${_this.editing.type}.update`, song._id, song, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === 'success') {
						_this.$parent.songs.forEach(lSong => {
							if (song._id === lSong._id) {
								for (let n in song) {
									lSong[n] = song[n];
								}
							}
						});
					}
					if (close) _this.$parent.toggleModal();
				});
			},
			settings: function (type) {
				let _this = this;
				switch(type) {
					case 'stop':
						_this.video.player.stopVideo();
						_this.video.paused = true;
						break;
					case 'pause':
						_this.video.player.pauseVideo();
						_this.video.paused = true;
						break;
					case 'play':
						_this.video.player.playVideo();
						_this.video.paused = false;
						break;
					case 'skipToLast10Secs':
						_this.video.player.seekTo((_this.editing.song.duration - 10) + _this.editing.song.skipDuration);
						break;
				}
			},
			changeVolume: function () {
				let local = this;
				let volume = $("#volumeSlider").val();
				localStorage.setItem("volume", volume);
				local.video.player.setVolume(volume);
				if (volume > 0) local.video.player.unMute();
			},
			addTag: function (type) {
				if (type == 'genres') {
					let genre = $('#new-genre').val().toLowerCase().trim();
					if (this.editing.song.genres.indexOf(genre) !== -1) return Toast.methods.addToast('Genre already exists', 3000);
					if (genre) {
						this.editing.song.genres.push(genre);
						$('#new-genre').val('');
					} else Toast.methods.addToast('Genre cannot be empty', 3000);
				} else if (type == 'artists') {
					let artist = $('#new-artist').val();
					if (this.editing.song.artists.indexOf(artist) !== -1) return Toast.methods.addToast('Artist already exists', 3000);
					if ($('#new-artist').val() !== '') {
						this.editing.song.artists.push(artist);
						$('#new-artist').val('');
					} else Toast.methods.addToast('Artist cannot be empty', 3000);
				}
			},
			removeTag: function (type, index) {
				if (type == 'genres') this.editing.song.genres.splice(index, 1);
				else if (type == 'artists') this.editing.song.artists.splice(index, 1);
			},
		},
		ready: function () {

			let _this = this;

			io.getSocket(socket => {
				_this.socket = socket;
			});
			
			setInterval(() => {
				if (_this.video.paused === false && _this.playerReady && _this.video.player.getCurrentTime() - _this.editing.song.skipDuration > _this.editing.song.duration) {
					_this.video.paused = false;
					_this.video.player.stopVideo();
				}
			}, 200);

			this.video.player = new YT.Player('player', {
				height: 315,
				width: 560,
				videoId: this.editing.song._id,
				playerVars: { controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0 },
				startSeconds: _this.editing.song.skipDuration,
				events: {
					'onReady': () => {
						let volume = parseInt(localStorage.getItem("volume"));
						volume = (typeof volume === "number") ? volume : 20;
						_this.video.player.seekTo(_this.editing.song.skipDuration);
						_this.video.player.setVolume(volume);
						if (volume > 0) _this.video.player.unMute();
						_this.playerReady = true;
					},
					'onStateChange': event => {
						if (event.data === 1) {
							_this.video.paused = false;
							let youtubeDuration = _this.video.player.getDuration();
							youtubeDuration -= _this.editing.song.skipDuration;
							if (_this.editing.song.duration > youtubeDuration) {
								this.video.player.stopVideo();
								_this.video.paused = true;
								Toast.methods.addToast("Video can't play. Specified duration is bigger than the YouTube song duration.", 4000);
							} else if (_this.editing.song.duration <= 0) {
								this.video.player.stopVideo();
								_this.video.paused = true;
								Toast.methods.addToast("Video can't play. Specified duration has to be more than 0 seconds.", 4000);
							}

							if (_this.video.player.getCurrentTime() < _this.editing.song.skipDuration) {
								_this.video.player.seekTo(10);
							}
						} else if (event.data === 2) {
							this.video.paused = true;
						}
					}
				}
			});

			let volume = parseInt(localStorage.getItem("volume"));
			volume = (typeof volume === "number") ? volume : 20;
			$("#volumeSlider").val(volume);
			
		},
		events: {
			closeModal: function () {
				this.$parent.modals.editSong = false;
			},
			editSong: function (song, index, type) {
				this.video.player.loadVideoById(song._id, this.editing.song.skipDuration);
				let newSong = {};
				for (let n in song) {
					newSong[n] = song[n];
				}
				this.editing = {
					index,
					song: newSong,
					type
				};
				this.$parent.toggleModal();
			}
		}
	}
</script>

<style type='scss' scoped>
	input[type=range] {
		-webkit-appearance: none;
		width: 100%;
		margin: 7.3px 0;
	}

	input[type=range]:focus {
		outline: none;
	}

	input[type=range]::-webkit-slider-runnable-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 0;
		border: 0;
	}

	input[type=range]::-webkit-slider-thumb {
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

	input[type=range]::-moz-range-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 0;
		border: 0;
	}

	input[type=range]::-moz-range-thumb {
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

	input[type=range]::-ms-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 1.3px;
	}

	input[type=range]::-ms-fill-lower {
		background: #c2c0c2;
		border: 0;
		border-radius: 0;
		box-shadow: 0;
	}

	input[type=range]::-ms-fill-upper {
		background: #c2c0c2;
		border: 0;
		border-radius: 0;
		box-shadow: 0;
	}

	input[type=range]::-ms-thumb {
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

	#volumeSlider { margin-bottom: 15px; }

	.has-text-centered { padding: 10px; }

	.thumbnail-preview {
		display: flex;
		margin: 0 auto 25px auto;
		max-width: 200px;
		width: 100%;
	}

	.modal-card-body, .modal-card-foot { border-top: 0; }

	.label, .checkbox, h5 {
		font-weight: normal;
	}

	.video-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px;

		iframe { pointer-events: none; }
	}

	.save-changes { color: #fff; }

	.tag:not(:last-child) { margin-right: 5px; }
</style>