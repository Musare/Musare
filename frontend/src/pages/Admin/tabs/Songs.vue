<template>
	<div>
		<page-metadata title="Admin | Songs" />
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
				<button
					class="button is-primary"
					@click="openModal('importAlbum')"
				>
					Import album
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
			<br />
			<div class="box">
				<p @click="toggleSearchBox()">
					Search
					<i class="material-icons" v-show="searchBoxShown"
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
							<div>
								<button
									class="button is-primary"
									@click="edit(song)"
									content="Edit Song"
									v-tippy
								>
									<i class="material-icons">edit</i>
								</button>
								<button
									v-if="song.status !== 'verified'"
									class="button is-success"
									@click="verify(song._id)"
									content="Verify Song"
									v-tippy
								>
									<i class="material-icons">check_circle</i>
								</button>
								<confirm
									v-if="song.status === 'verified'"
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
								<confirm
									v-if="song.status !== 'hidden'"
									placement="left"
									@confirm="hide(song._id)"
								>
									<button
										class="button is-danger"
										content="Hide Song"
										v-tippy
									>
										<i class="material-icons"
											>visibility_off</i
										>
									</button>
								</confirm>
								<button
									v-if="song.status === 'hidden'"
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
import RunJobDropdown from "@/components/RunJobDropdown.vue";

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
		FloatingBox,
		Confirm,
		RunJobDropdown
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
			},
			searchBoxShown: true,
			filterArtistBoxShown: false,
			filterGenreBoxShown: false,
			jobs: [
				{
					name: "Update all songs",
					socket: "songs.updateAll"
				},
				{
					name: "Recalculate all song ratings",
					socket: "songs.recalculateAllRatings"
				}
			]
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
		...mapState("admin/songs", {
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

		this.socket.on("event:admin.song.updated", res => {
			const { song } = res.data;
			if (this.songs.filter(s => s._id === song._id).length === 0)
				this.addSong(song);
			else this.updateSong(song);
		});

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
			"songs.toggleKeyboardShortcutsHelper",
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
			"songs.resetKeyboardShortcutsHelper",
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
			"songs.toggleKeyboardShortcutsHelper",
			"songs.resetKeyboardShortcutsHelper"
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
		verify(id) {
			this.socket.dispatch("songs.verify", id, res => {
				new Toast(res.message);
			});
		},
		unverify(id) {
			this.socket.dispatch("songs.unverify", id, res => {
				new Toast(res.message);
			});
		},
		hide(id) {
			this.socket.dispatch("songs.hide", id, res => {
				new Toast(res.message);
			});
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

			this.socket.dispatch("songs.getSet", this.position, res => {
				if (res.status === "success") {
					res.data.songs.forEach(song => {
						this.addSong(song);
					});

					this.position += 1;
					this.isGettingSet = false;
				}
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

			this.socket.dispatch("songs.length", res => {
				if (res.status === "success") {
					this.maxPosition = Math.ceil(res.data.length / 15) + 1;
					this.getSet();
				}
			});

			this.socket.dispatch("apis.joinAdminRoom", "songs", () => {});
		},
		...mapActions("admin/songs", [
			"resetSongs",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
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
	width: 100px;

	div {
		button {
			width: 35px;
		}
		> button,
		> span {
			&:not(:last-child) {
				margin-right: 5px;
			}
		}
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
		color: var(--dark-red) !important;
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
