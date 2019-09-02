<template>
	<div>
		<metadata title="Admin | Queue songs" />
		<div class="container">
			<input
				v-model="searchQuery"
				type="text"
				class="input"
				placeholder="Search for Songs"
			/>
			<br />
			<br />
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Thumbnail</td>
						<td>Title</td>
						<td>Artists</td>
						<td>Genres</td>
						<td>ID / YouTube ID</td>
						<td>Requested By</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(song, index) in filteredSongs" :key="index">
						<td>
							<img
								class="song-thumbnail"
								:src="song.thumbnail"
								onerror="this.src='/assets/notes-transparent.png'"
							/>
						</td>
						<td>
							<strong>{{ song.title }}</strong>
						</td>
						<td>{{ song.artists.join(", ") }}</td>
						<td>{{ song.genres.join(", ") }}</td>
						<td>
							{{ song._id }}
							<br />
							<a
								:href="
									'https://www.youtube.com/watch?v=' +
										`${song.songId}`
								"
								target="_blank"
							>
								{{ song.songId }}</a
							>
						</td>
						<td>
							<user-id-to-username
								:userId="song.requestedBy"
								:link="true"
							/>
						</td>
						<td class="optionsColumn">
							<button
								class="button is-primary"
								@click="edit(song, index)"
							>
								<i class="material-icons">edit</i>
							</button>
							<button
								class="button is-success"
								@click="add(song)"
							>
								<i class="material-icons">add</i>
							</button>
							<button
								class="button is-danger"
								@click="remove(song._id, index)"
							>
								<i class="material-icons">cancel</i>
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<nav class="pagination">
			<a
				v-if="position > 1"
				class="button"
				href="#"
				@click="getSet(position - 1)"
			>
				<i class="material-icons">navigate_before</i>
			</a>
			<a
				v-if="maxPosition > position"
				class="button"
				href="#"
				@click="getSet(position + 1)"
			>
				<i class="material-icons">navigate_next</i>
			</a>
		</nav>
		<edit-song v-if="modals.editSong" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";

import EditSong from "../Modals/EditSong.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

import io from "../../io";

export default {
	components: { EditSong, UserIdToUsername },
	data() {
		return {
			position: 1,
			maxPosition: 1,
			searchQuery: "",
			songs: []
		};
	},
	computed: {
		filteredSongs() {
			return this.songs.filter(
				song =>
					JSON.stringify(Object.values(song)).indexOf(
						this.searchQuery
					) !== -1
			);
		},
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	// watch: {
	//   "modals.editSong": function(value) {
	//     console.log(value);
	//     if (value === false) this.stopVideo();
	//   }
	// },
	methods: {
		getSet(position) {
			this.socket.emit("queueSongs.getSet", position, data => {
				this.songs = data;
				this.position = position;
			});
		},
		edit(song, index) {
			const newSong = {};
			Object.keys(song).forEach(n => {
				newSong[n] = song[n];
			});

			this.editSong({ index, song: newSong, type: "queueSongs" });
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		add(song) {
			this.socket.emit("songs.add", song, res => {
				if (res.status === "success")
					Toast.methods.addToast(res.message, 2000);
				else Toast.methods.addToast(res.message, 4000);
			});
		},
		remove(id) {
			this.socket.emit("queueSongs.remove", id, res => {
				if (res.status === "success")
					Toast.methods.addToast(res.message, 2000);
				else Toast.methods.addToast(res.message, 4000);
			});
		},
		init() {
			this.socket.emit("queueSongs.index", data => {
				this.songs = data.songs;
				this.maxPosition = Math.round(data.maxLength / 50);
			});
			this.socket.emit("apis.joinAdminRoom", "queue", () => {});
		},
		...mapActions("admin/songs", ["stopVideo", "editSong"]),
		...mapActions("modals", ["openModal"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.on("event:admin.queueSong.added", queueSong => {
				this.songs.push(queueSong);
			});
			this.socket.on("event:admin.queueSong.removed", songId => {
				this.songs = this.songs.filter(song => {
					return song._id !== songId;
				});
			});
			this.socket.on("event:admin.queueSong.updated", updatedSong => {
				for (let i = 0; i < this.songs.length; i += 1) {
					const song = this.songs[i];
					if (song._id === updatedSong._id) {
						this.songs.$set(i, updatedSong);
					}
				}
			});

			if (this.socket.connected) {
				this.init();
			}
			io.onConnect(() => {
				this.init();
			});
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.optionsColumn {
	width: 140px;
	button {
		width: 35px;
	}
}

.song-thumbnail {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}

td {
	vertical-align: middle;
}

.is-primary:focus {
	background-color: $primary-color !important;
}
</style>
