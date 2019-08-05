<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div class="title">
				Playlists
			</div>

			<aside v-if="playlists.length > 0" class="menu">
				<ul class="menu-list">
					<li v-for="(playlist, index) in playlists" :key="index">
						<span>{{ playlist.displayName }}</span>
						<!--Will play playlist in community station Kris-->
						<div class="icons-group">
							<a
								v-if="
									isNotSelected(playlist._id) &&
										!$parent.station.partyMode
								"
								href="#"
								@click="selectPlaylist(playlist._id)"
							>
								<i class="material-icons">play_arrow</i>
							</a>
							<a href="#" v-on:click="edit(playlist._id)">
								<i class="material-icons">edit</i>
							</a>
						</div>
					</li>
				</ul>
			</aside>

			<div v-else class="none-found">
				No Playlists found
			</div>

			<a
				class="button create-playlist"
				href="#"
				@click="
					openModal({ sector: 'station', modal: 'createPlaylist' })
				"
				>Create Playlist</a
			>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";

import { Toast } from "vue-roaster";
import io from "../../io";

export default {
	data() {
		return {
			playlists: []
		};
	},
	methods: {
		edit(id) {
			this.editPlaylist(id);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		selectPlaylist(id) {
			this.socket.emit(
				"stations.selectPrivatePlaylist",
				this.$parent.station._id,
				id,
				res => {
					if (res.status === "failure")
						return Toast.methods.addToast(res.message, 8000);
					return Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		isNotSelected(id) {
			const _this = this;
			// TODO Also change this once it changes for a station
			if (
				_this.$parent.station &&
				_this.$parent.station.privatePlaylist === id
			)
				return false;
			return true;
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	},
	mounted() {
		// TODO: Update when playlist is removed/created
		const _this = this;
		io.getSocket(socket => {
			_this.socket = socket;
			_this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") _this.playlists = res.data;
			});
			_this.socket.on("event:playlist.create", playlist => {
				_this.playlists.push(playlist);
			});
			_this.socket.on("event:playlist.delete", playlistId => {
				_this.playlists.forEach((playlist, index) => {
					if (playlist._id === playlistId) {
						_this.playlists.splice(index, 1);
					}
				});
			});
			_this.socket.on("event:playlist.addSong", data => {
				_this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						_this.playlists[index].songs.push(data.song);
					}
				});
			});
			_this.socket.on("event:playlist.removeSong", data => {
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
			_this.socket.on("event:playlist.updateDisplayName", data => {
				_this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						_this.playlists[index].displayName = data.displayName;
					}
				});
			});
		});
	}
};
</script>

<style lang="scss" scoped>
.sidebar {
	position: fixed;
	z-index: 1;
	top: 0;
	right: 0;
	width: 300px;
	height: 100vh;
	background-color: #fff;
	box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16),
		0 2px 10px 0 rgba(0, 0, 0, 0.12);
}

.icons-group a {
	display: flex;
	align-items: center;
}

.menu-list li {
	align-items: center;
}

.inner-wrapper {
	top: 64px;
	position: relative;
}

.slide-transition {
	transition: transform 0.6s ease-in-out;
	transform: translateX(0);
}

.slide-enter,
.slide-leave {
	transform: translateX(100%);
}

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
	background: rgba(3, 169, 244, 1);
	color: #fff !important;
	border: 0;

	&:active,
	&:focus {
		border: 0;
	}
}

.create-playlist:focus {
	background: #029ce3;
}

.none-found {
	text-align: center;
}
</style>
