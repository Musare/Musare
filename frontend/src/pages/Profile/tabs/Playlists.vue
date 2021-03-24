<template>
	<div class="content playlists-tab">
		<create-playlist v-if="modals.createPlaylist" />

		<div v-if="playlists.length > 0">
			<h4 class="section-title">
				{{ myUserId === userId ? "My" : null }}
				Playlists
			</h4>

			<p class="section-description">
				View
				{{
					userId === myUserId
						? "and manage your personal"
						: `${username}'s`
				}}
				playlists.
			</p>

			<hr class="section-horizontal-rule" />

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
					<div
						:class="{
							item: true,
							'item-draggable': myUserId === userId
						}"
						v-for="playlist in playlists"
						:key="playlist._id"
					>
						<playlist-item
							v-if="
								playlist.privacy === 'public' ||
									(playlist.privacy === 'private' &&
										playlist.createdBy === userId)
							"
							:playlist="playlist"
						>
							<div slot="actions">
								<i
									v-if="myUserId === userId"
									@click="showPlaylist(playlist._id)"
									class="material-icons edit-icon"
									>edit</i
								>
								<i
									v-else
									@click="showPlaylist(playlist._id)"
									class="material-icons view-icon"
									>visibility</i
								>
							</div>
						</playlist-item>
					</div>
				</transition-group>
			</draggable>

			<button
				v-if="myUserId === userId"
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
		</div>
		<div v-else>
			<h3>No playlists here.</h3>
		</div>
	</div>
</template>

<script>
import draggable from "vuedraggable";
import { mapActions, mapState, mapGetters } from "vuex";

import ws from "../../../ws";

import SortablePlaylists from "../../../mixins/SortablePlaylists.vue";
import PlaylistItem from "../../../components/ui/PlaylistItem.vue";

export default {
	components: {
		PlaylistItem,
		draggable,
		CreatePlaylist: () =>
			import("../../../components/modals/CreatePlaylist.vue")
	},
	mixins: [SortablePlaylists],
	props: {
		userId: {
			type: String,
			default: ""
		},
		username: {
			type: String,
			default: ""
		}
	},
	computed: {
		...mapState({
			...mapState("modalVisibility", {
				modals: state => state.modals.station
			}),
			myUserId: state => state.user.auth.userId
		}),
		playlists: {
			get() {
				return this.$store.state.user.playlists.playlists;
			},
			set(playlists) {
				this.$store.commit("user/playlists/setPlaylists", playlists);
			}
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (
			this.$route.query.tab === "recent-activity" ||
			this.$route.query.tab === "playlists"
		)
			this.tab = this.$route.query.tab;

		if (this.myUserId !== this.userId) {
			ws.onConnect(() =>
				this.socket.dispatch(
					"apis.joinRoom",
					`profile-${this.userId}-playlists`,
					() => {}
				)
			);
		}

		this.socket.dispatch("playlists.indexForUser", this.userId, res => {
			if (res.status === "success") this.setPlaylists(res.data);
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
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal({ sector: "station", modal: "editPlaylist" });
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
	}
};
</script>
