<template>
	<div class='columns is-mobile'>
		<div class='column is-8-desktop is-offset-2-desktop is-12-mobile'>
			<table class='table is-striped'>
				<thead>
					<tr>
						<td>Thumbnail</td>
						<td>Title</td>
						<td>YouTube ID</td>
						<td>Artists</td>
						<td>Genres</td>
						<td>Requested By</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for='(index, song) in songs' track-by='$index'>
						<td>
							<img class='song-thumbnail' :src='song.thumbnail' onerror="this.src='/assets/notes.png'">
						</td>
						<td>
							<strong>{{ song.title }}</strong>
						</td>
						<td>{{ song._id }}</td>
						<td>{{ song.artists.join(', ') }}</td>
						<td>{{ song.genres.join(', ') }}</td>
						<td>{{ song.requestedBy }}</td>
						<td>
							<a class='button is-primary' @click='edit(song, index)'>Edit</a>
							<a class='button is-success' @click='add(song)'>Add</a>
							<a class='button is-danger' @click='remove(song._id, index)'>Remove</a>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div class='modal' :class="{ 'is-active': isEditActive }">
		<div class='modal-background'></div>
		<div class='modal-card'>
			<section class='modal-card-body'>

				<h5 class='has-text-centered'>Video Preview</h5>
				<div class='video-container'>
					<div id='player'></div>
					<p class='control has-addons'>
						<a class='button'>
							<i class='material-icons' @click='video.settings("pause")' v-if='!video.paused'>pause</i>
							<i class='material-icons' @click='video.settings("play")' v-else>play_arrow</i>
						</a>
						<a class='button' @click='video.settings("stop")'>
							<i class='material-icons'>stop</i>
						</a>
						<a class='button' @click='video.settings("skipToLast10Secs")'>
							<i class='material-icons'>fast_forward</i>
						</a>
					</p>
				</div>
				<p style="margin-top: 0; position: relative;">
					<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="changeVolume()" v-on:input="changeVolume()">
				</p>

				<h5 class='has-text-centered'>Thumbnail Preview</h5>
				<img class='thumbnail-preview' :src='editing.song.thumbnail'>

				<label class='label'>Thumbnail URL</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.thumbnail'>
				</p>

				<h5 class='has-text-centered'>Edit Info</h5>

				<p class='control'>
					<label class='checkbox'>
						<input type='checkbox' v-model='editing.song.explicit'>
						Explicit
					</label>
				</p>
				<label class='label'>Song ID</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song._id'>
				</p>
				<label class='label'>Song Title</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.title'>
				</p>
				<div class='control is-horizontal'>
					<div class='control is-grouped'>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-artist' type='text' placeholder='Artist'>
								<a class='button is-info' @click='addTag("artists")'>Add Artist</a>
							</p>
							<span class='tag is-info' v-for='(index, artist) in editing.song.artists' track-by='$index'>
								{{ artist }}
								<button class='delete is-info' @click='removeTag("artists", index)'></button>
							</span>
						</div>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-genre' type='text' placeholder='Genre'>
								<a class='button is-info' @click='addTag("genres")'>Add Genre</a>
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

			</section>
			<footer class='modal-card-foot'>
				<a class='button is-success' @click='save(editing.song)'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Save</span>
				</a>
				<a class='button is-danger' @click='cancel()'>
					<span>&nbspCancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				songs: [],
				isEditActive: false,
				editing: {
					index: 0,
					song: {}
				},
				video: {
					player: null,
					paused: false,
					settings: function (type) {
						switch(type) {
							case 'stop':
								this.player.stopVideo();
								this.paused = true;
								break;
							case 'pause':
								this.player.pauseVideo();
								this.paused = true;
								break;
							case 'play':
								this.player.playVideo();
								this.paused = false;
								break;
							case 'skipToLast10Secs':
								this.player.seekTo(this.player.getDuration() - 10);
								break;
						}
					}
				}
			}
		},
		methods: {
			changeVolume: function() {
				let local = this;
				let volume = $("#volumeSlider").val();
				localStorage.setItem("volume", volume);
				local.video.player.setVolume(volume);
				if (volume > 0) local.player.unMute();
			},
			toggleModal: function () {
				this.isEditActive = !this.isEditActive;
				this.video.settings('stop');
			},
			addTag: function (type) {
				if (type == 'genres') {
					for (let z = 0; z < this.editing.song.genres.length; z++) {
						if (this.editing.song.genres[z] == $('#new-genre').val()) return Toast.methods.addToast('Genre already exists', 3000);
					}
					if ($('#new-genre').val() !== '') this.editing.song.genres.push($('#new-genre').val());
					else Toast.methods.addToast('Genre cannot be empty', 3000);
				} else if (type == 'artists') {
					for (let z = 0; z < this.editing.song.artists.length; z++) {
						if (this.editing.song.artists[z] == $('#new-artist').val()) return Toast.methods.addToast('Artist already exists', 3000);
					}
					if ($('#new-artist').val() !== '') this.editing.song.artists.push($('#new-artist').val());
					else Toast.methods.addToast('Artist cannot be empty', 3000);
				}
			},
			removeTag: function (type, index) {
				if (type == 'genres') this.editing.song.genres.splice(index, 1);
				else if (type == 'artists') this.editing.song.artists.splice(index, 1);
			},
			edit: function (song, index) {
				this.editing = { index, song };
				this.video.player.loadVideoById(song._id);
				this.isEditActive = true;
			},
			save: function (song) {
				let _this = this;
				this.socket.emit('queueSongs.update', song._id, song, function (res) {
					if (res.status == 'success' || res.status == 'error') Toast.methods.addToast(res.message, 2000);
					_this.toggleModal();
				});
			},
			cancel: function () {
				let _this = this;
				_this.toggleModal();
			},
			add: function (song) {
				this.socket.emit('songs.add', song, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 2000);
				});
			},
			remove: function (id, index) {
				this.songs.splice(index, 1);
				this.socket.emit('queueSongs.remove', id, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 2000);
				});
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					_this.socket.emit('queueSongs.index', data => {
						_this.songs = data;
					});
					clearInterval(socketInterval);
				}
			}, 100);

			this.video.player = new YT.Player('player', {
				height: 315,
				width: 560,
				videoId: this.editing.song._id,
				playerVars: { controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0 },
				events: {
					'onReady': () => {
						let volume = parseInt(localStorage.getItem("volume"));
						volume = (typeof volume === "number") ? volume : 20;
						_this.video.player.setVolume(volume);
						if (volume > 0) _this.video.player.unMute();
					},
					'onStateChange': event => {
						if (event.data == 1) {
							let youtubeDuration = _this.video.player.getDuration();
							youtubeDuration -= _this.editing.song.skipDuration;
							if (_this.editing.song.duration > youtubeDuration) this.stopVideo();
						}
					}
				}
			});
			let volume = parseInt(localStorage.getItem("volume"));
			volume = (typeof volume === "number") ? volume : 20;
			$("#volumeSlider").val(volume);
		}
	}
</script>

<style lang='scss' scoped>
	body { font-family: 'Roboto', sans-serif; }

	.thumbnail-preview {
		display: flex;
		margin: 0 auto;
		padding: 10px 0 20px 0;
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

		iframe {
			pointer-events: none;
		}
	}

	.save-changes { color: #fff; }

	.song-thumbnail {
		display: block;
		max-width: 50px;
		margin: 0 auto;
	}

	td { vertical-align: middle; }

	.tag:not(:last-child) { margin-right: 5px; }	
</style>
