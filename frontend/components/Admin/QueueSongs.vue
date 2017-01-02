<template>
	<div class='container'>
		<input type='text' class='input' v-model='searchQuery' placeholder='Search for Songs'>
		<br /><br />
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
				<tr v-for='(index, song) in filteredSongs' track-by='$index'>
					<td>
						<img class='song-thumbnail' :src='song.thumbnail' onerror="this.src='/assets/notes-transparent.png'">
					</td>
					<td>
						<strong>{{ song.title }}</strong>
					</td>
					<td>{{ song._id }}</td>
					<td>{{ song.artists.join(', ') }}</td>
					<td>{{ song.genres.join(', ') }}</td>
					<td>{{ song.requestedBy }}</td>
					<td>
						<button class='button is-primary' @click='edit(song, index)'>Edit</button>
						<button class='button is-success' @click='add(song)'>Add</button>
						<button class='button is-danger' @click='remove(song._id, index)'>Remove</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<nav class="pagination">
		<a class="button" href='#' @click='getSet(position - 1)' v-if='position > 1'><i class="material-icons">navigate_before</i></a>
		<a class="button" href='#' @click='getSet(position + 1)' v-if='maxPosition > position'><i class="material-icons">navigate_next</i></a>
	</nav>
	<edit-song v-show='modals.editSong'></edit-song>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import EditSong from '../Modals/EditSong.vue';
	import io from '../../io';

	export default {
		components: { EditSong },
		data() {
			return {
				position: 1,
				maxPosition: 1,
				searchQuery: '',
				songs: [],
				modals: { editSong: false }
			}
		},
		computed: {
			filteredSongs: function () {
				return this.$eval('songs | filterBy searchQuery');
			}
		},
		methods: {
			toggleModal: function () {
				this.modals.editSong = !this.modals.editSong;
			},
			getSet: function (position) {
				let _this = this;
				this.socket.emit('queueSongs.getSet', position, data => {
					_this.songs = data;
					this.position = position;
				});
			},
			edit: function (song, index) {
				this.$broadcast('editSong', song, index, 'queueSongs');
			},
			add: function (song) {
				this.socket.emit('songs.add', song, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 2000);
				});
			},
			remove: function (id, index) {
				this.socket.emit('queueSongs.remove', id, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 2000);
				});
			},
			init: function() {
				let _this = this;
				_this.socket.emit('queueSongs.index', data => {
					_this.songs = data.songs;
					_this.maxPosition = Math.round(data.maxLength / 50);
				});
				_this.socket.emit('apis.joinAdminRoom', 'queue', data => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				if (_this.socket.connected) {
					_this.init();
					_this.socket.on('event:admin.queueSong.added', queueSong => {
						_this.songs.push(queueSong);
					});
					_this.socket.on('event:admin.queueSong.removed', songId => {
						_this.songs = _this.songs.filter(function(song) {
							return song._id !== songId;
						});
					});
					_this.socket.on('event:admin.queueSong.updated', updatedSong => {
						for (let i = 0; i < _this.songs.length; i++) {
							let song = _this.songs[i];
							if (song._id === updatedSong._id) {
								_this.songs.$set(i, updatedSong);
							}
						}
					});
				}
				io.onConnect(() => {
					_this.init();
				});
			});
		}
	}
</script>

<style lang='scss' scoped>
	.song-thumbnail {
		display: block;
		max-width: 50px;
		margin: 0 auto;
	}

	td { vertical-align: middle; }

	.is-primary:focus { background-color: #029ce3 !important; }
</style>
