<template>
	<div id="my-playlists">
		<div class="menu-list scrollable-list" v-if="playlists.length > 0">
			<draggable
				tag="transition-group"
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
				v-model="playlists"
				item-key="_id"
				v-bind="dragOptions"
				@start="drag = true"
				@end="drag = false"
				@change="savePlaylistOrder"
			>
				<template #item="{ element }">
					<playlist-item :playlist="element" class="item-draggable">
						<template #actions>
							<i
								v-if="isExcluded(element._id)"
								class="material-icons stop-icon"
								content="This playlist is blacklisted in this station"
								v-tippy="{ theme: 'info' }"
								>play_disabled</i
							>
							<i
								v-if="
									station.type === 'community' &&
									(isOwnerOrAdmin() || station.partyMode) &&
									!isSelected(element._id) &&
									!isExcluded(element._id)
								"
								@click="selectPlaylist(element)"
								class="material-icons play-icon"
								:content="
									station.partyMode
										? 'Request songs from this playlist'
										: 'Play songs from this playlist'
								"
								v-tippy
								>play_arrow</i
							>
							<confirm
								v-if="
									station.type === 'community' &&
									(isOwnerOrAdmin() || station.partyMode) &&
									isSelected(element._id)
								"
								@confirm="deselectPlaylist(element._id)"
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
							</confirm>
							<confirm
								v-if="
									isOwnerOrAdmin() && !isExcluded(element._id)
								"
								@confirm="blacklistPlaylist(element._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Blacklist Playlist"
									v-tippy
									>block</i
								>
							</confirm>
							<i
								@click="edit(element._id)"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
						</template>
					</playlist-item>
				</template>
			</draggable>
		</div>

		<p v-else class="nothing-here-text scrollable-list">
			No Playlists found
		</p>
		<a
			class="button create-playlist tab-actionable-button"
			href="#"
			@click="openModal('createPlaylist')"
		>
			<i class="material-icons icon-with-button">create</i>
			<span> Create Playlist </span>
		</a>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";
import ws from "@/ws";

import PlaylistItem from "@/components/PlaylistItem.vue";
import SortablePlaylists from "@/mixins/SortablePlaylists.vue";
import Confirm from "@/components/Confirm.vue";

export default {
	components: { PlaylistItem, Confirm },
	mixins: [SortablePlaylists],
	computed: {
		currentPlaylists() {
			if (this.station.type === "community" && this.station.partyMode)
				return this.partyPlaylists;

			return this.includedPlaylists;
		},
		...mapState({
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId,
			loggedIn: state => state.user.auth.loggedIn
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
		ws.onConnect(this.init);

		this.socket.on("event:station.includedPlaylist", res => {
			const { playlist } = res.data;
			const playlistIndex = this.includedPlaylists
				.map(includedPlaylist => includedPlaylist._id)
				.indexOf(playlist._id);
			if (playlistIndex === -1) this.includedPlaylists.push(playlist);
		});

		this.socket.on("event:station.excludedPlaylist", res => {
			const { playlist } = res.data;
			const playlistIndex = this.excludedPlaylists
				.map(excludedPlaylist => excludedPlaylist._id)
				.indexOf(playlist._id);
			if (playlistIndex === -1) this.excludedPlaylists.push(playlist);
		});

		this.socket.on("event:station.removedIncludedPlaylist", res => {
			const { playlistId } = res.data;
			const playlistIndex = this.includedPlaylists
				.map(playlist => playlist._id)
				.indexOf(playlistId);
			if (playlistIndex >= 0)
				this.includedPlaylists.splice(playlistIndex, 1);
		});

		this.socket.on("event:station.removedExcludedPlaylist", res => {
			const { playlistId } = res.data;
			const playlistIndex = this.excludedPlaylists
				.map(playlist => playlist._id)
				.indexOf(playlistId);
			if (playlistIndex >= 0)
				this.excludedPlaylists.splice(playlistIndex, 1);
		});
	},
	methods: {
		init() {
			/** Get playlists for user */
			this.socket.dispatch("playlists.indexMyPlaylists", true, res => {
				if (res.status === "success")
					this.setPlaylists(res.data.playlists);
				this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
			});
		},
		isOwner() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
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
			return new Promise(resolve => {
				if (
					this.station.type === "community" &&
					this.station.partyMode
				) {
					let selected = false;
					this.currentPlaylists.forEach((playlist, index) => {
						if (playlist._id === id) {
							selected = true;
							this.partyPlaylists.splice(index, 1);
						}
					});
					if (selected) {
						new Toast("Successfully deselected playlist.");
						resolve();
					} else {
						new Toast("Playlist not selected.");
						resolve();
					}
				} else {
					this.socket.dispatch(
						"stations.removeIncludedPlaylist",
						this.station._id,
						id,
						res => {
							new Toast(res.message);
							resolve();
						}
					);
				}
			});
		},
		isSelected(id) {
			let selected = false;
			this.currentPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		isExcluded(id) {
			let selected = false;
			this.excludedPlaylists.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		async blacklistPlaylist(id) {
			if (this.isSelected(id)) await this.deselectPlaylist(id);

			this.socket.dispatch(
				"stations.excludePlaylist",
				this.station._id,
				id,
				res => {
					new Toast(res.message);
				}
			);
		},
		addPartyPlaylistSongToQueue() {
			if (
				this.station.type === "community" &&
				this.station.partyMode === true &&
				this.songsList.filter(
					queueSong => queueSong.requestedBy === this.userId
				).length < 3 &&
				this.partyPlaylists
			) {
				const selectedPlaylist =
					this.partyPlaylists[
						Math.floor(Math.random() * this.partyPlaylists.length)
					];
				if (selectedPlaylist._id && selectedPlaylist.songs.length > 0) {
					const selectedSong =
						selectedPlaylist.songs[
							Math.floor(
								Math.random() * selectedPlaylist.songs.length
							)
						];
					if (selectedSong.youtubeId) {
						this.socket.dispatch(
							"stations.addToQueue",
							this.station._id,
							selectedSong.youtubeId,
							data => {
								if (data.status !== "success")
									this.addPartyPlaylistSongToQueue();
							}
						);
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
