<template>
	<div>
		<metadata title="Admin | Songs" />
		<div class="container" v-scroll="handleScroll">
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
			<button
				class="button is-primary"
				@click="toggleKeyboardShortcutsHelper"
				@dblclick="resetKeyboardShortcutsHelper"
			>
				Keyboard shortcuts helper
			</button>
			<br />
			<div>
				<input
					type="text"
					placeholder="Filter artist checkboxes"
					v-model="artistFilterQuery"
				/>
				<label v-for="artist in filteredArtists" :key="artist">
					<input
						type="checkbox"
						:checked="artistFilterSelected.indexOf(artist) !== -1"
						@click="toggleArtistSelected(artist)"
					/>
					<span>{{ artist }}</span>
				</label>
			</div>
			<div>
				<input
					type="text"
					placeholder="Filter genre checkboxes"
					v-model="genreFilterQuery"
				/>
				<label v-for="genre in filteredGenres" :key="genre">
					<input
						type="checkbox"
						:checked="genreFilterSelected.indexOf(genre) !== -1"
						@click="toggleGenreSelected(genre)"
					/>
					<span>{{ genre }}</span>
				</label>
			</div>
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
								:user-id="song.requestedBy"
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
		<edit-song
			v-if="modals.editSong"
			:song-id="editingSongId"
			song-type="songs"
		/>
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div>
						<span class="biggest"><b>Songs page</b></span>
						<span
							><b>Arrow keys up/down</b> - Moves between
							songs</span
						>
						<span><b>E</b> - Edit selected song</span>
						<span><b>A</b> - Add selected song</span>
						<span><b>X</b> - Delete selected song</span>
					</div>
					<hr />
					<div>
						<span class="biggest"><b>Edit song modal</b></span>
						<span class="bigger"><b>Navigation</b></span>
						<span><b>Home</b> - Edit</span>
						<span><b>End</b> - Edit</span>
						<hr />
						<span class="bigger"><b>Player controls</b></span>
						<span><b>Numpad up/down</b> - Volume up/down 10%</span>
						<span
							><b>Ctrl + Numpad up/down</b> - Volume up/down
							1%</span
						>
						<span><b>Numpad center</b> - Pause/resume</span>
						<span><b>Ctrl + Numpad center</b> - Stop</span>
						<span
							><b>Numpad Right</b> - Skip to last 10 seconds</span
						>
						<hr />
						<span class="bigger"><b>Form control</b></span>
						<span
							><b>Ctrl + D</b> - Executes purple button in that
							input</span
						>
						<span
							><b>Ctrl + Alt + D</b> - Fill in all Discogs
							fields</span
						>
						<span
							><b>Ctrl + R</b> - Executes red button in that
							input</span
						>
						<span
							><b>Ctrl + Alt + R</b> - Reset duration field</span
						>
						<hr />
						<span class="bigger"><b>Modal control</b></span>
						<span><b>Ctrl + S</b> - Save</span>
						<span><b>Ctrl + X</b> - Exit</span>
					</div>
				</div>
			</template>
		</floating-box>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import Toast from "toasters";

import EditSong from "../../../components/modals/EditSong.vue";
import UserIdToUsername from "../../../components/common/UserIdToUsername.vue";

import FloatingBox from "../../../components/ui/FloatingBox.vue";

import ScrollAndFetchHandler from "../../../mixins/ScrollAndFetchHandler.vue";

import io from "../../../io";

export default {
	components: { EditSong, UserIdToUsername, FloatingBox },
	mixins: [ScrollAndFetchHandler],
	data() {
		return {
			editingSongId: "",
			searchQuery: "",
			artistFilterQuery: "",
			artistFilterSelected: [],
			genreFilterQuery: "",
			genreFilterSelected: [],
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
					) !== -1 &&
					(this.artistFilterSelected.length === 0 ||
						song.artists.some(
							artist =>
								this.artistFilterSelected.indexOf(artist) !== -1
						)) &&
					(this.genreFilterSelected.length === 0 ||
						song.genres.some(
							genre =>
								this.genreFilterSelected.indexOf(genre) !== -1
						))
			);
		},
		artists() {
			const artists = [];
			this.songs.forEach(song => {
				song.artists.forEach(artist => {
					if (artists.indexOf(artist) === -1) artists.push(artist);
				});
			});
			return artists.sort();
		},
		filteredArtists() {
			return this.artists
				.filter(
					artist =>
						this.artistFilterSelected.indexOf(artist) !== -1 ||
						artist.indexOf(this.artistFilterQuery) !== -1
				)
				.sort(
					(a, b) =>
						(this.artistFilterSelected.indexOf(a) === -1 ? 1 : 0) -
						(this.artistFilterSelected.indexOf(b) === -1 ? 1 : 0)
				);
		},
		genres() {
			const genres = [];
			this.songs.forEach(song => {
				song.genres.forEach(genre => {
					if (genres.indexOf(genre) === -1) genres.push(genre);
				});
			});
			return genres.sort();
		},
		filteredGenres() {
			return this.genres
				.filter(
					genre =>
						this.genreFilterSelected.indexOf(genre) !== -1 ||
						genre.indexOf(this.genreFilterQuery) !== -1
				)
				.sort(
					(a, b) =>
						(this.genreFilterSelected.indexOf(a) === -1 ? 1 : 0) -
						(this.genreFilterSelected.indexOf(b) === -1 ? 1 : 0)
				);
		},
		...mapState("modalVisibility", {
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

			if (this.socket.connected) this.init();
			io.onConnect(() => {
				this.init();
			});
		});

		if (this.$route.query.songId) {
			this.socket.emit(
				"songs.getSongFromMusareId",
				this.$route.query.songId,
				res => {
					if (res.status === "success") {
						this.edit(res.data.song);
					} else
						new Toast({
							content: "Song with that ID not found",
							timeout: 3000
						});
				}
			);
		}
	},
	methods: {
		edit(song) {
			// this.editSong({ song, type: "songs" });
			this.editingSongId = song._id;
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		remove(id) {
			// eslint-disable-next-line
			const dialogResult = window.confirm(
				"Are you sure you want to delete this song?"
			);
			if (dialogResult !== true) return;
			this.socket.emit("songs.remove", id, res => {
				if (res.status === "success")
					new Toast({ content: res.message, timeout: 4000 });
				else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		getSet() {
			if (this.gettingSet) return;
			if (this.position >= this.maxPosition) return;
			this.gettingSet = true;

			this.socket.emit("songs.getSet", this.position, data => {
				data.forEach(song => {
					this.addSong(song);
				});

				this.position += 1;
				this.gettingSet = false;
			});
		},
		toggleArtistSelected(artist) {
			if (this.artistFilterSelected.indexOf(artist) === -1)
				this.artistFilterSelected.push(artist);
			else
				this.artistFilterSelected.splice(
					this.artistFilterSelected.indexOf(artist),
					1
				);
		},
		toggleGenreSelected(genre) {
			if (this.genreFilterSelected.indexOf(genre) === -1)
				this.genreFilterSelected.push(genre);
			else
				this.genreFilterSelected.splice(
					this.genreFilterSelected.indexOf(genre),
					1
				);
		},
		toggleKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.toggleBox();
		},
		resetKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.resetBox();
		},
		init() {
			if (this.songs.length > 0)
				this.position = Math.ceil(this.songs.length / 15) + 1;

			this.socket.emit("songs.length", length => {
				this.maxPosition = Math.ceil(length / 15) + 1;

				this.getSet();
			});

			this.socket.emit("apis.joinAdminRoom", "songs", () => {});
		},
		...mapActions("admin/songs", [
			// "stopVideo",
			// "editSong",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals/editSong", ["stopVideo"]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

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
		color: var(--green) !important;
	}
	.thumbDislike {
		color: var(--red) !important;
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

#keyboardShortcutsHelper {
	.box-body {
		b {
			color: var(--black);
		}

		.biggest {
			font-size: 18px;
		}

		.bigger {
			font-size: 16px;
		}

		span {
			display: block;
		}
	}
}

.is-primary:focus {
	background-color: var(--primary-color) !important;
}
</style>
