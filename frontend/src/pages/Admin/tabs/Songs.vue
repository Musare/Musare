<template>
	<div>
		<page-metadata title="Admin | Songs" />
		<div class="admin-tab">
			<div class="button-row">
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
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="songs.getData"
				name="admin-songs"
				:events="events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="
								button
								is-primary
								icon-with-button
								material-icons
							"
							@click="editOne(slotProps.item)"
							:disabled="slotProps.item.removed"
							content="Edit Song"
							v-tippy
						>
							edit
						</button>
						<quick-confirm
							v-if="slotProps.item.status === 'verified'"
							@confirm="unverifyOne(slotProps.item._id)"
						>
							<button
								class="
									button
									is-danger
									icon-with-button
									material-icons
								"
								:disabled="slotProps.item.removed"
								content="Unverify Song"
								v-tippy
							>
								cancel
							</button>
						</quick-confirm>
						<button
							v-else
							class="
								button
								is-success
								icon-with-button
								material-icons
							"
							@click="verifyOne(slotProps.item._id)"
							:disabled="slotProps.item.removed"
							content="Verify Song"
							v-tippy
						>
							check_circle
						</button>
						<quick-confirm @confirm="deleteOne(slotProps.item._id)">
							<button
								class="
									button
									is-danger
									icon-with-button
									material-icons
								"
								content="Delete Song"
								v-tippy
							>
								delete_forever
							</button>
						</quick-confirm>
					</div>
				</template>
				<template #column-thumbnailImage="slotProps">
					<img
						class="song-thumbnail"
						:src="slotProps.item.thumbnail"
						onerror="this.src='/assets/notes-transparent.png'"
						loading="lazy"
					/>
				</template>
				<template #column-thumbnailUrl="slotProps">
					<a :href="slotProps.item.thumbnail" target="_blank">
						{{ slotProps.item.thumbnail }}
					</a>
				</template>
				<template #column-title="slotProps">
					<span :title="slotProps.item.title">{{
						slotProps.item.title
					}}</span>
				</template>
				<template #column-artists="slotProps">
					<span :title="slotProps.item.artists.join(', ')">{{
						slotProps.item.artists.join(", ")
					}}</span>
				</template>
				<template #column-genres="slotProps">
					<span :title="slotProps.item.genres.join(', ')">{{
						slotProps.item.genres.join(", ")
					}}</span>
				</template>
				<template #column-likes="slotProps">
					<span :title="slotProps.item.likes">{{
						slotProps.item.likes
					}}</span>
				</template>
				<template #column-dislikes="slotProps">
					<span :title="slotProps.item.dislikes">{{
						slotProps.item.dislikes
					}}</span>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
				<template #column-youtubeId="slotProps">
					<a
						:href="
							'https://www.youtube.com/watch?v=' +
							`${slotProps.item.youtubeId}`
						"
						target="_blank"
					>
						{{ slotProps.item.youtubeId }}
					</a>
				</template>
				<template #column-status="slotProps">
					<span :title="slotProps.item.status">{{
						slotProps.item.status
					}}</span>
				</template>
				<template #column-duration="slotProps">
					<span :title="slotProps.item.duration">{{
						slotProps.item.duration
					}}</span>
				</template>
				<template #column-skipDuration="slotProps">
					<span :title="slotProps.item.skipDuration">{{
						slotProps.item.skipDuration
					}}</span>
				</template>
				<template #column-requestedBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.requestedBy"
						:link="true"
					/>
				</template>
				<template #column-requestedAt="slotProps">
					<span :title="new Date(slotProps.item.requestedAt)">{{
						getDateFormatted(slotProps.item.requestedAt)
					}}</span>
				</template>
				<template #column-verifiedBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.verifiedBy"
						:link="true"
					/>
				</template>
				<template #column-verifiedAt="slotProps">
					<span :title="new Date(slotProps.item.verifiedAt)">{{
						getDateFormatted(slotProps.item.verifiedAt)
					}}</span>
				</template>
				<template #bulk-actions="slotProps">
					<div class="bulk-actions">
						<i
							class="material-icons edit-songs-icon"
							@click.prevent="editMany(slotProps.item)"
							content="Edit Songs"
							v-tippy
						>
							edit
						</i>
						<i
							class="material-icons verify-songs-icon"
							@click.prevent="verifyMany(slotProps.item)"
							content="Verify Songs"
							v-tippy
						>
							check_circle
						</i>
						<quick-confirm
							placement="left"
							@confirm="unverifyMany(slotProps.item)"
						>
							<i
								class="material-icons unverify-songs-icon"
								content="Unverify Songs"
								v-tippy
							>
								cancel
							</i>
						</quick-confirm>
						<i
							class="material-icons tag-songs-icon"
							@click.prevent="tagMany(slotProps.item)"
							content="Tag Songs"
							v-tippy
						>
							local_offer
						</i>
						<i
							class="material-icons artists-songs-icon"
							@click.prevent="setArtists(slotProps.item)"
							content="Set Artists"
							v-tippy
						>
							group
						</i>
						<i
							class="material-icons genres-songs-icon"
							@click.prevent="setGenres(slotProps.item)"
							content="Set Genres"
							v-tippy
						>
							theater_comedy
						</i>
						<quick-confirm
							placement="left"
							@confirm="deleteMany(slotProps.item)"
						>
							<i
								class="material-icons delete-icon"
								content="Delete Songs"
								v-tippy
							>
								delete_forever
							</i>
						</quick-confirm>
					</div>
				</template>
			</advanced-table>
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

import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import FloatingBox from "@/components/FloatingBox.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";

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
		AdvancedTable,
		UserIdToUsername,
		FloatingBox,
		QuickConfirm,
		RunJobDropdown
	},
	data() {
		return {
			columnDefault: {
				sortable: true,
				hidable: true,
				defaultVisibility: "shown",
				draggable: true,
				resizable: true,
				minWidth: 200,
				maxWidth: 600
			},
			columns: [
				{
					name: "options",
					displayName: "Options",
					properties: ["_id", "status", "removed"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 129,
					defaultWidth: 129
				},
				{
					name: "thumbnailImage",
					displayName: "Thumb",
					properties: ["thumbnail"],
					sortable: false,
					minWidth: 75,
					defaultWidth: 75,
					maxWidth: 75,
					resizable: false
				},
				{
					name: "title",
					displayName: "Title",
					properties: ["title"],
					sortProperty: "title"
				},
				{
					name: "artists",
					displayName: "Artists",
					properties: ["artists"],
					sortable: false
				},
				{
					name: "genres",
					displayName: "Genres",
					properties: ["genres"],
					sortable: false
				},
				{
					name: "likes",
					displayName: "Likes",
					properties: ["likes"],
					sortProperty: "likes",
					minWidth: 100,
					defaultWidth: 100,
					defaultVisibility: "hidden"
				},
				{
					name: "dislikes",
					displayName: "Dislikes",
					properties: ["dislikes"],
					sortProperty: "dislikes",
					minWidth: 100,
					defaultWidth: 100,
					defaultVisibility: "hidden"
				},
				{
					name: "_id",
					displayName: "Song ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 215,
					defaultWidth: 215
				},
				{
					name: "youtubeId",
					displayName: "YouTube ID",
					properties: ["youtubeId"],
					sortProperty: "youtubeId",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "status",
					displayName: "Status",
					properties: ["status"],
					sortProperty: "status",
					defaultVisibility: "hidden",
					minWidth: 120,
					defaultWidth: 120
				},
				{
					name: "thumbnailUrl",
					displayName: "Thumbnail (URL)",
					properties: ["thumbnail"],
					sortProperty: "thumbnail",
					defaultVisibility: "hidden"
				},
				{
					name: "duration",
					displayName: "Duration",
					properties: ["duration"],
					sortProperty: "duration",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "skipDuration",
					displayName: "Skip Duration",
					properties: ["skipDuration"],
					sortProperty: "skipDuration",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					properties: ["requestedBy"],
					sortProperty: "requestedBy",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "requestedAt",
					displayName: "Requested At",
					properties: ["requestedAt"],
					sortProperty: "requestedAt",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "verifiedBy",
					displayName: "Verified By",
					properties: ["verifiedBy"],
					sortProperty: "verifiedBy",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "verifiedAt",
					displayName: "Verified At",
					properties: ["verifiedAt"],
					sortProperty: "verifiedAt",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Song ID",
					property: "_id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "youtubeId",
					displayName: "YouTube ID",
					property: "youtubeId",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "title",
					displayName: "Title",
					property: "title",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "artists",
					displayName: "Artists",
					property: "artists",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains",
					autosuggest: true,
					autosuggestDataAction: "songs.getArtists"
				},
				{
					name: "genres",
					displayName: "Genres",
					property: "genres",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains",
					autosuggest: true,
					autosuggestDataAction: "songs.getGenres"
				},
				{
					name: "thumbnail",
					displayName: "Thumbnail",
					property: "thumbnail",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					property: "requestedBy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "requestedAt",
					displayName: "Requested At",
					property: "requestedAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				},
				{
					name: "verifiedBy",
					displayName: "Verified By",
					property: "verifiedBy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "verifiedAt",
					displayName: "Verified At",
					property: "verifiedAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				},
				{
					name: "status",
					displayName: "Status",
					property: "status",
					filterTypes: ["exact", "regex"],
					defaultFilterType: "exact",
					filterValues: ["verified", "unverified"]
				},
				{
					name: "likes",
					displayName: "Likes",
					property: "likes",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals",
						"exact",
						"regex"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "dislikes",
					displayName: "Dislikes",
					property: "dislikes",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals",
						"exact",
						"regex"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "duration",
					displayName: "Duration",
					property: "duration",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals",
						"exact",
						"regex"
					],
					defaultFilterType: "numberLesser"
				},
				{
					name: "skipDuration",
					displayName: "Skip Duration",
					property: "skipDuration",
					filterTypes: [
						"numberLesserEqual",
						"numberLesser",
						"numberGreater",
						"numberGreaterEqual",
						"numberEquals",
						"exact",
						"regex"
					],
					defaultFilterType: "numberLesser"
				}
			],
			events: {
				adminRoom: "songs",
				updated: {
					event: "admin.song.updated",
					id: "song._id",
					item: "song"
				},
				removed: {
					event: "admin.song.removed",
					id: "songId"
				}
			},
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
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapState("modals/editSong", {
			song: state => state.song
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (this.$route.query.songId) {
			this.socket.dispatch(
				"songs.getSongFromSongId",
				this.$route.query.songId,
				res => {
					if (res.status === "success")
						this.editMany([res.data.song]);
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
		editOne(song) {
			this.editSong(song);
			this.openModal("editSong");
		},
		editMany(selectedRows) {
			if (selectedRows.length === 1) {
				this.editSong(selectedRows[0]);
				this.openModal("editSong");
			} else {
				new Toast("Bulk editing not yet implemented.");
			}
		},
		verifyOne(songId) {
			this.socket.dispatch("songs.verify", songId, res => {
				new Toast(res.message);
			});
		},
		verifyMany(selectedRows) {
			this.socket.dispatch(
				"songs.verifyMany",
				selectedRows.map(row => row._id),
				res => {
					new Toast(res.message);
				}
			);
		},
		unverifyOne(songId) {
			this.socket.dispatch("songs.unverify", songId, res => {
				new Toast(res.message);
			});
		},
		unverifyMany(selectedRows) {
			this.socket.dispatch(
				"songs.unverifyMany",
				selectedRows.map(row => row._id),
				res => {
					new Toast(res.message);
				}
			);
		},
		tagMany() {
			new Toast("Bulk tagging not yet implemented.");
		},
		setArtists() {
			new Toast("Bulk setting artists not yet implemented.");
		},
		setGenres() {
			new Toast("Bulk setting genres not yet implemented.");
		},
		deleteOne(songId) {
			this.socket.dispatch("songs.remove", songId, res => {
				new Toast(res.message);
			});
		},
		deleteMany(selectedRows) {
			this.socket.dispatch(
				"songs.removeMany",
				selectedRows.map(row => row._id),
				res => {
					new Toast(res.message);
				}
			);
		},
		toggleKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.toggleBox();
		},
		resetKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.resetBox();
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
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
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

.song-thumbnail {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}

.bulk-popup .bulk-actions {
	.verify-songs-icon {
		color: var(--green);
	}
	.unverify-songs-icon {
		color: var(--dark-red);
	}
}
</style>
