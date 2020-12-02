<template>
	<div v-scroll="handleScroll">
		<metadata title="Admin | Queue songs" />
		<div class="container">
			<p>
				<span>Sets loaded: {{ setsLoaded }} / {{ maxSets }}</span>
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
		<edit-song v-if="modals.editSong" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Vue from "vue";

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
			songs: [],
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
		setsLoaded() {
			return this.position - 1;
		},
		maxSets() {
			return this.maxPosition - 1;
		},
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		"modals.editSong": function(value) {
			if (value === false) this.stopVideo();
		}
	},
	methods: {
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
					new Toast({ content: res.message, timeout: 2000 });
				else new Toast({ content: res.message, timeout: 4000 });
			});
		},
		remove(id) {
			this.socket.emit("queueSongs.remove", id, res => {
				if (res.status === "success")
					new Toast({ content: res.message, timeout: 2000 });
				else new Toast({ content: res.message, timeout: 4000 });
			});
		},
		getSet() {
			if (this.gettingSet) return;
			if (this.position >= this.maxPosition) return;
			this.gettingSet = true;
			this.socket.emit("queueSongs.getSet", this.position, data => {
				data.forEach(song => {
					this.songs.push(song);
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
			const scrollPosition = document.body.clientHeight + window.scrollY;
			const bottomPosition = document.body.scrollHeight;

			if (this.loadAllSongs) return false;
			if (scrollPosition + 50 >= bottomPosition) this.getSet();

			return this.maxPosition === this.position;
		},
		loadAll() {
			this.loadAllSongs = true;
			this.getSet();
		},
		init() {
			if (this.songs.length > 0)
				this.position = Math.ceil(this.songs.length / 15) + 1;

			this.socket.emit("queueSongs.length", length => {
				this.maxPosition = Math.ceil(length / 15) + 1;
				this.getSet();
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
						Vue.set(this.songs, i, updatedSong);
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

.night-mode {
	.table {
		color: #ddd;
		background-color: #222;

		thead tr {
			background: $night-mode-secondary;
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
			color: #ddd;
		}
	}
}

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
