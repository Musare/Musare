<template>
	<div>
		<page-metadata title="Admin | Hidden songs" />
		<div class="container">
			<div class="button-row">
				<button
					v-if="!loadAllSongs"
					class="button is-primary"
					@click="loadAll()"
				>
					Load all sets
				</button>
				<button
					class="button is-primary"
					@click="toggleKeyboardShortcutsHelper"
					@dblclick="resetKeyboardShortcutsHelper"
				>
					Keyboard shortcuts helper
				</button>
				<button
					class="button is-primary"
					@click="openModal('requestSong')"
				>
					Request song
				</button>
			</div>
			<br />
			<div class="box">
				<p @click="toggleSearchBox()">
					Search<i class="material-icons" v-show="searchBoxShown"
						>expand_more</i
					>
					<i class="material-icons" v-show="!searchBoxShown"
						>expand_less</i
					>
				</p>
				<input
					v-model="searchQuery"
					type="text"
					class="input"
					placeholder="Search for Songs"
					v-show="searchBoxShown"
				/>
			</div>
			<div class="box">
				<p @click="toggleFilterArtistsBox()">
					Filter artists<i
						class="material-icons"
						v-show="filterArtistBoxShown"
						>expand_more</i
					>
					<i class="material-icons" v-show="!filterArtistBoxShown"
						>expand_less</i
					>
				</p>
				<input
					type="text"
					class="input"
					placeholder="Filter artist checkboxes"
					v-model="artistFilterQuery"
					v-show="filterArtistBoxShown"
				/>
				<label
					v-for="artist in filteredArtists"
					:key="artist"
					v-show="filterArtistBoxShown"
				>
					<input
						type="checkbox"
						:checked="artistFilterSelected.indexOf(artist) !== -1"
						@click="toggleArtistSelected(artist)"
					/>
					<span>{{ artist }}</span>
				</label>
			</div>
			<div class="box">
				<p @click="toggleFilterGenresBox()">
					Filter genres<i
						class="material-icons"
						v-show="filterGenreBoxShown"
						>expand_more</i
					>
					<i class="material-icons" v-show="!filterGenreBoxShown"
						>expand_less</i
					>
				</p>
				<input
					type="text"
					class="input"
					placeholder="Filter genre checkboxes"
					v-model="genreFilterQuery"
					v-show="filterGenreBoxShown"
				/>
				<label
					v-for="genre in filteredGenres"
					:key="genre"
					v-show="filterGenreBoxShown"
				>
					<input
						type="checkbox"
						:checked="genreFilterSelected.indexOf(genre) !== -1"
						@click="toggleGenreSelected(genre)"
					/>
					<span>{{ genre }}</span>
				</label>
			</div>
			<p>
				<span>Sets loaded: {{ setsLoaded }} / {{ maxSets }}</span>
				<br />
				<span>Loaded songs: {{ songs.length }}</span>
			</p>
			<br />
			<table class="table">
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
					<tr
						v-for="(song, index) in filteredSongs"
						:key="song._id"
						tabindex="0"
						@keydown.up.prevent
						@keydown.down.prevent
						@keyup.up="selectPrevious($event)"
						@keyup.down="selectNext($event)"
						@keyup.e="edit(song, index)"
						@keyup.a="add(song)"
						@keyup.x="remove(song._id, index)"
					>
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
							<div>
								<button
									class="button is-primary"
									@click="edit(song, index)"
									content="Edit Song"
									v-tippy
								>
									<i class="material-icons">edit</i>
								</button>
								<button
									class="button is-success"
									@click="unhide(song._id)"
									content="Unhide Song"
									v-tippy
								>
									<i class="material-icons">visibility</i>
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<import-album v-if="modals.importAlbum" />
		<edit-song v-if="modals.editSong" song-type="songs" :key="song._id" />
		<report v-if="modals.report" />
		<request-song v-if="modals.requestSong" />
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div>
						<span class="biggest"><b>Hidden songs page</b></span>
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
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";

import UserIdToUsername from "@/components/UserIdToUsername.vue";
import FloatingBox from "@/components/FloatingBox.vue";

import ScrollAndFetchHandler from "@/mixins/ScrollAndFetchHandler.vue";

import ws from "@/ws";

export default {
	components: {
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		ImportAlbum: defineAsyncComponent(() =>
			import("@/components/modals/ImportAlbum.vue")
		),
		RequestSong: defineAsyncComponent(() =>
			import("@/components/modals/RequestSong.vue")
		),
		UserIdToUsername,
		FloatingBox
	},
	mixins: [ScrollAndFetchHandler],
	data() {
		return {
			searchQuery: "",
			artistFilterQuery: "",
			artistFilterSelected: [],
			genreFilterQuery: "",
			genreFilterSelected: [],
			searchBoxShown: true,
			filterArtistBoxShown: false,
			filterGenreBoxShown: false
		};
	},
	computed: {
		filteredSongs() {
			return this.songs.filter(
				song =>
					JSON.stringify(Object.values(song))
						.toLowerCase()
						.indexOf(this.searchQuery.toLowerCase()) !== -1 &&
					(this.artistFilterSelected.length === 0 ||
						song.artists.some(
							artist =>
								this.artistFilterSelected
									.map(artistFilterSelected =>
										artistFilterSelected.toLowerCase()
									)
									.indexOf(artist.toLowerCase()) !== -1
						)) &&
					(this.genreFilterSelected.length === 0 ||
						song.genres.some(
							genre =>
								this.genreFilterSelected
									.map(genreFilterSelected =>
										genreFilterSelected.toLowerCase()
									)
									.indexOf(genre.toLowerCase()) !== -1
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
						artist
							.toLowerCase()
							.indexOf(this.artistFilterQuery.toLowerCase()) !==
							-1
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
						genre
							.toLowerCase()
							.indexOf(this.genreFilterQuery.toLowerCase()) !== -1
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
		...mapState("admin/hiddenSongs", {
			songs: state => state.songs
		}),
		...mapState("modals/editSong", {
			song: state => state.song
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on("event:admin.hiddenSong.created", res => {
			console.log("CREATED");
			this.addSong(res.data.song);
		});

		this.socket.on("event:admin.hiddenSong.deleted", res => {
			this.removeSong(res.data.songId);
		});

		this.socket.on("event:admin.hiddenSong.updated", res => {
			this.updateSong(res.data.song);
		});
	},
	methods: {
		edit(song) {
			this.editSong(song);
			this.openModal("editSong");
		},
		unhide(id) {
			this.socket.dispatch("songs.unhide", id, res => {
				new Toast(res.message);
			});
		},
		getSet() {
			if (this.isGettingSet) return;
			if (this.position >= this.maxPosition) return;
			this.isGettingSet = true;

			this.socket.dispatch(
				"songs.getSet",
				this.position,
				"hidden",
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
		selectPrevious(event) {
			if (event.srcElement.previousElementSibling)
				event.srcElement.previousElementSibling.focus();
		},
		selectNext(event) {
			if (event.srcElement.nextElementSibling)
				event.srcElement.nextElementSibling.focus();
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
		toggleSearchBox() {
			this.searchBoxShown = !this.searchBoxShown;
		},
		toggleFilterArtistsBox() {
			this.filterArtistBoxShown = !this.filterArtistBoxShown;
		},
		toggleFilterGenresBox() {
			this.filterGenreBoxShown = !this.filterGenreBoxShown;
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

			this.socket.dispatch("songs.length", "hidden", res => {
				if (res.status === "success") {
					this.maxPosition = Math.ceil(res.data.length / 15) + 1;
					return this.getSet();
				}
				return new Toast(`Error: ${res.mesage}`);
			});

			this.socket.dispatch("apis.joinAdminRoom", "hiddenSongs");
		},
		...mapActions("admin/hiddenSongs", [
			"resetSongs",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.box {
		background-color: var(--dark-grey-3) !important;
	}

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

.box {
	background-color: var(--light-grey);
	border-radius: 5px;
	padding: 8px 16px;

	p {
		text-align: center;
		font-size: 24px;
		user-select: none;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	input[type="text"] {
		margin-top: 8px;
		margin-bottom: 8px;
	}

	label {
		margin-right: 8px;
		display: inline-flex;
		align-items: center;

		input[type="checkbox"] {
			margin-right: 2px;
			height: 16px;
			width: 16px;
		}
	}
}

.optionsColumn {
	width: 140px;

	div {
		button {
			width: 35px;

			&:not(:last-child) {
				margin-right: 5px;
			}
		}
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
