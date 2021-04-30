<template>
	<div class="station-blacklist">
		<p class="has-text-centered">
			Blacklist a playlist to prevent all of its songs playing in this
			station.
		</p>
		<div class="tabs-container">
			<!-- <div class="tab-selection">
				<button
					class="button is-default"
					:class="{ selected: tab === 'playlists' }"
					@click="showTab('playlists')"
				>
					Playlists
				</button>
				<button
					class="button is-default"
					:class="{ selected: tab === 'songs' }"
					@click="showTab('songs')"
				>
					Songs
				</button>
			</div> -->
			<div class="tab" v-show="tab === 'playlists'">
				<div v-if="excludedPlaylists.length > 0">
					<playlist-item
						:playlist="playlist"
						v-for="playlist in excludedPlaylists"
						:key="`key-${playlist._id}`"
					>
						<div class="icons-group" slot="actions">
							<confirm @confirm="deselectPlaylist(playlist._id)">
								<i
									class="material-icons stop-icon"
									content="Stop blacklisting songs from this playlist
							"
									v-tippy
									>stop</i
								>
							</confirm>
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
						</div>
					</playlist-item>
				</div>
				<p v-else class="has-text-centered scrollable-list">
					No playlists currently blacklisted.
				</p>
			</div>
			<!-- <div class="tab" v-show="tab === 'songs'">
				Blacklisting songs has yet to be added.
			</div> -->
		</div>
	</div>
</template>
<script>
import { mapActions, mapState, mapGetters } from "vuex";

import Toast from "toasters";
import PlaylistItem from "@/components/PlaylistItem.vue";
import Confirm from "@/components/Confirm.vue";

export default {
	components: {
		PlaylistItem,
		Confirm
	},
	data() {
		return {
			tab: "playlists"
		};
	},
	computed: {
		...mapState({
			userId: state => state.user.auth.userId
		}),
		...mapState("modals/manageStation", {
			station: state => state.station,
			originalStation: state => state.originalStation,
			excludedPlaylists: state => state.excludedPlaylists
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		showTab(tab) {
			this.tab = tab;
		},
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		deselectPlaylist(id) {
			this.socket.dispatch(
				"stations.removeExcludedPlaylist",
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

<style lang="scss" scoped>
.station-blacklist {
	.tabs-container {
		margin-top: 10px;
		.tab-selection {
			display: flex;
			overflow-x: auto;
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
			.playlist-item:not(:last-of-type) {
				margin-bottom: 10px;
			}
		}
	}
}
</style>
