<template>
	<div class='columns is-mobile'>
		<div class='column is-8-desktop is-offset-2-desktop is-12-mobile'>
			<table class='table is-striped'>
				<thead>
					<tr>
						<td>Title</td>
						<td>YouTube ID</td>
						<td>Artists</td>
						<td>Genres</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for='(index, song) in songs' track-by='$index'>
						<td>
							<p class='control'>
								<input class='input' type='text' v-model='song.title'>
							</p>
						</td>
						<td>
							<p class='control'>
								<input class='input' type='text' v-model='song._id'>
							</p>
						</td>
						<td>
							<div class='control'>
								<input v-for='artist in song.artists' track-by='$index' class='input' type='text' v-model='artist'>
							</div>
						</td>
						<td>
							<div class='control'>
								<input v-for='genre in song.genres' track-by='$index' class='input' type='text' v-model='genre'>
							</div>
						</td>
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
				<h5 class='has-text-centered'>Thumbnail Preview</h5>
				<img class='thumbnail-preview' :src='editing.song.thumbnail'>
				<label class='label'>Thumbnail URL</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.thumbnail'>
				</p>
				<h5 class='has-text-centered'>Edit Info</h5>
				<label class='label'>Song ID</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song._id'>
				</p>
				<label class='label'>Song Title</label>
				<p class='control'>
					<input class='input' type='text' v-model='editing.song.title'>
				</p>
				<label class='label'>Artists</label>
				<div class='control'>
					<input v-for='artist in editing.song.artists' track-by='$index' class='input' type='text' v-model='artist'>
				</div>
				<label class='label'>Genres</label>
				<div class='control'>
					<input v-for='genre in editing.song.genres' track-by='$index' class='input' type='text' v-model='genre'>
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
				<i class='material-icons save-changes' @click=''>save</i>
				<button class='delete' @click='toggleModal()'></button>
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
			toggleModal: function () {
				this.isEditActive = !this.isEditActive;
				this.pauseVideo();
			},
			edit: function (song, index) {
				this.editing = { index, song };
				this.video.player.loadVideoById(song._id);
				this.isEditActive = true;
			},
			add: function (song) {
				this.socket.emit('queueSongs.remove', song._id);
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
				playerVars: { controls: 1, iv_load_policy: 3, rel: 0, showinfo: 0 },
				events: {
					'onStateChange': event => {
						if (event.data == 1) {
							let youtubeDuration = _this.video.player.getDuration();
							youtubeDuration -= _this.editing.song.skipDuration;
							if (_this.editing.song.duration > youtubeDuration) this.stopVideo();
						}
					}
				}
			});
		}
	}
</script>

<style lang='scss' scoped>
	body {
		font-family: 'Roboto', sans-serif;
	}

	.thumbnail-preview {
		display: flex;
		margin: 0 auto;
		padding: 10px 0 20px 0;
	}

	.modal-card-body, .modal-card-foot {
		border-top: 0;
		background-color: rgb(66, 165, 245);
	}

	.label, h5 {
		color: #fff;
		font-weight: normal;
	}

	.video-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px;
	}

	.save-changes {
		color: #fff;
		margin-right: 5px;
		cursor: pointer;
	}
</style>
