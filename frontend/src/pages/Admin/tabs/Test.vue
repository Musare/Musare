<template>
	<div>
		<page-metadata title="Admin | Test" />
		<div class="admin-container">
			<advanced-table :columns="columns" data-action="songs.getData">
				<template #column-thumbnailImage="slotProps">
					<img
						class="song-thumbnail"
						:src="slotProps.item.thumbnail"
						onerror="this.src='/assets/notes-transparent.png'"
					/>
				</template>
				<template #column-thumbnailUrl="slotProps">
					{{ slotProps.item.thumbnail }}
				</template>
				<template #column-_id="slotProps">
					{{ slotProps.item._id }}
				</template>
				<template #column-title="slotProps">
					{{ slotProps.item.title }}
				</template>
				<template #column-artists="slotProps">
					{{ slotProps.item.artists.join(", ") }}
				</template>
			</advanced-table>
		</div>
	</div>
</template>

<script>
import AdvancedTable from "@/components/AdvancedTable.vue";

export default {
	components: {
		AdvancedTable
	},
	data() {
		return {
			columns: [
				{
					name: "thumbnailImage",
					displayName: "Thumbnail (Image)",
					properties: ["thumbnail"],
					sortable: false,
					filterable: false
				},
				{
					name: "_id",
					displayName: "Musare Id",
					properties: ["_id"],
					sortable: true,
					sortProperty: "_id",
					filterable: true,
					filterProperty: "_id"
				},
				{
					name: "title",
					displayName: "Title",
					properties: ["title"],
					sortable: true,
					sortProperty: "title",
					filterable: true,
					filterProperty: "title"
				},
				{
					name: "artists",
					displayName: "Artists",
					properties: ["artists"],
					sortable: true,
					sortProperty: "artists",
					filterable: true,
					filterProperty: "artists"
				},
				{
					name: "thumbnailUrl",
					displayName: "Thumbnail (URL)",
					properties: ["thumbnail"],
					sortable: true,
					sortProperty: "thumbnail",
					filterable: true,
					filterProperty: "thumbnail"
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
