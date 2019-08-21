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
										!station.partyMode
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
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";
import io from "../../io";

export default {
	data() {
		return {
			playlists: []
		};
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.station
		}),
		...mapState({
			station: state => state.station.station
		})
	},
	methods: {
		edit(id) {
			this.editPlaylist(id);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		selectPlaylist(id) {
			this.socket.emit(
				"stations.selectPrivatePlaylist",
				this.station._id,
				id,
				res => {
					if (res.status === "failure")
						return Toast.methods.addToast(res.message, 8000);
					return Toast.methods.addToast(res.message, 4000);
				}
			);
		},
		isNotSelected(id) {
			// TODO Also change this once it changes for a station
			if (this.station && this.station.privatePlaylist === id)
				return false;
			return true;
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	},
	mounted() {
		// TODO: Update when playlist is removed/created
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") this.playlists = res.data;
			});
			this.socket.on("event:playlist.create", playlist => {
				this.playlists.push(playlist);
			});
			this.socket.on("event:playlist.delete", playlistId => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === playlistId) {
						this.playlists.splice(index, 1);
					}
				});
			});
			this.socket.on("event:playlist.addSong", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].songs.push(data.song);
					}
				});
			});
			this.socket.on("event:playlist.removeSong", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].songs.forEach((song, index2) => {
							if (song._id === data.songId) {
								this.playlists[index].songs.splice(index2, 1);
							}
						});
					}
				});
			});
			this.socket.on("event:playlist.updateDisplayName", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].displayName = data.displayName;
					}
				});
			});
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.sidebar {
	position: fixed;
	z-index: 1;
	top: 0;
	right: 0;
	width: 300px;
	height: 100vh;
	background-color: $white;
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
	top: 60px;
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
	color: $white;
	font-weight: 600;
}

.create-playlist {
	width: 100%;
	margin-top: 20px;
	height: 40px;
	border-radius: 0;
	background: rgba(3, 169, 244, 1);
	color: $white !important;
	border: 0;

	&:active,
	&:focus {
		border: 0;
	}
}

.create-playlist:focus {
	background: $primary-color;
}

.none-found {
	text-align: center;
}
</style>
