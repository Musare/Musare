<template>
	<div class="station-playlists">
		<div class="tabs-container">
			<div class="tab-selection">
				<button
					class="button is-default"
					:class="{ selected: tab === 'current' }"
					@click="showTab('current')"
				>
					Current
				</button>
				<button
					class="button is-default"
					:class="{ selected: tab === 'search' }"
					@click="showTab('search')"
				>
					Search
				</button>
				<button
					v-if="station.type === 'community'"
					class="button is-default"
					:class="{ selected: tab === 'my-playlists' }"
					@click="showTab('my-playlists')"
				>
					My Playlists
				</button>
			</div>
			<div class="tab" v-show="tab === 'current'">
				<!-- <div v-if="station.includedPlaylists.length > 0">
					<playlist-item
						:playlist="playlist"
						v-for="(playlist, index) in station.includedPlaylists"
						:key="'key-' + index"
					>
						<div class="icons-group" slot="actions">
							<i
								class="material-icons stop-icon"
								content="Stop playing songs from this playlist
							"
								v-tippy
								>stop</i
							>
							<i
								v-if="playlist.createdBy === myUserId"
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-else
								@click="showPlaylist(playlist._id)"
								class="material-icons edit-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</div>
					</playlist-item>
				</div> -->
				<p class="nothing-here-text scrollable-list">
					No playlists currently selected.
				</p>
			</div>
			<div class="tab" v-show="tab === 'search'">
				Searching genre and public user playlists has yet to be added.
			</div>
			<div
				v-if="station.type === 'community'"
				class="tab"
				v-show="tab === 'my-playlists'"
			>
				<button
					class="button is-primary"
					id="create-new-playlist-button"
					@click="
						openModal({
							sector: 'station',
							modal: 'createPlaylist'
						})
					"
				>
					Create new playlist
				</button>
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
							class="item-draggable"
							v-for="playlist in playlists"
							:key="playlist._id"
							:playlist="playlist"
						>
							<div slot="actions">
								<i
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
									@click="showPlaylist(playlist._id)"
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
					You don't have any playlists!
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";

// import Toast from "toasters";
import draggable from "vuedraggable";
import PlaylistItem from "@/components/PlaylistItem.vue";

import TabQueryHandler from "@/mixins/TabQueryHandler.vue";
import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: {
		draggable,
		PlaylistItem
		// CreatePlaylist: () => import("@/components/modals/CreatePlaylist.vue")
	},
	mixins: [TabQueryHandler, SortablePlaylists],
	data() {
		return {
			tab: "current"
		};
	},
	computed: {
		playlists: {
			get() {
				return this.$store.state.user.playlists.playlists;
			},
			set(playlists) {
				this.$store.commit("user/playlists/setPlaylists", playlists);
			}
		},
		...mapState({
			role: state => state.user.auth.role,
			myUserId: state => state.user.auth.userId,
			userId: state => state.user.auth.userId
		}),
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
			if (res.status === "success") this.playlists = res.data.playlists;
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
						if (song.youtubeId === data.youtubeId) {
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

		this.socket.dispatch(
			`stations.getStationIncludedPlaylistsById`,
			this.station._id,
			res => {
				if (res.status === "success") {
					this.station.includedPlaylists = res.data.playlists;
					this.originalStation.includedPlaylists = res.data.playlists;
				}
			}
		);

		this.socket.dispatch(
			`stations.getStationExcludedPlaylistsById`,
			this.station._id,
			res => {
				if (res.status === "success") {
					this.station.excludedPlaylists = res.data.playlists;
					this.originalStation.excludedPlaylists = res.data.playlists;
				}
			}
		);
	},
	methods: {
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		...mapActions("station", ["updatePrivatePlaylistQueueSelected"]),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
	}
};
</script>

<style lang="scss" scoped>
.station-playlists {
	.tabs-container {
		.tab-selection {
			display: flex;
			.button {
				border-radius: 0;
				border: 0;
				text-transform: uppercase;
				font-size: 14px;
				color: var(--dark-grey-3);
				background-color: var(--light-grey-2);
				flex-grow: 1;
				height: 32px;

				&:not(:first-of-type) {
					margin-left: 5px;
				}
			}

			.selected {
				background-color: var(--dark-grey-3) !important;
				color: var(--white) !important;
			}
		}
		.tab {
			padding: 15px 0;
			border-radius: 0;
			.playlist-item:not(:last-of-type),
			.item.item-draggable:not(:last-of-type) {
				margin-bottom: 10px;
			}
		}
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
