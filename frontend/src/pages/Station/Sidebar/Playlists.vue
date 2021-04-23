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
									(userId === station.owner ||
										role === 'admin' ||
										station.partyMode) &&
									!isSelected(playlist._id)
							"
							@click="selectPlaylist(playlist)"
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
									(userId === station.owner ||
										role === 'admin' ||
										station.partyMode) &&
									isSelected(playlist._id)
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
			@click="openModal('createPlaylist')"
		>
			<i class="material-icons icon-with-button">create</i>
			<span class="optional-desktop-only-text"> Create Playlist </span>
		</a>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";

import PlaylistItem from "@/components/PlaylistItem.vue";
import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: { PlaylistItem },
	mixins: [SortablePlaylists],
	computed: {
		currentPlaylists() {
			if (this.station.type === "community" && this.station.partyMode)
				return this.partyPlaylists;

			return this.includedPlaylists;
		},
		...mapState({
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId
		}),
		...mapState("station", {
			partyPlaylists: state => state.partyPlaylists,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists,
			songsList: state => state.songsList
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		/** Get playlists for user */
		this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
			if (res.status === "success") this.setPlaylists(res.data.playlists);
			this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
		});
	},
	methods: {
		edit(id) {
			this.editPlaylist(id);
			this.openModal("editPlaylist");
		},
		selectPlaylist(playlist) {
			if (this.station.type === "community" && this.station.partyMode) {
				if (!this.isSelected(playlist.id)) {
					this.partyPlaylists.push(playlist);
					this.addPartyPlaylistSongToQueue();
					new Toast(
						"Successfully selected playlist to auto request songs."
					);
				} else {
					new Toast("Error: Playlist already selected.");
				}
			} else {
				this.socket.dispatch(
					"stations.includePlaylist",
					this.station._id,
					playlist._id,
					res => {
						new Toast(res.message);
					}
				);
			}
		},
		deselectPlaylist(id) {
			if (this.station.type === "community" && this.station.partyMode) {
				let selected = false;
				this.currentPlaylists.forEach((playlist, index) => {
					if (playlist._id === id) {
						selected = true;
						this.partyPlaylists.splice(index, 1);
					}
				});
				if (selected) {
					new Toast("Successfully deselected playlist.");
				} else {
					new Toast("Playlist not selected.");
				}
			} else {
				this.socket.dispatch(
					"stations.removeIncludedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
					}
				);
			}
		},
		isSelected(id) {
			// TODO Also change this once it changes for a station
			let selected = false;
			this.currentPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		addPartyPlaylistSongToQueue() {
			let isInQueue = false;
			if (
				this.station.type === "community" &&
				this.station.partyMode === true
			) {
				this.songsList.forEach(queueSong => {
					if (queueSong.requestedBy === this.userId) isInQueue = true;
				});
				if (!isInQueue && this.partyPlaylists) {
					const selectedPlaylist = this.partyPlaylists[
						Math.floor(Math.random() * this.partyPlaylists.length)
					];
					if (
						selectedPlaylist._id &&
						selectedPlaylist.songs.length > 0
					) {
						const selectedSong =
							selectedPlaylist.songs[
								Math.floor(
									Math.random() *
										selectedPlaylist.songs.length
								)
							];
						if (selectedSong.youtubeId) {
							this.socket.dispatch(
								"stations.addToQueue",
								this.station._id,
								selectedSong.youtubeId,
								data => {
									if (data.status !== "success")
										new Toast("Error auto queueing song");
								}
							);
						}
					}
				}
			}
		},
		...mapActions("station", ["updatePartyPlaylists"]),
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
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
