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
									isNotSelected(playlist._id)
							"
							@click="selectPlaylist(playlist._id)"
							class="material-icons play-icon"
							:content="
								station.partyMode
									? 'Request songs from this playlist'
									: 'Play songs from this playlist'
							"
							v-tippy
							>play_arrow</i
						>
						<i
							v-if="
								station.type === 'community' &&
									!isNotSelected(playlist._id)
							"
							@click="deselectPlaylist(playlist._id)"
							class="material-icons stop-icon"
							:content="
								station.partyMode
									? 'Stop requesting songs from this playlist'
									: 'Stop playing songs from this playlist'
							"
							v-tippy
							>stop</i
						>
						<i
							@click="edit(playlist._id)"
							class="material-icons edit-icon"
							content="Edit Playlist"
							v-tippy
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
			<span class="optional-desktop-only-text"> Create Playlist </span>
		</a>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";
import draggable from "vuedraggable";

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
	computed: {
		...mapState({
			station: state => state.station.station,
			privatePlaylistQueueSelected: state =>
				state.station.privatePlaylistQueueSelected
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		/** Get playlists for user */
		this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
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
	},
	methods: {
		edit(id) {
			this.editPlaylist(id);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		selectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				if (this.isNotSelected(id)) {
					this.updatePrivatePlaylistQueueSelected(id);
					this.$parent.$parent.addFirstPrivatePlaylistSongToQueue();
					new Toast({
						content:
							"Successfully selected playlist to auto request songs.",
						timeout: 4000
					});
				} else {
					new Toast({
						content: "Error: Playlist already selected.",
						timeout: 4000
					});
				}
			} else {
				this.socket.dispatch(
					"stations.selectPrivatePlaylist",
					this.station._id,
					id,
					res => {
						if (res.status === "failure") {
							new Toast({
								content: res.message,
								timeout: 8000
							});
						} else {
							this.station.includedPlaylists.push(id);
							new Toast({
								content: res.message,
								timeout: 4000
							});
						}
					}
				);
			}
		},
		deselectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				this.updatePrivatePlaylistQueueSelected(null);
				new Toast({
					content: "Successfully deselected playlist.",
					timeout: 4000
				});
			} else {
				this.socket.dispatch(
					"stations.deselectPrivatePlaylist",
					this.station._id,
					id,
					res => {
						if (res.status === "failure")
							new Toast({
								content: res.message,
								timeout: 8000
							});
						this.station.includedPlaylists.splice(
							this.station.includedPlaylists.indexOf(id),
							1
						);
						new Toast({
							content: res.message,
							timeout: 4000
						});
					}
				);
			}
		},
		isNotSelected(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				return this.privatePlaylistQueueSelected !== id;
			}
			// TODO Also change this once it changes for a station
			if (
				this.station &&
				this.station.includedPlaylists.indexOf(id) !== -1
			)
				return false;
			return true;
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
#my-playlists {
	background-color: var(--white);
	margin-bottom: 20px;
	border-radius: 0 0 5px 5px;
	max-height: 100%;
}

.night-mode {
	#my-playlists {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}

	.draggable-list-ghost {
		filter: brightness(95%);
	}
}

.nothing-here-text {
	margin-bottom: 10px;
}

.icons-group {
	display: flex;
	align-items: center;

	.edit-icon {
		color: var(--primary-color);
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

.draggable-list-ghost {
	opacity: 0.5;
	filter: brightness(95%);
}
</style>
