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
									content="Edit Playlist"
									v-tippy
									>edit</i
								>
								<i
									v-else
									@click="showPlaylist(playlist._id)"
									class="material-icons view-icon"
									content="View Playlist"
									v-tippy
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
				@click="openModal('createPlaylist')"
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
import { mapActions, mapState, mapGetters } from "vuex";

import PlaylistItem from "@/components/PlaylistItem.vue";
import SortablePlaylists from "@/mixins/SortablePlaylists.vue";
import ws from "@/ws";

export default {
	components: {
		PlaylistItem,
		CreatePlaylist: () => import("@/components/modals/CreatePlaylist.vue")
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
				modals: state => state.modals
			})
		}),
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
			if (res.status === "success") this.setPlaylists(res.data.playlists);
			this.orderOfPlaylists = this.calculatePlaylistOrder(); // order in regards to the database
		});
	},
	methods: {
		showPlaylist(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist", "setPlaylists"])
	}
};
</script>
