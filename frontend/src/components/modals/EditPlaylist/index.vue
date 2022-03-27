<template>
	<modal
		:title="
			userId === playlist.createdBy ? 'Edit Playlist' : 'View Playlist'
		"
		:class="{
			'edit-playlist-modal': true,
			'view-only': !isEditable()
		}"
		:size="isEditable() ? 'wide' : null"
		:split="true"
	>
		<template #body>
			<div class="left-section">
				<div id="playlist-info-section" class="section">
					<h3>{{ playlist.displayName }}</h3>
					<h5>Song Count: {{ playlist.songs.length }}</h5>
					<h5>Duration: {{ totalLength() }}</h5>
				</div>

				<div class="tabs-container">
					<div class="tab-selection">
						<button
							class="button is-default"
							:class="{ selected: tab === 'settings' }"
							ref="settings-tab"
							@click="showTab('settings')"
							v-if="
								userId === playlist.createdBy ||
								isEditable() ||
								(playlist.type === 'genre' && isAdmin())
							"
						>
							Settings
						</button>
						<button
							class="button is-default"
							:class="{ selected: tab === 'add-songs' }"
							ref="add-songs-tab"
							@click="showTab('add-songs')"
							v-if="isEditable()"
						>
							Add Songs
						</button>
						<button
							class="button is-default"
							:class="{
								selected: tab === 'import-playlists'
							}"
							ref="import-playlists-tab"
							@click="showTab('import-playlists')"
							v-if="isEditable()"
						>
							Import Playlists
						</button>
					</div>
					<settings
						class="tab"
						v-show="tab === 'settings'"
						v-if="
							userId === playlist.createdBy ||
							isEditable() ||
							(playlist.type === 'genre' && isAdmin())
						"
					/>
					<add-songs
						class="tab"
						v-show="tab === 'add-songs'"
						v-if="isEditable()"
					/>
					<import-playlists
						class="tab"
						v-show="tab === 'import-playlists'"
						v-if="isEditable()"
					/>
				</div>
			</div>

			<div class="right-section">
				<div id="rearrange-songs-section" class="section">
					<div v-if="isEditable()">
						<h4 class="section-title">Rearrange Songs</h4>

						<p class="section-description">
							Drag and drop songs to change their order
						</p>

						<hr class="section-horizontal-rule" />
					</div>

					<aside class="menu">
						<draggable
							tag="transition-group"
							:component-data="{
								name: !drag ? 'draggable-list-transition' : null
							}"
							v-if="playlistSongs.length > 0"
							v-model="playlistSongs"
							item-key="_id"
							v-bind="dragOptions"
							@start="drag = true"
							@end="drag = false"
							@change="repositionSong"
						>
							<template #item="{ element, index }">
								<div class="menu-list scrollable-list">
									<song-item
										:song="element"
										:class="{
											'item-draggable': isEditable()
										}"
										:ref="`song-item-${index}`"
									>
										<template #tippyActions>
											<i
												class="material-icons add-to-queue-icon"
												v-if="
													station.partyMode &&
													!station.locked
												"
												@click="
													addSongToQueue(
														element.youtubeId
													)
												"
												content="Add Song to Queue"
												v-tippy
												>queue</i
											>
											<quick-confirm
												v-if="
													userId ===
														playlist.createdBy ||
													isEditable()
												"
												placement="left"
												@confirm="
													removeSongFromPlaylist(
														element.youtubeId
													)
												"
											>
												<i
													class="material-icons delete-icon"
													content="Remove Song from Playlist"
													v-tippy
													>delete_forever</i
												>
											</quick-confirm>
											<i
												class="material-icons"
												v-if="isEditable() && index > 0"
												@click="
													moveSongToTop(
														element,
														index
													)
												"
												content="Move to top of Playlist"
												v-tippy
												>vertical_align_top</i
											>
											<i
												v-if="
													isEditable() &&
													playlistSongs.length - 1 !==
														index
												"
												@click="
													moveSongToBottom(
														element,
														index
													)
												"
												class="material-icons"
												content="Move to bottom of Playlist"
												v-tippy
												>vertical_align_bottom</i
											>
										</template>
									</song-item>
								</div>
							</template>
						</draggable>
						<p v-else-if="gettingSongs" class="nothing-here-text">
							Loading songs...
						</p>
						<p v-else class="nothing-here-text">
							This playlist doesn't have any songs.
						</p>
					</aside>
				</div>
			</div>
		</template>
		<template #footer>
			<button
				class="button is-default"
				v-if="isOwner() || isAdmin() || playlist.privacy === 'public'"
				@click="downloadPlaylist()"
			>
				Download Playlist
			</button>
			<div class="right">
				<quick-confirm
					v-if="playlist.type === 'station'"
					@confirm="clearAndRefillStationPlaylist()"
				>
					<a class="button is-danger">
						Clear and refill station playlist
					</a>
				</quick-confirm>
				<quick-confirm
					v-if="playlist.type === 'genre'"
					@confirm="clearAndRefillGenrePlaylist()"
				>
					<a class="button is-danger">
						Clear and refill genre playlist
					</a>
				</quick-confirm>
				<quick-confirm
					v-if="
						isEditable() &&
						!(
							playlist.type === 'user-liked' ||
							playlist.type === 'user-disliked'
						)
					"
					@confirm="removePlaylist()"
				>
					<a class="button is-danger"> Remove Playlist </a>
				</quick-confirm>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import draggable from "vuedraggable";
import Toast from "toasters";

import ws from "@/ws";
import QuickConfirm from "@/components/QuickConfirm.vue";
import Modal from "../../Modal.vue";
import SongItem from "../../SongItem.vue";

import Settings from "./Tabs/Settings.vue";
import AddSongs from "./Tabs/AddSongs.vue";
import ImportPlaylists from "./Tabs/ImportPlaylists.vue";

import utils from "../../../../js/utils";

export default {
	components: {
		Modal,
		draggable,
		QuickConfirm,
		SongItem,
		Settings,
		AddSongs,
		ImportPlaylists
	},
	data() {
		return {
			utils,
			drag: false,
			apiDomain: "",
			gettingSongs: false
		};
	},
	computed: {
		...mapState("station", {
			station: state => state.station
		}),
		...mapState("user/playlists", {
			editing: state => state.editing
		}),
		...mapState("modals/editPlaylist", {
			tab: state => state.tab,
			playlist: state => state.playlist
		}),
		playlistSongs: {
			get() {
				return this.$store.state.modals.editPlaylist.playlist.songs;
			},
			set(value) {
				this.$store.commit(
					"modals/editPlaylist/updatePlaylistSongs",
					value
				);
			}
		},
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			userRole: state => state.user.auth.role
		}),
		dragOptions() {
			return {
				animation: 200,
				group: "songs",
				disabled: !this.isEditable(),
				ghostClass: "draggable-list-ghost"
			};
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on(
			"event:playlist.song.added",
			res => {
				if (this.playlist._id === res.data.playlistId)
					this.addSong(res.data.song);
			},
			{ modal: "editPlaylist" }
		);

		this.socket.on(
			"event:playlist.song.removed",
			res => {
				if (this.playlist._id === res.data.playlistId) {
					// remove song from array of playlists
					this.removeSong(res.data.youtubeId);
				}
			},
			{ modal: "editPlaylist" }
		);

		this.socket.on(
			"event:playlist.displayName.updated",
			res => {
				if (this.playlist._id === res.data.playlistId) {
					const playlist = {
						displayName: res.data.displayName,
						...this.playlist
					};
					this.setPlaylist(playlist);
				}
			},
			{ modal: "editPlaylist" }
		);

		this.socket.on(
			"event:playlist.song.repositioned",
			res => {
				if (this.playlist._id === res.data.playlistId) {
					const { song, playlistId } = res.data;

					if (this.playlist._id === playlistId) {
						this.repositionedSong(song);
					}
				}
			},
			{ modal: "editPlaylist" }
		);
	},
	beforeUnmount() {
		this.clearPlaylist();
	},
	methods: {
		init() {
			this.gettingSongs = true;
			this.socket.dispatch("playlists.getPlaylist", this.editing, res => {
				if (res.status === "success") {
					this.setPlaylist(res.data.playlist);
				} else new Toast(res.message);
				this.gettingSongs = false;
			});
		},
		isEditable() {
			return (
				(this.playlist.type === "user" ||
					this.playlist.type === "user-liked" ||
					this.playlist.type === "user-disliked") &&
				(this.userId === this.playlist.createdBy ||
					this.userRole === "admin")
			);
		},
		isAdmin() {
			return this.userRole === "admin";
		},
		isOwner() {
			return this.loggedIn && this.userId === this.playlist.createdBy;
		},
		repositionSong({ moved }) {
			if (!moved) return; // we only need to update when song is moved

			this.socket.dispatch(
				"playlists.repositionSong",
				this.playlist._id,
				{
					...moved.element,
					oldIndex: moved.oldIndex,
					newIndex: moved.newIndex
				},
				res => {
					if (res.status !== "success")
						this.repositionedSong({
							...moved.element,
							newIndex: moved.oldIndex,
							oldIndex: moved.newIndex
						});
				}
			);
		},
		moveSongToTop(song, index) {
			this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

			this.repositionSong({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: 0
				}
			});
		},
		moveSongToBottom(song, index) {
			this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

			this.repositionSong({
				moved: {
					element: song,
					oldIndex: index,
					newIndex: this.playlistSongs.length
				}
			});
		},
		totalLength() {
			let length = 0;
			this.playlist.songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		},
		shuffle() {
			this.socket.dispatch(
				"playlists.shuffle",
				this.playlist._id,
				res => {
					new Toast(res.message);
					if (res.status === "success") {
						this.updatePlaylistSongs(
							res.data.playlist.songs.sort(
								(a, b) => a.position - b.position
							)
						);
					}
				}
			);
		},
		removeSongFromPlaylist(id) {
			return this.socket.dispatch(
				"playlists.removeSongFromPlaylist",
				id,
				this.playlist._id,
				res => {
					new Toast(res.message);
				}
			);
		},
		removePlaylist() {
			if (this.isOwner()) {
				this.socket.dispatch(
					"playlists.remove",
					this.playlist._id,
					res => {
						new Toast(res.message);
						if (res.status === "success")
							this.closeModal("editPlaylist");
					}
				);
			} else if (this.isAdmin()) {
				this.socket.dispatch(
					"playlists.removeAdmin",
					this.playlist._id,
					res => {
						new Toast(res.message);
						if (res.status === "success")
							this.closeModal("editPlaylist");
					}
				);
			}
		},
		async downloadPlaylist() {
			if (this.apiDomain === "")
				this.apiDomain = await lofig.get("backend.apiDomain");

			fetch(`${this.apiDomain}/export/playlist/${this.playlist._id}`, {
				credentials: "include"
			})
				.then(res => res.blob())
				.then(blob => {
					const url = window.URL.createObjectURL(blob);

					const a = document.createElement("a");
					a.style.display = "none";
					a.href = url;

					a.download = `musare-playlist-${
						this.playlist._id
					}-${new Date().toISOString()}.json`;

					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);

					new Toast("Successfully downloaded playlist.");
				})
				.catch(
					() => new Toast("Failed to export and download playlist.")
				);
		},
		addSongToQueue(youtubeId) {
			this.socket.dispatch(
				"stations.addToQueue",
				this.station._id,
				youtubeId,
				data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
					else new Toast({ content: data.message, timeout: 4000 });
				}
			);
		},
		clearAndRefillStationPlaylist() {
			this.socket.dispatch(
				"playlists.clearAndRefillStationPlaylist",
				this.playlist._id,
				data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
					else new Toast({ content: data.message, timeout: 4000 });
				}
			);
		},
		clearAndRefillGenrePlaylist() {
			this.socket.dispatch(
				"playlists.clearAndRefillGenrePlaylist",
				this.playlist._id,
				data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
					else new Toast({ content: data.message, timeout: 4000 });
				}
			);
		},
		...mapActions({
			showTab(dispatch, payload) {
				this.$refs[`${payload}-tab`].scrollIntoView({
					block: "nearest"
				});
				return dispatch("modals/editPlaylist/showTab", payload);
			}
		}),
		...mapActions("modals/editPlaylist", [
			"setPlaylist",
			"clearPlaylist",
			"addSong",
			"removeSong",
			"repositionedSong"
		]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}

	.edit-playlist-modal.modal .modal-card-body {
		.left-section {
			#playlist-info-section {
				background-color: var(--dark-grey-3) !important;
				border: 0;
			}
			.tabs-container {
				background-color: transparent !important;
				.tab-selection .button {
					background: var(--dark-grey);
					color: var(--white);
				}
				.tab {
					background-color: var(--dark-grey-3) !important;
					border: 0 !important;
				}
			}
		}
		.right-section .section {
			border-radius: @border-radius;
		}
	}
}

.menu-list li {
	display: flex;
	justify-content: space-between;

	&:not(:last-of-type) {
		margin-bottom: 10px;
	}

	a {
		display: flex;
	}
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.tabs-container {
	.tab-selection {
		display: flex;
		margin: 24px 10px 0 10px;
		max-width: 100%;

		.button {
			border-radius: @border-radius @border-radius 0 0;
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
			background-color: var(--primary-color) !important;
			color: var(--white) !important;
			font-weight: 600;
		}
	}
	.tab {
		border: 1px solid var(--light-grey-3);
		border-radius: 0 0 @border-radius @border-radius;
	}
}

.edit-playlist-modal {
	&.view-only {
		height: auto !important;

		.left-section {
			flex-basis: 100% !important;
		}

		.right-section {
			max-height: unset !important;
		}

		:deep(.section) {
			max-width: 100% !important;
		}
	}

	.nothing-here-text {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.label {
		font-size: 1rem;
		font-weight: normal;
	}

	.input-with-button .button {
		width: 150px;
	}

	.left-section {
		#playlist-info-section {
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;
			padding: 15px !important;

			h3 {
				font-weight: 600;
				font-size: 30px;
			}

			h5 {
				font-size: 18px;
			}

			h3,
			h5 {
				margin: 0;
			}
		}
	}

	.right-section {
		#rearrange-songs-section {
			.scrollable-list:not(:last-of-type) {
				margin-bottom: 10px;
			}
		}
	}
}
</style>
