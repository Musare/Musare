<template>
	<div>
		<metadata title="Admin | Songs" />
		<div class="container">
			<p>
				<span>Sets loaded: {{ setsLoaded }} / {{ maxSets }}</span>
				<br />
				<span>Loaded songs: {{ songs.length }}</span>
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
			<confirm placement="bottom" @confirm="updateAllSongs()">
				<button
					class="button is-danger"
					content="Update all songs"
					v-tippy
				>
					Update all songs
				</button>
			</confirm>
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
					<tr v-for="song in filteredSongs" :key="song._id">
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
										`${song.youtubeId}`
								"
								target="_blank"
							>
								{{ song.youtubeId }}</a
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
								content="Edit Song"
								v-tippy
							>
								<i class="material-icons">edit</i>
							</button>
							<confirm
								placement="left"
								@confirm="unverify(song._id)"
							>
								<button
									class="button is-danger"
									content="Unverify Song"
									v-tippy
								>
									<i class="material-icons">cancel</i>
								</button>
							</confirm>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<edit-song v-if="modals.editSong" song-type="songs" />
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div>
						<span class="biggest"
							><b>Keyboard shortcuts helper</b></span
						>
						<span
							><b>Ctrl + /</b> - Toggles this keyboard shortcuts
							helper</span
						>
						<span
							><b>Ctrl + Shift + /</b> - Resets the position of
							this keyboard shortcuts helper</span
						>
						<hr />
					</div>
					<!-- <div>
						<span class="biggest"><b>Songs page</b></span>
						<span
							><b>Arrow keys up/down</b> - Moves between
							songs</span
						>
						<span><b>E</b> - Edit selected song</span>
						<span><b>A</b> - Add selected song</span>
						<span><b>X</b> - Delete selected song</span>
						<hr />
					</div> -->
					<div>
						<span class="biggest"><b>Edit song modal</b></span>
						<span class="bigger"><b>Navigation</b></span>
						<span><b>Home</b> - Edit</span>
						<span><b>End</b> - Edit</span>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Player controls</b></span>
						<span class="bigger"
							><i>Don't forget to turn off numlock!</i></span
						>
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
					</div>
					<div>
						<span class="bigger"><b>Form control</b></span>
						<span
							><b>Enter</b> - Executes blue button in that
							input</span
						>
						<span
							><b>Shift + Enter</b> - Executes purple/red button
							in that input</span
						>
						<span
							><b>Ctrl + Alt + D</b> - Fill in all Discogs
							fields</span
						>
						<hr />
					</div>
					<div>
						<span class="bigger"><b>Modal control</b></span>
						<span><b>Ctrl + S</b> - Save</span>
						<span><b>Ctrl + Alt + S</b> - Save and close</span>
						<span
							><b>Ctrl + Alt + V</b> - Save, verify and
							close</span
						>
						<span><b>F4</b> - Close without saving</span>
						<hr />
					</div>
				</div>
			</template>
		</floating-box>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";

import keyboardShortcuts from "@/keyboardShortcuts";

import UserIdToUsername from "@/components/UserIdToUsername.vue";
import FloatingBox from "@/components/FloatingBox.vue";
import Confirm from "@/components/Confirm.vue";

import ScrollAndFetchHandler from "@/mixins/ScrollAndFetchHandler.vue";

import ws from "@/ws";

export default {
	components: {
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		UserIdToUsername,
		FloatingBox,
		Confirm
	},
	mixins: [ScrollAndFetchHandler],
	data() {
		return {
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
			modals: state => state.modals
		}),
		...mapState("admin/verifiedSongs", {
			songs: state => state.songs
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		"modals.editSong": function(val) {
			if (!val) this.stopVideo();
		}
	},
	mounted() {
		this.socket.on("event:admin.verifiedSong.created", res => {
			this.addSong(res.data.song);
			console.log("created");
		});

		this.socket.on("event:admin.verifiedSong.deleted", res =>
			this.removeSong(res.data.songId)
		);

		this.socket.on("event:admin.verifiedSong.updated", res =>
			this.updateSong(res.data.song)
		);

		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());

		if (this.$route.query.songId) {
			this.socket.dispatch(
				"songs.getSongFromSongId",
				this.$route.query.songId,
				res => {
					if (res.status === "success") this.edit(res.data.song);
					else new Toast("Song with that ID not found");
				}
			);
		}

		keyboardShortcuts.registerShortcut(
			"verifiedSongs.toggleKeyboardShortcutsHelper",
			{
				keyCode: 191, // '/' key
				ctrl: true,
				preventDefault: true,
				handler: () => {
					this.toggleKeyboardShortcutsHelper();
				}
			}
		);

		keyboardShortcuts.registerShortcut(
			"verifiedSongs.resetKeyboardShortcutsHelper",
			{
				keyCode: 191, // '/' key
				ctrl: true,
				shift: true,
				preventDefault: true,
				handler: () => {
					this.resetKeyboardShortcutsHelper();
				}
			}
		);
	},
	beforeUnmount() {
		const shortcutNames = [
			"verifiedSongs.toggleKeyboardShortcutsHelper",
			"verifiedSongs.resetKeyboardShortcutsHelper"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		edit(song) {
			this.editSong(song);
			this.openModal("editSong");
		},
		unverify(id) {
			this.socket.dispatch("songs.unverify", id, res => {
				new Toast(res.message);
			});
		},
		updateAllSongs() {
			new Toast("Updating all songs, this could take a very long time.");
			this.socket.dispatch("songs.updateAll", res => {
				if (res.status === "success") new Toast(res.message);
				else new Toast(res.message);
			});
		},
		getSet() {
			if (this.isGettingSet) return;
			if (this.position >= this.maxPosition) return;
			this.isGettingSet = true;

			this.socket.dispatch(
				"songs.getSet",
				this.position,
				"verified",
				res => {
					if (res.status === "success") {
						res.data.songs.forEach(song => {
							this.addSong(song);
						});

						this.position += 1;
						this.isGettingSet = false;
					}
				}
			);
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
			this.position = 1;
			this.maxPosition = 1;
			this.resetSongs();

			if (this.songs.length > 0)
				this.position = Math.ceil(this.songs.length / 15) + 1;

			this.socket.dispatch("songs.length", "verified", res => {
				if (res.status === "success") {
					this.maxPosition = Math.ceil(res.data.length / 15) + 1;
					this.getSet();
				}
			});

			this.socket.dispatch("apis.joinAdminRoom", "songs", () => {});
		},
		...mapActions("admin/verifiedSongs", [
			// "stopVideo",
			"resetSongs",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals/editSong", ["editSong", "stopVideo"]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
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

	& > div {
		display: inline-flex;
	}
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
