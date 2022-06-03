<template>
	<div class="admin-tab">
		<page-metadata title="Admin | Songs" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Songs</h1>
				<p>Create, edit and manage songs in the catalogue</p>
			</div>
			<div class="button-row">
				<button class="button is-primary" @click="create()">
					Create song
				</button>
				<button
					class="button is-primary"
					@click="openModal('importAlbum')"
				>
					Import album
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
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
						class="button is-primary icon-with-button material-icons"
						@click="editOne(slotProps.item)"
						:disabled="slotProps.item.removed"
						content="Edit Song"
						v-tippy
					>
						edit
					</button>
					<quick-confirm
						v-if="slotProps.item.verified"
						@confirm="unverifyOne(slotProps.item._id)"
					>
						<button
							class="button is-danger icon-with-button material-icons"
							:disabled="slotProps.item.removed"
							content="Unverify Song"
							v-tippy
						>
							cancel
						</button>
					</quick-confirm>
					<button
						v-else
						class="button is-success icon-with-button material-icons"
						@click="verifyOne(slotProps.item._id)"
						:disabled="slotProps.item.removed"
						content="Verify Song"
						v-tippy
					>
						check_circle
					</button>
					<button
						class="button is-danger icon-with-button material-icons"
						@click.prevent="
							confirmAction({
								message:
									'Removing this song will remove it from all playlists and cause a ratings recalculation.',
								action: 'deleteOne',
								params: slotProps.item._id
							})
						"
						:disabled="slotProps.item.removed"
						content="Delete Song"
						v-tippy
					>
						delete_forever
					</button>
				</div>
			</template>
			<template #column-thumbnailImage="slotProps">
				<song-thumbnail class="song-thumbnail" :song="slotProps.item" />
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
			<template #column-tags="slotProps">
				<span :title="slotProps.item.tags.join(', ')">{{
					slotProps.item.tags.join(", ")
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
			<template #column-verified="slotProps">
				<span :title="slotProps.item.verified">{{
					slotProps.item.verified
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
				<user-link :user-id="slotProps.item.requestedBy" />
			</template>
			<template #column-requestedAt="slotProps">
				<span :title="new Date(slotProps.item.requestedAt)">{{
					getDateFormatted(slotProps.item.requestedAt)
				}}</span>
			</template>
			<template #column-verifiedBy="slotProps">
				<user-link :user-id="slotProps.item.verifiedBy" />
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
						tabindex="0"
					>
						edit
					</i>
					<i
						class="material-icons verify-songs-icon"
						@click.prevent="verifyMany(slotProps.item)"
						content="Verify Songs"
						v-tippy
						tabindex="0"
					>
						check_circle
					</i>
					<quick-confirm
						placement="left"
						@confirm="unverifyMany(slotProps.item)"
						tabindex="0"
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
						@click.prevent="setTags(slotProps.item)"
						content="Set Tags"
						v-tippy
						tabindex="0"
					>
						local_offer
					</i>
					<i
						class="material-icons artists-songs-icon"
						@click.prevent="setArtists(slotProps.item)"
						content="Set Artists"
						v-tippy
						tabindex="0"
					>
						group
					</i>
					<i
						class="material-icons genres-songs-icon"
						@click.prevent="setGenres(slotProps.item)"
						content="Set Genres"
						v-tippy
						tabindex="0"
					>
						theater_comedy
					</i>
					<i
						class="material-icons delete-icon"
						@click.prevent="
							confirmAction({
								message:
									'Removing these songs will remove them from all playlists and cause a ratings recalculation.',
								action: 'deleteMany',
								params: slotProps.item
							})
						"
						content="Delete Songs"
						v-tippy
						tabindex="0"
					>
						delete_forever
					</i>
				</div>
			</template>
		</advanced-table>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";

import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";

export default {
	components: {
		AdvancedTable,
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
					properties: ["_id", "verified"],
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
					name: "tags",
					displayName: "Tags",
					properties: ["tags"],
					sortable: false
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
					name: "verified",
					displayName: "Verified",
					properties: ["verified"],
					sortProperty: "verified",
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
					name: "tags",
					displayName: "Tags",
					property: "tags",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains",
					autosuggest: true,
					autosuggestDataAction: "songs.getTags"
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
					name: "verified",
					displayName: "Verified",
					property: "verified",
					filterTypes: ["boolean"],
					defaultFilterType: "boolean"
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
						"numberEquals"
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
						"numberEquals"
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
					name: "Recalculate all ratings",
					socket: "ratings.recalculateAll"
				}
			]
		};
	},
	computed: {
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
	},
	methods: {
		create() {
			this.openModal({
				modal: "editSong",
				data: { song: { newSong: true } }
			});
		},
		editOne(song) {
			this.openModal({
				modal: "editSong",
				data: { song }
			});
		},
		editMany(selectedRows) {
			if (selectedRows.length === 1) this.editOne(selectedRows[0]);
			else {
				const songs = selectedRows.map(row => ({
					youtubeId: row.youtubeId
				}));
				this.openModal({ modal: "editSongs", data: { songs } });
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
		setTags(selectedRows) {
			this.openModal({
				modal: "bulkActions",
				data: {
					type: {
						name: "tags",
						action: "songs.editTags",
						items: selectedRows.map(row => row._id),
						regex: /^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/,
						autosuggest: true,
						autosuggestDataAction: "songs.getTags"
					}
				}
			});
		},
		setArtists(selectedRows) {
			this.openModal({
				modal: "bulkActions",
				data: {
					type: {
						name: "artists",
						action: "songs.editArtists",
						items: selectedRows.map(row => row._id),
						regex: /^(?=.{1,64}$).*$/,
						autosuggest: true,
						autosuggestDataAction: "songs.getArtists"
					}
				}
			});
		},
		setGenres(selectedRows) {
			this.openModal({
				modal: "bulkActions",
				data: {
					type: {
						name: "genres",
						action: "songs.editGenres",
						items: selectedRows.map(row => row._id),
						regex: /^[\x00-\x7F]{1,32}$/,
						autosuggest: true,
						autosuggestDataAction: "songs.getGenres"
					}
				}
			});
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
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		confirmAction({ message, action, params }) {
			this.openModal({
				modal: "confirm",
				data: {
					message,
					action,
					params,
					onCompleted: this.handleConfirmed
				}
			});
		},
		handleConfirmed({ action, params }) {
			if (typeof this[action] === "function") {
				if (params) this[action](params);
				else this[action]();
			}
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="less" scoped>
:deep(.song-thumbnail) {
	width: 50px;
	height: 50px;
	min-width: 50px;
	min-height: 50px;
	margin: 0 auto;
}

:deep(.bulk-popup .bulk-actions) {
	.verify-songs-icon {
		color: var(--green);
	}
	& > span {
		position: relative;
		top: 6px;
		margin-left: 5px;
		height: 25px;
		& > div {
			height: 25px;
			& > .unverify-songs-icon {
				color: var(--dark-red);
				top: unset;
				margin-left: unset;
			}
		}
	}
}
</style>