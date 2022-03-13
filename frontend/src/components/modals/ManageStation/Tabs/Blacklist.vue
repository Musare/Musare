<template>
	<div class="station-blacklist">
		<div class="tabs-container">
			<div class="tab" v-if="isOwnerOrAdmin()">
				<div v-if="blacklist.length > 0">
					<playlist-item
						:playlist="playlist"
						v-for="playlist in blacklist"
						:key="`key-${playlist._id}`"
					>
						<template #item-icon>
							<i
								class="material-icons blacklisted-icon"
								content="This playlist is currently blacklisted"
								v-tippy
							>
								block
							</i>
						</template>

						<template #actions>
							<quick-confirm
								@confirm="
									removeBlacklistedPlaylist(playlist._id)
								"
							>
								<i
									class="material-icons stop-icon"
									content="Stop blacklisting songs from this playlist
							"
									v-tippy
									>stop</i
								>
							</quick-confirm>
							<i
								v-if="playlist.createdBy === userId"
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
						</template>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently blacklisted.
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";
import Toast from "toasters";
import ws from "@/ws";

import QuickConfirm from "@/components/QuickConfirm.vue";
import PlaylistItem from "@/components/PlaylistItem.vue";

export default {
	components: {
		QuickConfirm,
		PlaylistItem
	},
	data() {
		return {};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			role: state => state.user.auth.role,
			userId: state => state.user.auth.userId,
			partyPlaylists: state => state.station.partyPlaylists
		}),
		...mapState("modals/manageStation", {
			originalStation: state => state.originalStation,
			station: state => state.station,
			includedPlaylists: state => state.includedPlaylists,
			blacklist: state => state.blacklist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.socket.dispatch(
				`stations.getStationBlacklistById`,
				this.station._id,
				res => {
					if (res.status === "success") {
						this.station.blacklist = res.data.playlists;
						this.originalStation.blacklist = res.data.playlists;
					}
				}
			);
		},
		isOwner() {
			return (
				this.loggedIn &&
				this.station &&
				this.userId === this.station.owner
			);
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		removeIncludedPlaylist(id) {
			return new Promise(resolve => {
				this.socket.dispatch(
					"stations.removeIncludedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
						resolve();
					}
				);
			});
		},
		removeBlacklistedPlaylist(id) {
			return new Promise(resolve => {
				this.socket.dispatch(
					"stations.removeBlacklistedPlaylist",
					this.station._id,
					id,
					res => {
						new Toast(res.message);
						resolve();
					}
				);
			});
		},
		isIncluded(id) {
			let included = false;
			this.includedPlaylists.forEach(playlist => {
				if (playlist._id === id) included = true;
			});
			return included;
		},
		isBlacklisted(id) {
			let selected = false;
			this.blacklist.forEach(playlist => {
				if (playlist._id === id) selected = true;
			});
			return selected;
		},
		async blacklistPlaylist(id) {
			if (this.isIncluded(id)) await this.removeIncludedPlaylist(id);

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
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="less" scoped>
.blacklisted-icon {
	color: var(--dark-red);
}

.included-icon {
	color: var(--green);
}

.selected-icon {
	color: var(--purple);
}

.station-blacklist {
	.tabs-container {
		.tab {
			padding: 15px 0;
			border-radius: 0;
			.playlist-item:not(:last-of-type),
			.item.item-draggable:not(:last-of-type) {
				margin-bottom: 10px;
			}
			.load-more-button {
				width: 100%;
				margin-top: 10px;
			}
		}
	}
}
</style>
