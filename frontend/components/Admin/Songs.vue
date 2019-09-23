<template>
	<div>
		<metadata title="Admin | Songs" />
		<div class="container" v-scroll="handleScroll">
			<p>
				<span>Sets loaded: {{ position - 1 }} / {{ maxPosition }}</span>
				<br />
				<span>Loaded songs: {{ this.songs.length }}</span>
			</p>
			<input
				v-model="searchQuery"
				type="text"
				class="input"
				placeholder="Search for Songs"
			/>
			<button
				v-if="!loadAllSongs"
				class="button is-primary"
				@click="loadAll()"
			>
				Load all
			</button>
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

import Toast from "toasters";

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
			},
			gettingSet: false,
			loadAllSongs: false
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
		// eslint-disable-next-line func-names
		"modals.editSong": function(val) {
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
					new Toast({ content: res.message, timeout: 4000 });
				else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		getSet() {
			if (this.gettingSet) return;
			if (this.position > this.maxPosition) return;
			this.gettingSet = true;
			this.socket.emit("songs.getSet", this.position, data => {
				data.forEach(song => {
					this.addSong(song);
				});
				this.position += 1;
				this.gettingSet = false;
				if (this.loadAllSongs && this.maxPosition > this.position - 1)
					setTimeout(() => {
						this.getSet();
					}, 500);
			});
		},
		handleScroll() {
			if (this.loadAllSongs) return false;
			if (window.scrollY + 50 >= window.scrollMaxY) this.getSet();

			return this.maxPosition === this.position;
		},
		loadAll() {
			this.loadAllSongs = true;
			this.getSet();
		},
		init() {
			if (this.songs.length > 0)
				this.position = Math.ceil(this.songs.length / 15) + 1;

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

		if (this.$route.query.songId) {
			this.socket.emit("songs.getSong", this.$route.query.songId, res => {
				if (res.status === "success") {
					this.edit(res.data);
					this.closeModal({ sector: "admin", modal: "viewReport" });
				} else
					new Toast({
						content: "Song with that ID not found",
						timeout: 3000
					});
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
