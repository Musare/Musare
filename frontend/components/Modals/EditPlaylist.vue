<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Editing: {{ playlist.displayName }}</p>
				<button class='delete' @click='$parent.toggleModal("editPlaylist")'></button>
			</header>
			<section class='modal-card-body'>
				<aside class='menu'>
					<ul class='menu-list'>
						<li v-for='song in playlist.songs'>
							<a :href='' target='_blank'>{{ song.title }}</a>
							<div class='controls'>
								<a href='#' @click=''><i class='material-icons'>keyboard_arrow_down</i></a>
								<a href='#' @click=''><i class='material-icons'>keyboard_arrow_up</i></a>
								<a href='#' @click='removeSongFromPlaylist(song._id)'><i class='material-icons'>delete</i></a>
							</div>
						</li>
					</ul>
				</aside>
				<br />
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Search for Song to add' v-model='songQuery'>
					</p>
					<p class='control'>
						<a class='button is-info' @click='searchForSongs()'>Search</a>
					</p>
				</div>
				<table class='table' v-if='songQueryResults.length > 0'>
					<tbody>
						<tr v-for='result in songQueryResults'>
							<td>
								<img :src='result.thumbnail' />
							</td>
							<td>{{ result.title }}</td>
							<td>
								<a class='button is-success' @click='addSongToPlaylist(result.id)'>
									Add
								</a>
							</td>
						</tr>
					</tbody>
				</table>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='YouTube Playlist URL'>
					</p>
					<p class='control'>
						<a class='button is-info' @click='submitQuery()'>Import</a>
					</p>
				</div>
				<h5>Edit playlist details:</h5>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Playlist Display Name' v-model='playlist.displayName'>
					</p>
					<p class='control'>
						<a class='button is-info' @click='renamePlaylist()'>Rename</a>
					</p>
				</div>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-danger' @click=''>Delete Playlist</a>
			</footer>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				playlist: {},
				songQuery: '',
				songQueryResults: []
			}
		},
		methods: {
			searchForSongs: function () {
				let _this = this;
				_this.socket.emit('apis.searchYoutube', _this.querySearch, res => {
					if (res.status == 'success') {
						_this.songQueryResults = [];
						for (let i = 0; i < res.data.items.length; i++) {
							_this.songQueryResults.push({
								id: res.data.items[i].id.videoId,
								url: `https://www.youtube.com/watch?v=${this.id}`,
								title: res.data.items[i].snippet.title,
								thumbnail: res.data.items[i].snippet.thumbnails.default.url
							});
						}
					} else if (res.status == 'error') Toast.methods.addToast(res.message, 3000);
				});
			},
			addSongToPlaylist: function (id) {},
			removeSongFromPlaylist: function (id) {},
			renamePlaylist: function () {
				_this.socket.emit('playlists.updateDisplayName', _this.playlist._id, _this.playlist.displayName, res => {
					if (res.status == 'success') Toast.methods.addToast(res.message, 3000);
				});
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					_this.socket.emit('playlists.getPlaylist', _this.$parent.playlistBeingEdited, res => {
						if (res.status == 'success') _this.playlist = res.data;
					});
					clearInterval(socketInterval);
				}
			}, 100);
		}
	}
</script>

<style type='scss' scoped>
	.menu { padding: 0 20px; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	.menu-list a:hover { color: #000 !important; }

	li a {
		display: flex;
    	align-items: center;
	}

	.controls {
		display: flex;

		a {
			display: flex;
    		align-items: center;
		}
	}

	.table {
		margin-bottom: 0;
	}

	h5 { padding: 20px 0; }
</style>