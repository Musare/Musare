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
				<template #column-actions="slotProps">
					<button
						class="button is-primary"
						@click.prevent="edit(slotProps.item)"
						content="Edit Song"
						v-tippy
					>
						<i class="material-icons">edit</i>
					</button>
				</template>
				<!-- <template #bulk-actions="slotProps">
					A {{ slotProps.item.length }}
				</template>
				<template #bulk-actions-right="slotProps">
					B {{ slotProps.item.length }}
				</template> -->
			</advanced-table>
		</div>
		<edit-song v-if="modals.editSong" song-type="songs" :key="song._id" />
		<report v-if="modals.report" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";

import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		AdvancedTable,
		UserIdToUsername,
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		)
	},
	data() {
		return {
			columnDefault: {
				sortable: true,
				hidable: true,
				defaultVisibility: "shown",
				draggable: true,
				resizable: true,
				pinable: true,
				minWidth: 200,
				maxWidth: 600
			},
			columns: [
				{
					name: "thumbnailImage",
					displayName: "Thumb",
					properties: ["thumbnail"],
					sortable: false,
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
				},
				{
					name: "actions",
					displayName: "Actions",
					properties: ["_id"],
					sortable: false,
					hidable: false,
					width: 100,
					resizable: false
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
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapState("modals/editSong", {
			song: state => state.song
		})
	},
	mounted() {},
	beforeUnmount() {},
	methods: {
		edit(song) {
			this.editSong(song);
			this.openModal("editSong");
		},
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["openModal"])
	}
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
