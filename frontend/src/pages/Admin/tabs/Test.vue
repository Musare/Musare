<template>
	<div>
		<page-metadata title="Admin | Test" />
		<div class="admin-container">
			<advanced-table
				:columns="columns"
				:filters="filters"
				data-action="songs.getData"
			>
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
				<template #column-_id="slotProps">
					{{ slotProps.item._id }}
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
				<template #column-title="slotProps">
					{{ slotProps.item.title }}
				</template>
				<template #column-artists="slotProps">
					{{ slotProps.item.artists.join(", ") }}
				</template>
				<template #column-genres="slotProps">
					{{ slotProps.item.genres.join(", ") }}
				</template>
				<template #column-requestedBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.requestedBy"
						:link="true"
					/>
				</template>
			</advanced-table>
		</div>
	</div>
</template>

<script>
import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		AdvancedTable,
		UserIdToUsername
	},
	data() {
		return {
			columns: [
				{
					name: "thumbnailImage",
					displayName: "Thumb",
					properties: ["thumbnail"],
					sortable: false,
					hidable: true,
					defaultVisibility: "shown",
					width: "50px",
					draggable: true
				},
				{
					name: "_id",
					displayName: "Musare ID",
					properties: ["_id"],
					sortable: true,
					sortProperty: "_id",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				},
				{
					name: "youtubeId",
					displayName: "YouTube ID",
					properties: ["youtubeId"],
					sortable: true,
					sortProperty: "youtubeId",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				},
				{
					name: "title",
					displayName: "Title",
					properties: ["title"],
					sortable: true,
					sortProperty: "title",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				},
				{
					name: "artists",
					displayName: "Artists",
					properties: ["artists"],
					sortable: false,
					sortProperty: "artists",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				},
				{
					name: "genres",
					displayName: "Genres",
					properties: ["genres"],
					sortable: false,
					sortProperty: "genres",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				},
				{
					name: "thumbnailUrl",
					displayName: "Thumbnail (URL)",
					properties: ["thumbnail"],
					sortable: true,
					sortProperty: "thumbnail",
					hidable: true,
					defaultVisibility: "hidden",
					draggable: true
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					properties: ["requestedBy"],
					sortable: true,
					sortProperty: "requestedBy",
					hidable: true,
					defaultVisibility: "shown",
					draggable: true
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Musare ID",
					type: "regex"
				},
				{
					name: "youtubeId",
					displayName: "YouTube ID",
					type: "regex"
				},
				{
					name: "title",
					displayName: "Title",
					type: "regex"
				},
				{
					name: "artists",
					displayName: "Artists",
					type: "regex"
				},
				{
					name: "genres",
					displayName: "Genres",
					type: "regex"
				},
				{
					name: "thumbnailUrl",
					displayName: "Thumbnail (URL)",
					type: "regex"
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					type: "regex"
				}
			]
		};
	},
	mounted() {},
	beforeUnmount() {},
	methods: {}
};
</script>

<style lang="scss" scoped>
.admin-container {
	max-width: 1900px;
	margin: 0 auto;
	padding: 0 10px;
}

.song-thumbnail {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}
</style>
