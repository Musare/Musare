<template>
	<div>
		<page-metadata title="Admin | Test" />
		<div class="admin-tab">
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="songs.getData"
				name="admin-test"
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
				<template #bulk-actions="slotProps">
					<div class="song-bulk-actions">
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
						<i
							class="material-icons unverify-songs-icon"
							@click.prevent="unverifyMany(slotProps.item)"
							content="Unverify Songs"
							v-tippy
						>
							cancel
						</i>
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
								class="material-icons delete-songs-icon"
								content="Delete Songs"
								v-tippy
							>
								delete_forever
							</i>
						</quick-confirm>
					</div>
				</template>
				<!-- <template #bulk-actions-right="slotProps">
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

import Toast from "toasters";
import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";

export default {
	components: {
		AdvancedTable,
		UserIdToUsername,
		QuickConfirm,
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
				minWidth: 200,
				maxWidth: 600
			},
			columns: [
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
					name: "_id",
					displayName: "Musare ID",
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
					defaultWidth: 200
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
		editMany(selectedRows) {
			if (selectedRows.length === 1) {
				this.editSong(selectedRows[0]);
				this.openModal("editSong");
			} else {
				new Toast("Bulk editing not yet implemented.");
			}
		},
		verifyMany() {
			new Toast("Bulk verifying not yet implemented.");
		},
		unverifyMany() {
			new Toast("Bulk unverifying not yet implemented.");
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
		deleteMany() {
			new Toast("Bulk deleting not yet implemented.");
		},
		...mapActions("modals/editSong", ["editSong"]),
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.song-thumbnail {
	display: block;
	max-width: 50px;
	margin: 0 auto;
}

.bulk-popup {
	.song-bulk-actions {
		display: flex;
		flex-direction: row;
		width: 100%;
		justify-content: space-evenly;

		.material-icons {
			position: relative;
			top: 6px;
			margin-left: 5px;
			cursor: pointer;
			color: var(--primary-color);

			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
		.verify-songs-icon {
			color: var(--green);
		}
		.unverify-songs-icon,
		.delete-songs-icon {
			color: var(--dark-red);
		}
	}
}
</style>
