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
				<h5 class='has-text-centered'><strong>Thumbnail Preview</strong></h5>
				<img class='thumbnail-preview' :src='beingEdited.song.thumbnail'>
				<label class='label'>Thumbnail URL</label>
				<p class='control'>
					<input class='input' type='text' v-model='beingEdited.song.thumbnail'>
				</p>
				<h5 class='has-text-centered'><strong>Edit Info</strong></h5>
				<!--<label class='label'>Email</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Email...' v-model='$parent.register.email'>
				</p>-->
				<label class='label'>Song ID</label>
				<p class='control'>
					<input class='input' type='text' v-model='beingEdited.song._id'>
				</p>
				<label class='label'>Song Title</label>
				<p class='control'>
					<input class='input' type='text' v-model='beingEdited.song.title'>
				</p>
				<label class='label'>Artists</label>
				<div class='control'>
					<input v-for='artist in beingEdited.song.artists' track-by='$index' class='input' type='text' v-model='artist'>
				</div>
				<label class='label'>Genres</label>
				<div class='control'>
					<input v-for='genre in beingEdited.song.genres' track-by='$index' class='input' type='text' v-model='genre'>
				</div>
				<label class='label'>Song Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='beingEdited.song.duration'>
				</p>
				<label class='label'>Skip Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='beingEdited.song.skipDuration'>
				</p>
			</section>
			<footer class='modal-card-foot'>
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
				beingEdited: {
					index: 0,
					song: {}
				}
			}
		},
		methods: {
			toggleModal: function () {
				this.isEditActive = !this.isEditActive;
			},
			edit: function (song, index) {
				this.beingEdited = { index, song };
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
		}
	}
</script>

<style lang='scss' scoped>
	.thumbnail-preview {
		display: flex;
		margin: 0 auto;
		padding: 10px 0 20px 0;
	}

	.modal-card-body, .modal-card-foot {
		border-top: 0;
		background-color: rgb(66, 165, 245);
	}

	.label, strong {
		color: #fff;
	}
</style>
