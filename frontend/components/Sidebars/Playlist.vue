<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.playlist'>
		<div class='inner-wrapper'>
			<div class='title'>Playlists</div>

			<aside class='menu' v-if='playlists.length > 0'>
				<ul class='menu-list'>
					<li v-for='playlist in playlists'>
						<a href='#'>{{ playlist.displayName }}</a>
						<!--Will play playlist in community station Kris-->
						<div class='icons-group'>
							<a href='#' @click='selectPlaylist(playlist._id)' v-if="isNotSelected(playlist._id)">
								<i class='material-icons'>play_arrow</i>
							</a>
							<a href='#' @click='editPlaylist(playlist._id)'>
								<i class='material-icons'>edit</i>
							</a>
						</div>
					</li>
				</ul>
			</aside>

			<div class='none-found' v-else>No Playlists found</div>

			<a class='button create-playlist' @click='$parent.toggleModal("createPlaylist")'>Create Playlist</a>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import { Edit } from '../Modals/Playlists/Edit.vue';

	export default {
		data() {
			return {
				playlists: []
			}
		},
		methods: {
			editPlaylist: function(id) {
				this.$parent.editPlaylist(id);
			},
			selectPlaylist: function(id) {
				this.socket.emit('stations.selectPrivatePlaylist', this.$parent.stationId, id, (res) => {
					if (res.status === 'failure') return Toast.methods.addToast(res.message, 8000);
					Toast.methods.addToast(res.message, 4000);
				});
			},
			isNotSelected: function(id) {
				let _this = this;
				console.log(_this.$parent.station);
				//TODO Also change this once it changes for a station
				if (_this.$parent.station && _this.$parent.station.privatePlaylist === id) return false;
				return true;
			}
		},
		ready: function () {
			// TODO: Update when playlist is removed/created
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					_this.socket.emit('playlists.indexForUser', res => {
						if (res.status == 'success') _this.playlists = res.data;
					});
					_this.socket.on('event:playlist.create', (playlist) => {
						_this.playlists.push(playlist);
					});
					_this.socket.on('event:playlist.delete', (playlistId) => {
						_this.playlists.forEach((playlist, index) => {
							if (playlist._id === playlistId) {
								_this.playlists.splice(index, 1);
							}
						});
					});
					_this.socket.on('event:playlist.addSong', (data) => {
						_this.playlists.forEach((playlist, index) => {
							if (playlist._id === data.playlistId) {
								_this.playlists[index].songs.push(data.song);
							}
						});
					});
					_this.socket.on('event:playlist.removeSong', (data) => {
						_this.playlists.forEach((playlist, index) => {
							if (playlist._id === data.playlistId) {
								_this.playlists[index].songs.forEach((song, index2) => {
									if (song._id === data.songId) {
										_this.playlists[index].songs.splice(index2, 1);
									}
								});
							}
						});
					});
					_this.socket.on('event:playlist.updateDisplayName', (data) => {
						_this.playlists.forEach((playlist, index) => {
							if (playlist._id === data.playlistId) {
								_this.playlists[index].displayName = data.displayName;
							}
						});
					});
					clearInterval(socketInterval);
				}
			}, 100);
		}
	}
</script>

<style type='scss' scoped>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		background-color: #fff;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.inner-wrapper {	
		top: 50px;
		position: relative;
	}

	.slide-transition {
		transition: transform 0.6s ease-in-out;
		transform: translateX(0);
	}

	.slide-enter, .slide-leave { transform: translateX(100%); }

	.title {
		background-color: rgb(3, 169, 244);
		text-align: center;
		padding: 10px;
		color: white;
		font-weight: 600;
	}

	.create-playlist {
		width: 100%;
    	margin-top: 20px;
		height: 40px;
		border-radius: 0;
		background: rgb(3, 169, 244);
    	color: #fff !important;
		border: 0;

		&:active, &:focus { border: 0; }
	}

	.menu { padding: 0 20px; }

	.menu-list li a:hover { color: #000 !important; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	.icons-group { display: flex; }

	.none-found { text-align: center; }
</style>