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
						<button class='button is-danger' @click='remove(song._id, index)'>Remove</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
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
				songs: [],
				searchQuery: '',
				modals: { editSong: false },
				editing: {
					index: 0,
					song: {}
				},
				video: {
					player: null,
					paused: false,
					playerReady: false
				}
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
			edit: function (song, index) {
				this.$broadcast('editSong', song, index, 'songs');
			},
			remove: function (id) {
				this.socket.emit('songs.remove', id, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 4000);
					else Toast.methods.addToast(res.message, 8000);
				});
			},
			getSet: function () {
				let _this = this;
				_this.socket.emit('songs.getSet', _this.position, data => {
					data.forEach(song => {
						_this.songs.push(song);
					});
					_this.position = _this.position + 1;
					if (_this.maxPosition > _this.position - 1) _this.getSet();
				});
			},
			init: function () {
				let _this = this;
				_this.socket.emit('songs.length', length => {
					_this.maxPosition = Math.round(length / 15);
					_this.getSet();
				});
				_this.socket.emit('apis.joinAdminRoom', 'songs', () => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				if (_this.socket.connected) {
					_this.init();
					_this.socket.on('event:admin.song.added', song => {
						_this.songs.push(song);
					});
					_this.socket.on('event:admin.song.removed', songId => {
						_this.songs = _this.songs.filter(function(song) {
							return song._id !== songId;
						});
					});
					_this.socket.on('event:admin.song.updated', updatedSong => {
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
	body { font-family: 'Roboto', sans-serif; }

	.song-thumbnail {
		display: block;
		max-width: 50px;
		margin: 0 auto;
	}

	td { vertical-align: middle; }

	.is-primary:focus { background-color: #029ce3 !important; }
</style>
