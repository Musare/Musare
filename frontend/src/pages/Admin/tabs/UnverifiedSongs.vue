<template>
	<div>
		<metadata title="Admin | Unverified songs" />
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
			<button
				class="button is-primary"
				@click="toggleKeyboardShortcutsHelper"
				@dblclick="resetKeyboardShortcutsHelper"
			>
				Keyboard shortcuts helper
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
					<tr
						v-for="(song, index) in filteredSongs"
						:key="index"
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
								@click="edit(song, index)"
								content="Edit Song"
								v-tippy
							>
								<i class="material-icons">edit</i>
							</button>
							<button
								class="button is-success"
								@click="verify(song)"
								content="Verify Song"
								v-tippy
							>
								<i class="material-icons">check_circle</i>
							</button>
							<tippy
								interactive="true"
								placement="top"
								theme="confirm"
								trigger="click"
							>
								<template #trigger>
									<button
										class="button is-danger"
										content="Hide Song"
										v-tippy
									>
										<i class="material-icons"
											>visibility_off</i
										>
									</button>
								</template>
								<a @click="hide(song._id, index)"> Confirm</a>
							</tippy>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<edit-song v-if="modals.editSong" />
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div>
						<span class="biggest"
							><b>Unverified songs page</b></span
						>
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

import Toast from "toasters";

import UserIdToUsername from "@/components/UserIdToUsername.vue";
import FloatingBox from "@/components/FloatingBox.vue";

import ScrollAndFetchHandler from "@/mixins/ScrollAndFetchHandler.vue";

import ws from "@/ws";

export default {
	components: {
		EditSong: () => import("@/components/modals/EditSong.vue"),
		UserIdToUsername,
		FloatingBox
	},
	mixins: [ScrollAndFetchHandler],
	data() {
		return {
			searchQuery: ""
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
		...mapState("modalVisibility", {
			modals: state => state.modals.admin
		}),
		...mapState("admin/unverifiedSongs", {
			songs: state => state.songs
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// eslint-disable-next-line func-names
		"modals.editSong": function(value) {
			if (value === false) this.stopVideo();
		}
	},
	mounted() {
		this.socket.on("event:admin.unverifiedSong.added", song => {
			this.addSong(song);
		});

		this.socket.on("event:admin.unverifiedSong.removed", songId => {
			this.removeSong(songId);
		});

		this.socket.on("event:admin.unverifiedSong.updated", updatedSong => {
			this.updateSong(updatedSong);
		});

		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());
	},
	methods: {
		edit(song) {
			this.editSong(song);
			this.openModal({ sector: "admin", modal: "editSong" });
		},
		verify(song) {
			this.socket.dispatch("songs.verify", song.songId, res => {
				new Toast(res.message);
			});
		},
		hide(id) {
			// eslint-disable-next-line
			const dialogResult = window.confirm(
				"Are you sure you want to hide this song?"
			);
			if (dialogResult !== true) return;
			this.socket.dispatch("songs.hide", id, res => {
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
				"unverified",
				data => {
					data.forEach(song => {
						this.addSong(song);
					});

					this.position += 1;
					this.isGettingSet = false;
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
		toggleKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.toggleBox();
		},
		resetKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.resetBox();
		},
		init() {
			if (this.songs.length > 0)
				this.position = Math.ceil(this.songs.length / 15) + 1;

			this.socket.dispatch("songs.length", "unverified", length => {
				this.maxPosition = Math.ceil(length / 15) + 1;

				this.getSet();
			});

			this.socket.dispatch(
				"apis.joinAdminRoom",
				"unverifiedSongs",
				() => {}
			);
		},
		...mapActions("admin/unverifiedSongs", [
			// "stopVideo",
			"addSong",
			"removeSong",
			"updateSong"
		]),
		...mapActions("modals/editSong", ["editSong", "stopVideo"]),
		...mapActions("modalVisibility", ["openModal"])
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
