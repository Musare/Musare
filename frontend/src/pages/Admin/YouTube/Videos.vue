<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube | Videos" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>YouTube Videos</h1>
				<p>Manage YouTube video cache</p>
			</div>
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			:events="events"
			data-action="youtube.getVideos"
			name="admin-youtube-videos"
			:max-width="1140"
			:bulk-actions="{ width: 150 }"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'viewYoutubeVideo',
								data: {
									videoId: slotProps.item._id
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="View Video"
						v-tippy
					>
						open_in_full
					</button>
					<button
						class="button is-primary icon-with-button material-icons"
						@click="editOne(slotProps.item)"
						:disabled="slotProps.item.removed"
						content="Create/edit song from video"
						v-tippy
					>
						music_note
					</button>
					<button
						class="button is-danger icon-with-button material-icons"
						@click.prevent="
							confirmAction({
								message:
									'Removing this video will remove it from all playlists and cause a ratings recalculation.',
								action: 'removeVideos',
								params: slotProps.item._id
							})
						"
						:disabled="slotProps.item.removed"
						content="Delete Video"
						v-tippy
					>
						delete_forever
					</button>
				</div>
			</template>
			<template #column-thumbnailImage="slotProps">
				<song-thumbnail class="song-thumbnail" :song="slotProps.item" />
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
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
			<template #column-title="slotProps">
				<span :title="slotProps.item.title">{{
					slotProps.item.title
				}}</span>
			</template>
			<template #column-author="slotProps">
				<span :title="slotProps.item.author">{{
					slotProps.item.author
				}}</span>
			</template>
			<template #column-duration="slotProps">
				<span :title="slotProps.item.duration">{{
					slotProps.item.duration
				}}</span>
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt)">{{
					getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
			<template #bulk-actions="slotProps">
				<div class="bulk-actions">
					<i
						class="material-icons create-songs-icon"
						@click.prevent="editMany(slotProps.item)"
						content="Create/edit songs from videos"
						v-tippy
						tabindex="0"
					>
						music_note
					</i>
					<i
						class="material-icons import-album-icon"
						@click.prevent="importAlbum(slotProps.item)"
						content="Import album from videos"
						v-tippy
						tabindex="0"
					>
						album
					</i>
					<i
						class="material-icons delete-icon"
						@click.prevent="
							confirmAction({
								message:
									'Removing these videos will remove them from all playlists and cause a ratings recalculation.',
								action: 'removeVideos',
								params: slotProps.item.map(video => video._id)
							})
						"
						content="Delete Videos"
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
import { mapActions, mapGetters } from "vuex";

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
					properties: ["_id"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 129,
					defaultWidth: 129
				},
				{
					name: "thumbnailImage",
					displayName: "Thumb",
					properties: ["youtubeId"],
					sortable: false,
					minWidth: 75,
					defaultWidth: 75,
					maxWidth: 75,
					resizable: false
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
					name: "_id",
					displayName: "Video ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 215,
					defaultWidth: 215
				},
				{
					name: "title",
					displayName: "Title",
					properties: ["title"],
					sortProperty: "title"
				},
				{
					name: "author",
					displayName: "Author",
					properties: ["author"],
					sortProperty: "author"
				},
				{
					name: "duration",
					displayName: "Duration",
					properties: ["duration"],
					sortProperty: "duration",
					defaultWidth: 200
				},
				{
					name: "createdAt",
					displayName: "Created At",
					properties: ["createdAt"],
					sortProperty: "createdAt",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Video ID",
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
					name: "author",
					displayName: "Author",
					property: "author",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
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
					name: "createdAt",
					displayName: "Created At",
					property: "createdAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				},
				{
					name: "importJob",
					displayName: "Import job",
					property: "importJob",
					filterTypes: ["special"],
					defaultFilterType: "special"
				}
			],
			events: {
				adminRoom: "youtubeVideos",
				updated: {
					event: "admin.youtubeVideo.updated",
					id: "youtubeVideo._id",
					item: "youtubeVideo"
				},
				removed: {
					event: "admin.youtubeVideo.removed",
					id: "videoId"
				}
			},
			jobs: [
				{
					name: "Recalculate all ratings",
					socket: "media.recalculateAllRatings"
				}
			]
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
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
		importAlbum(selectedRows) {
			const songs = selectedRows.map(
				({ youtubeId, title, author, duration }) => ({
					youtubeId,
					title,
					artists: [author],
					duration
				})
			);
			this.openModal({ modal: "importAlbum", data: { songs } });
		},
		removeVideos(videoIds) {
			this.socket.dispatch(
				"youtube.removeVideos",
				videoIds,
				res => new Toast(res.message)
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
</style>
