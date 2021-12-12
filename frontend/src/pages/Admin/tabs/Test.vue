<template>
	<div>
		<page-metadata title="Admin | Test" />
		<div class="admin-container">
			<advanced-table
				:column-default="columnDefault"
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
				<template #column-requestedBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.requestedBy"
						:link="true"
					/>
				</template>
				<!-- <template #bulk-actions="slotProps">
					A {{ slotProps.item.length }}
				</template>
				<template #bulk-actions-right="slotProps">
					B {{ slotProps.item.length }}
				</template> -->
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
					name: "thumbnailImage",
					displayName: "Thumb",
					properties: ["thumbnail"],
					minWidth: 120,
					width: 120,
					maxWidth: 120,
					resizable: false
				},
				{
					name: "_id",
					displayName: "Musare ID",
					properties: ["_id"],
					sortProperty: "_id",
					width: 220
				},
				{
					name: "youtubeId",
					displayName: "YouTube ID",
					properties: ["youtubeId"],
					sortProperty: "youtubeId",
					minWidth: 155,
					width: 155
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
					name: "thumbnailUrl",
					displayName: "Thumbnail (URL)",
					properties: ["thumbnail"],
					sortProperty: "thumbnail",
					defaultVisibility: "hidden"
				},
				{
					name: "requestedBy",
					displayName: "Requested By",
					properties: ["requestedBy"],
					sortProperty: "requestedBy",
					width: 200
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Musare ID",
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
					defaultFilterType: "contains"
				},
				{
					name: "genres",
					displayName: "Genres",
					property: "genres",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
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
