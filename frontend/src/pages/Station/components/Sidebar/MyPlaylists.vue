<template>
	<div id="my-playlists">
		<aside v-if="playlists.length > 0" class="menu">
			<ul class="menu-list">
				<li v-for="(playlist, index) in playlists" :key="index">
					<playlist-item :playlist="playlist">
						<div class="icons-group" slot="actions">
							<button
								v-if="
									station.type === 'community' &&
										isNotSelected(playlist._id) &&
										!station.partyMode
								"
								class="button is-primary"
								@click="selectPlaylist(playlist._id)"
							>
								<i class="material-icons">play_arrow</i>
							</button>
							<button
								class="button is-primary"
								@click="edit(playlist._id)"
							>
								<i class="material-icons">edit</i>
							</button>
						</div>
					</playlist-item>
				</li>
			</ul>
		</aside>

		<div v-else class="has-text-centered">No Playlists found</div>

		<a
			class="button create-playlist"
			href="#"
			@click="openModal({ sector: 'station', modal: 'createPlaylist' })"
			>Create Playlist</a
		>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";
import PlaylistItem from "../../../../components/ui/PlaylistItem.vue";
import io from "../../../../io";

export default {
	components: { PlaylistItem },
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
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			/** Get playlists for user */
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
						return new Toast({
							content: res.message,
							timeout: 8000
						});
					return new Toast({ content: res.message, timeout: 4000 });
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
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../styles/global.scss";

#my-playlists {
	background-color: #fff;
	border: 1px solid $light-grey-2;
	margin-bottom: 20px;
	padding: 10px;
	border-radius: 0 0 5px 5px;

	.icons-group {
		display: flex;
		align-items: center;

		button:not(:first-of-type) {
			margin-left: 5px;
		}
	}
}

.night-mode {
	#my-playlists {
		background-color: #222 !important;
		border: 0 !important;
	}
}

.menu-list li {
	align-items: center;
}

.create-playlist {
	width: 100%;
	height: 40px;
	border-radius: 5px;
	background-color: rgba(3, 169, 244, 1);
	color: $white !important;
	border: 0;
	&:active,
	&:focus {
		border: 0;
	}

	&:focus {
		background-color: $primary-color;
	}
}
</style>
