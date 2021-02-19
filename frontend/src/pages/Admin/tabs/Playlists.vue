<template>
	<div>
		<metadata title="Admin | Playlists" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Display name</td>
						<td>Type</td>
						<td>Is user modifiable</td>
						<td>Songs #</td>
						<td>Playlist length</td>
						<td>Created by</td>
						<td>Created at</td>
						<td>Created for</td>
						<td>Playlist id</td>
						<!-- <td>Options</td> -->
					</tr>
				</thead>
				<tbody>
					<tr v-for="playlist in playlists" :key="playlist._id">
						<td>{{ playlist.displayName }}</td>
						<td>{{ playlist.type }}</td>
						<td>{{ playlist.isUserModifiable }}</td>
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
						<!-- <td>
							<button
								class="button is-primary"
								@click="edit(playlist)"
							>
								Edit
							</button>
						</td> -->
					</tr>
				</tbody>
			</table>
		</div>
		<!-- <edit-playlist
			v-if="modals.editPlaylist"
			:user-id="editingPlaylistId"
			sector="admin"
		/> -->
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

// import EditPlaylist from "../../../components/modals/EditPlaylist/index.vue";
import UserIdToUsername from "../../../components/common/UserIdToUsername.vue";

import io from "../../../io";
import utils from "../../../../js/utils";

export default {
	components: { /* EditPlaylist, */ UserIdToUsername },
	data() {
		return {
			utils,
			// editingPlaylistId: "",
			playlists: []
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals.admin
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => this.init());
		});
	},
	methods: {
		// edit(playlist) {
		// 	this.editingPlaylistId = playlist._id;
		// 	this.openModal({ sector: "admin", modal: "editPlaylist" });
		// },
		init() {
			this.socket.emit("playlists.index", res => {
				console.log(res);
				if (res.status === "success") {
					this.playlists = res.data;
					// if (this.$route.query.userId) {
					// 	const user = this.users.find(
					// 		user => user._id === this.$route.query.userId
					// 	);
					// 	if (user) this.edit(user);
					// }
				}
			});
			this.socket.emit("apis.joinAdminRoom", "playlists", () => {});
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
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

.night-mode {
	.table {
		color: $night-mode-text;
		background-color: $night-mode-bg-secondary;

		thead tr {
			background: $night-mode-bg-secondary;
			td {
				color: #fff;
			}
		}

		tbody tr:hover {
			background-color: #111 !important;
		}

		tbody tr:nth-child(even) {
			background-color: #444;
		}

		strong {
			color: $night-mode-text;
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
	background-color: $primary-color !important;
}
</style>
