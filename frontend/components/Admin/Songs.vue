<template>
	<div>
		<metadata title="Admin | Songs" />
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
						<td class="likesColumn">
							<i class="material-icons thumbLike">thumb_up</i>
						</td>
						<td class="dislikesColumn">
							<i class="material-icons thumbDislike"
								>thumb_down</i
							>
						</td>
						<td>ID / Youtube ID</td>
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
						<td>{{ song.likes }}</td>
						<td>{{ song.dislikes }}</td>
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
								@click="edit(song)"
							>
								<i class="material-icons">edit</i>
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
			editing: {
				index: 0,
				song: {}
			}
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
		}),
		...mapState("admin/songs", {
			songs: state => state.songs
		})
	},
	watch: {
		"modals.editSong": val => {
			if (!val) this.stopVideo();
		}
	},
	methods: {
		edit(song) {
			this.editSong({ song, type: "songs" });
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		remove(id) {
			this.socket.emit("songs.remove", id, res => {
				if (res.status === "success")
					Toast.methods.addToast(res.message, 4000);
				else Toast.methods.addToast(res.message, 8000);
			});
		},
		getSet() {
			this.socket.emit("songs.getSet", this.position, data => {
				data.forEach(song => {
					this.addSong(song);
				});
				this.position += 1;
				if (this.maxPosition > this.position - 1) this.getSet();
			});
		},
		init() {
			this.socket.emit("songs.length", length => {
				this.maxPosition = Math.ceil(length / 15);
				this.getSet();
			});
			this.socket.emit("apis.joinAdminRoom", "songs", () => {});
		},
		...mapActions("admin/songs", [
			"stopVideo",
			"editSong",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals", ["openModal", "closeModal"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.on("event:admin.song.added", song => {
				this.addSong(song);
			});
			this.socket.on("event:admin.song.removed", songId => {
				this.removeSong(songId);
			});
			this.socket.on("event:admin.song.updated", updatedSong => {
				this.updateSong(updatedSong);
			});

			if (this.socket.connected) {
				this.init();
			}
			io.onConnect(() => {
				this.init();
			});
		});

		if (this.$route.query.id) {
			this.socket.emit("songs.getSong", this.$route.query.id, res => {
				if (res.status === "success") {
					this.edit(res.data);
					this.closeModal({ sector: "admin", modal: "viewReport" });
				} else
					Toast.methods.addToast("Song with that ID not found", 3000);
			});
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

body {
	font-family: "Roboto", sans-serif;
}

.optionsColumn {
	width: 100px;
	button {
		width: 35px;
	}
}

.likesColumn,
.dislikesColumn {
	width: 40px;
	i {
		font-size: 20px;
	}
	.thumbLike {
		color: $green !important;
	}
	.thumbDislike {
		color: $red !important;
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
