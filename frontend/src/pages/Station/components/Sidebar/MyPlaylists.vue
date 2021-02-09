<template>
	<div id="my-playlists">
		<draggable
			class="menu-list scrollable-list"
			v-if="playlists.length > 0"
			v-model="playlists"
			v-bind="dragOptions"
			@start="drag = true"
			@end="drag = false"
			@change="savePlaylistOrder"
		>
			<transition-group
				type="transition"
				:name="!drag ? 'draggable-list-transition' : null"
			>
				<playlist-item
					:playlist="playlist"
					v-for="(playlist, index) in playlists"
					:key="'key-' + index"
					class="item-draggable"
				>
					<div class="icons-group" slot="actions">
						<i
							v-if="
								station.type === 'community' &&
									isNotSelected(playlist._id) &&
									!station.partyMode
							"
							@click="selectPlaylist(playlist._id)"
							class="material-icons play-icon"
							>play_arrow</i
						>
						<i
							v-if="
								station.type === 'community' &&
									!isNotSelected(playlist._id) &&
									!station.partyMode
							"
							@click="deselectPlaylist()"
							class="material-icons stop-icon"
							>stop</i
						>
						<i
							@click="edit(playlist._id)"
							class="material-icons edit-icon"
							>edit</i
						>
					</div>
				</playlist-item>
			</transition-group>
		</draggable>
		<p v-else class="nothing-here-text scrollable-list">
			No Playlists found
		</p>
		<a
			class="button create-playlist tab-actionable-button"
			href="#"
			@click="openModal({ sector: 'station', modal: 'createPlaylist' })"
		>
			<i class="material-icons icon-with-button">create</i>
			<span class="optional-desktop-only-text">
				Create Playlist
			</span>
		</a>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";
import draggable from "vuedraggable";

import io from "../../../../io";
import PlaylistItem from "../../../../components/ui/PlaylistItem.vue";
import SortablePlaylists from "../../../../mixins/SortablePlaylists.vue";

export default {
	components: { PlaylistItem, draggable },
	mixins: [SortablePlaylists],
	data() {
		return {
			playlists: []
		};
	},
	computed: mapState({
		station: state => state.station.station
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			/** Get playlists for user */
			this.socket.emit("playlists.indexMyPlaylists", true, res => {
				if (res.status === "success") this.playlists = res.data;
				this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
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
							if (song.songId === data.songId) {
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

			this.socket.on("event:playlist.updatePrivacy", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlist._id) {
						this.playlists[index].privacy = data.playlist.privacy;
					}
				});
			});

			this.socket.on(
				"event:user.orderOfPlaylists.changed",
				orderOfPlaylists => {
					const sortedPlaylists = [];

					this.playlists.forEach(playlist => {
						sortedPlaylists[
							orderOfPlaylists.indexOf(playlist._id)
						] = playlist;
					});

					this.playlists = sortedPlaylists;
					this.orderOfPlaylists = this.calculatePlaylistOrder();
				}
			);
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
		deselectPlaylist() {
			this.socket.emit(
				"stations.deselectPrivatePlaylist",
				this.station._id,
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
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../styles/global.scss";

#my-playlists {
	background-color: #fff;
	margin-bottom: 20px;
	border-radius: 0 0 5px 5px;
	max-height: 100%;
}

.night-mode {
	#my-playlists {
		background-color: $night-mode-bg-secondary !important;
		border: 0 !important;
	}
}

.nothing-here-text {
	margin-bottom: 10px;
}

.icons-group {
	display: flex;
	align-items: center;

	.edit-icon {
		color: var(--station-theme);
	}
}

.menu-list .playlist-item:not(:last-of-type) {
	margin-bottom: 10px;
}

.create-playlist {
	width: 100%;
	height: 40px;
	border-radius: 5px;
	border: 0;

	&:active,
	&:focus {
		border: 0;
	}
}

.draggable-list-transition-move {
	transition: transform 0.5s;
}

.night-mode {
	.draggable-list-ghost {
		background-color: darken($night-mode-bg-secondary, 5%);
	}
}

.draggable-list-ghost {
	opacity: 0.5;
	background-color: darken(#fff, 5%);
}
</style>
