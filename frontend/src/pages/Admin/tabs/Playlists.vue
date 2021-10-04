<template>
	<div>
		<page-metadata title="Admin | Playlists" />
		<div class="container">
			<button
				class="button is-primary"
				@click="deleteOrphanedStationPlaylists()"
			>
				Delete orphaned station playlists
			</button>
			<button
				class="button is-primary"
				@click="deleteOrphanedGenrePlaylists()"
			>
				Delete orphaned genre playlists
			</button>
			<button
				class="button is-primary"
				@click="requestOrphanedPlaylistSongs()"
			>
				Request orphaned playlist songs
			</button>
			<button
				class="button is-primary"
				@click="clearAndRefillAllStationPlaylists()"
			>
				Clear and refill all station playlists
			</button>
			<button
				class="button is-primary"
				@click="clearAndRefillAllGenrePlaylists()"
			>
				Clear and refill all genre playlists
			</button>
			<br />
			<br />
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Display name</td>
						<td>Type</td>
						<td>Is user modifiable</td>
						<td>Privacy</td>
						<td>Songs #</td>
						<td>Playlist length</td>
						<td>Created by</td>
						<td>Created at</td>
						<td>Created for</td>
						<td>Playlist id</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="playlist in playlists" :key="playlist._id">
						<td>{{ playlist.displayName }}</td>
						<td>{{ playlist.type }}</td>
						<td>{{ playlist.isUserModifiable }}</td>
						<td>{{ playlist.privacy }}</td>
						<td>{{ playlist.songs.length }}</td>
						<td>{{ totalLengthForPlaylist(playlist.songs) }}</td>
						<td v-if="playlist.createdBy === 'Musare'">Musare</td>
						<td v-else>
							<user-id-to-username
								:user-id="playlist.createdBy"
								:link="true"
							/>
						</td>
						<td :title="new Date(playlist.createdAt)">
							{{ getDateFormatted(playlist.createdAt) }}
						</td>
						<td>{{ playlist.createdFor }}</td>
						<td>{{ playlist._id }}</td>
						<td>
							<button
								class="button is-primary"
								@click="edit(playlist._id)"
							>
								View
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<edit-playlist v-if="modals.editPlaylist" sector="admin" />
		<report v-if="modals.report" />
		<edit-song v-if="modals.editSong" song-type="songs" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";

import UserIdToUsername from "@/components/UserIdToUsername.vue";

import ws from "@/ws";
import utils from "../../../../js/utils";

export default {
	components: {
		EditPlaylist: defineAsyncComponent(() =>
			import("@/components/modals/EditPlaylist")
		),
		UserIdToUsername,
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		)
	},
	data() {
		return {
			utils
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapState("admin/playlists", {
			playlists: state => state.playlists
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.on("event:admin.playlist.created", res =>
			this.addPlaylist(res.data.playlist)
		);

		this.socket.on("event:admin.playlist.deleted", res =>
			this.removePlaylist(res.data.playlistId)
		);

		this.socket.on("event:admin.playlist.song.added", res =>
			this.addPlaylistSong({
				playlistId: res.data.playlistId,
				song: res.data.song
			})
		);

		this.socket.on("event:admin.playlist.song.removed", res =>
			this.removePlaylistSong({
				playlistId: res.data.playlistId,
				youtubeId: res.data.youtubeId
			})
		);

		this.socket.on("event:admin.playlist.displayName.updated", res =>
			this.updatePlaylistDisplayName({
				playlistId: res.data.playlistId,
				displayName: res.data.displayName
			})
		);

		this.socket.on("event:admin.playlist.privacy.updated", res =>
			this.updatePlaylistPrivacy({
				playlistId: res.data.playlistId,
				privacy: res.data.privacy
			})
		);

		ws.onConnect(this.init);
	},
	methods: {
		edit(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		init() {
			this.socket.dispatch("playlists.index", res => {
				if (res.status === "success") {
					this.setPlaylists(res.data.playlists);
					// if (this.$route.query.userId) {
					// 	const user = this.users.find(
					// 		user => user._id === this.$route.query.userId
					// 	);
					// 	if (user) this.edit(user);
					// }
				}
			});
			this.socket.dispatch("apis.joinAdminRoom", "playlists", () => {});
		},
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		totalLengthForPlaylist(songs) {
			let length = 0;
			songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		},
		deleteOrphanedStationPlaylists() {
			this.socket.dispatch(
				"playlists.deleteOrphanedStationPlaylists",
				res => {
					if (res.status === "success") new Toast(res.message);
					else new Toast(`Error: ${res.message}`);
				}
			);
		},
		deleteOrphanedGenrePlaylists() {
			this.socket.dispatch(
				"playlists.deleteOrphanedGenrePlaylists",
				res => {
					if (res.status === "success") new Toast(res.message);
					else new Toast(`Error: ${res.message}`);
				}
			);
		},
		requestOrphanedPlaylistSongs() {
			this.socket.dispatch(
				"playlists.requestOrphanedPlaylistSongs",
				res => {
					if (res.status === "success") new Toast(res.message);
					else new Toast(`Error: ${res.message}`);
				}
			);
		},
		clearAndRefillAllStationPlaylists() {
			this.socket.dispatch(
				"playlists.clearAndRefillAllStationPlaylists",
				res => {
					if (res.status === "success")
						new Toast({ content: res.message, timeout: 4000 });
					else
						new Toast({
							content: `Error: ${res.message}`,
							timeout: 4000
						});
				}
			);
		},
		clearAndRefillAllGenrePlaylists() {
			this.socket.dispatch(
				"playlists.clearAndRefillAllGenrePlaylists",
				res => {
					if (res.status === "success")
						new Toast({ content: res.message, timeout: 4000 });
					else
						new Toast({
							content: `Error: ${res.message}`,
							timeout: 4000
						});
				}
			);
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"]),
		...mapActions("admin/playlists", [
			"addPlaylist",
			"setPlaylists",
			"removePlaylist",
			"addPlaylistSong",
			"removePlaylistSong",
			"updatePlaylistDisplayName",
			"updatePlaylistPrivacy"
		])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}
}

body {
	font-family: "Hind", sans-serif;
}

td {
	vertical-align: middle;
}

.is-primary:focus {
	background-color: var(--primary-color) !important;
}
</style>
