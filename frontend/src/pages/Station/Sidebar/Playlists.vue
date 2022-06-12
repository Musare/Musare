<template>
	<div id="my-playlists">
		<div class="menu-list scrollable-list" v-if="playlists.length > 0">
			<draggable
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
								v-if="isBlacklisted(element._id)"
								class="material-icons stop-icon"
								content="This playlist is blacklisted in this station"
								v-tippy="{ theme: 'info' }"
								>play_disabled</i
							>
							<i
								v-if="
									station.type === 'community' &&
									isOwnerOrAdmin() &&
									!isSelected(element._id) &&
									!isBlacklisted(element._id)
								"
								@click="selectPlaylist(element)"
								class="material-icons play-icon"
								content="Request songs from this playlist"
								v-tippy
								>play_arrow</i
							>
							<quick-confirm
								v-if="
									station.type === 'community' &&
									isOwnerOrAdmin() &&
									isSelected(element._id)
								"
								@confirm="deselectPlaylist(element._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Stop requesting songs from this playlist"
									v-tippy
									>stop</i
								>
							</quick-confirm>
							<quick-confirm
								v-if="
									station.type === 'community' &&
									isOwnerOrAdmin() &&
									!isBlacklisted(element._id)
								"
								@confirm="blacklistPlaylist(element._id)"
							>
								<i
									class="material-icons stop-icon"
									content="Blacklist Playlist"
									v-tippy
									>block</i
								>
							</quick-confirm>
							<i
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: element._id }
									})
								"
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
		<button
			class="button create-playlist tab-actionable-button"
			@click="openModal('createPlaylist')"
		>
			<i class="material-icons icon-with-button">create</i>
			<span> Create Playlist </span>
		</button>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";
import ws from "@/ws";

import PlaylistItem from "@/components/PlaylistItem.vue";
import SortablePlaylists from "@/mixins/SortablePlaylists.vue";

export default {
	components: { PlaylistItem },
	mixins: [SortablePlaylists],
	computed: {
		currentPlaylists() {
			if (this.station.type === "community") return this.autoRequest;

			return this.autofill;
		},
		...mapState({
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId,
			loggedIn: state => state.user.auth.loggedIn
		}),
		...mapState("station", {
			autoRequest: state => state.autoRequest,
			autofill: state => state.autofill,
			blacklist: state => state.blacklist,
			songsList: state => state.songsList
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on("event:station.autofillPlaylist", res => {
			const { playlist } = res.data;
			const playlistIndex = this.autofill
				.map(autofillPlaylist => autofillPlaylist._id)
				.indexOf(playlist._id);
			if (playlistIndex === -1) this.autofill.push(playlist);
		});

		this.socket.on("event:station.blacklistedPlaylist", res => {
			const { playlist } = res.data;
			const playlistIndex = this.blacklist
				.map(blacklistedPlaylist => blacklistedPlaylist._id)
				.indexOf(playlist._id);
			if (playlistIndex === -1) this.blacklist.push(playlist);
		});

		this.socket.on("event:station.removedAutofillPlaylist", res => {
			const { playlistId } = res.data;
			const playlistIndex = this.autofill
				.map(playlist => playlist._id)
				.indexOf(playlistId);
			if (playlistIndex >= 0) this.autofill.splice(playlistIndex, 1);
		});

		this.socket.on("event:station.removedBlacklistedPlaylist", res => {
			const { playlistId } = res.data;
			const playlistIndex = this.blacklist
				.map(playlist => playlist._id)
				.indexOf(playlistId);
			if (playlistIndex >= 0) this.blacklist.splice(playlistIndex, 1);
		});
	},
	methods: {
		init() {
			/** Get playlists for user */
			this.socket.dispatch("playlists.indexMyPlaylists", res => {
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
		selectPlaylist(playlist) {
			if (this.station.type === "community") {
				if (!this.isSelected(playlist.id)) {
					this.autoRequest.push(playlist);
					new Toast(
						"Successfully selected playlist to auto request songs."
					);
				} else {
					new Toast("Error: Playlist already selected.");
				}
			} else {
				this.socket.dispatch(
					"stations.autofillPlaylist",
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
				if (this.station.type === "community") {
					let selected = false;
					this.currentPlaylists.forEach((playlist, index) => {
						if (playlist._id === id) {
							selected = true;
							this.autoRequest.splice(index, 1);
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
						"stations.removeAutofillPlaylist",
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
		isBlacklisted(id) {
			let selected = false;
			this.blacklist.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		async blacklistPlaylist(id) {
			if (this.isSelected(id)) await this.deselectPlaylist(id);

			this.socket.dispatch(
				"stations.blacklistPlaylist",
				this.station._id,
				id,
				res => {
					new Toast(res.message);
				}
			);
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["setPlaylists"])
	}
};
</script>

<style lang="less" scoped>
#my-playlists {
	background-color: var(--white);
	margin-bottom: 20px;
	border-radius: 0 0 @border-radius @border-radius;
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
	border-radius: @border-radius;
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
