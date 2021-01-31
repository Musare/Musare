<template>
	<div id="my-playlists">
		<draggable
			class="menu-list scrollable-list"
			v-if="playlists.length > 0"
			v-model="playlists"
			v-bind="dragOptions"
			@start="drag = true"
			@end="drag = false"
		>
			<transition-group
				type="transition"
				:name="!drag ? 'draggable-list-transition' : null"
			>
				<playlist-item
					:playlist="playlist"
					v-for="(playlist, index) in playlists"
					:key="'key-' + index"
				>
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
							v-if="
								station.type === 'community' &&
									!isNotSelected(playlist._id) &&
									!station.partyMode
							"
							class="button is-danger"
							@click="deselectPlaylist()"
						>
							<i class="material-icons">stop</i>
						</button>
						<button
							class="button is-primary"
							@click="edit(playlist._id)"
						>
							<i class="material-icons">edit</i>
						</button>
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
			>Create Playlist</a
		>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";
import draggable from "vuedraggable";

import PlaylistItem from "../../../../components/ui/PlaylistItem.vue";
import io from "../../../../io";

export default {
	components: { PlaylistItem, draggable },
	data() {
		return {
			orderOfPlaylists: [],
			interval: null,
			playlists: [],
			drag: false
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals.station
		}),
		...mapState({
			station: state => state.station.station,
			userId: state => state.user.auth.userId
		}),
		dragOptions() {
			return {
				animation: 200,
				group: "description",
				disabled: false,
				ghostClass: "draggable-list-ghost"
			};
		}
	},
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

			// checks if playlist order has changed every 1/2 second
			this.interval = setInterval(() => this.savePlaylistOrder(), 500);
		});
	},
	beforeDestroy() {
		clearInterval(this.interval);
		this.savePlaylistOrder();
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
		calculatePlaylistOrder() {
			const calculatedOrder = [];
			this.playlists.forEach(playlist =>
				calculatedOrder.push(playlist._id)
			);

			return calculatedOrder;
		},
		savePlaylistOrder() {
			const recalculatedOrder = this.calculatePlaylistOrder();
			if (
				JSON.stringify(this.orderOfPlaylists) ===
				JSON.stringify(recalculatedOrder)
			)
				return; // nothing has changed

			this.socket.emit(
				"users.updateOrderOfPlaylists",
				recalculatedOrder,
				res => {
					if (res.status === "failure")
						return new Toast({
							content: res.message,
							timeout: 8000
						});

					this.orderOfPlaylists = this.calculatePlaylistOrder(); // new order in regards to the database
					return new Toast({ content: res.message, timeout: 4000 });
				}
			);
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

	.nothing-here-text {
		margin-bottom: 10px;
	}

	.icons-group {
		display: flex;
		align-items: center;

		button {
			background-color: var(--station-theme) !important;
			&:not(:first-of-type) {
				margin-left: 5px;
			}
			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
	}
}

.night-mode {
	#my-playlists {
		background-color: $night-mode-bg-secondary !important;
		border: 0 !important;
	}
}

.menu-list .playlist {
	align-items: center;
	cursor: move;

	&:not(:last-of-type) {
		margin-bottom: 10px;
	}
}

.create-playlist {
	width: 100%;
	height: 40px;
	border-radius: 5px;
	background-color: var(--station-theme);
	color: $white !important;
	border: 0;

	&:active,
	&:focus {
		border: 0;
	}

	&:hover,
	&:focus {
		filter: brightness(90%);
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
