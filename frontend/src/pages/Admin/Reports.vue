<template>
	<div>
		<page-metadata title="Admin | Songs | Reports" />
		<div class="container">
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="reports.getData"
				name="admin-reports"
				max-width="1200"
				:events="events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="button is-primary icon-with-button material-icons"
							@click="view(slotProps.item._id)"
							:disabled="slotProps.item.removed"
							content="View Report"
							v-tippy
						>
							open_in_full
						</button>
						<button
							v-if="slotProps.item.resolved"
							class="button is-danger material-icons icon-with-button"
							@click="resolve(slotProps.item._id, false)"
							:disabled="slotProps.item.removed"
							content="Unresolve Report"
							v-tippy
						>
							remove_done
						</button>
						<button
							v-else
							class="button is-success material-icons icon-with-button"
							@click="resolve(slotProps.item._id, true)"
							:disabled="slotProps.item.removed"
							content="Resolve Report"
							v-tippy
						>
							done_all
						</button>
					</div>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
				<template #column-songId="slotProps">
					<span :title="slotProps.item.song._id">{{
						slotProps.item.song._id
					}}</span>
				</template>
				<template #column-songYoutubeId="slotProps">
					<a
						:href="
							'https://www.youtube.com/watch?v=' +
							`${slotProps.item.song.youtubeId}`
						"
						target="_blank"
					>
						{{ slotProps.item.song.youtubeId }}
					</a>
				</template>
				<template #column-resolved="slotProps">
					<span :title="slotProps.item.resolved">{{
						slotProps.item.resolved
					}}</span>
				</template>
				<template #column-categories="slotProps">
					<span
						:title="
							slotProps.item.issues
								.map(issue => issue.category)
								.join(', ')
						"
						>{{
							slotProps.item.issues
								.map(issue => issue.category)
								.join(", ")
						}}</span
					>
				</template>
				<template #column-createdBy="slotProps">
					<span v-if="slotProps.item.createdBy === 'Musare'"
						>Musare</span
					>
					<user-id-to-username
						v-else
						:user-id="slotProps.item.createdBy"
						:link="true"
					/>
				</template>
				<template #column-createdAt="slotProps">
					<span :title="new Date(slotProps.item.createdAt)">{{
						getDateFormatted(slotProps.item.createdAt)
					}}</span>
				</template>
			</advanced-table>
		</div>

		<view-report v-if="modals.viewReport" sector="admin" />
		<edit-song v-if="modals.editSong" song-type="songs" />
		<report v-if="modals.report" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		ViewReport: defineAsyncComponent(() =>
			import("@/components/modals/ViewReport.vue")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong/index.vue")
		),
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
				minWidth: 150,
				maxWidth: 600
			},
			columns: [
				{
					name: "options",
					displayName: "Options",
					properties: ["_id", "resolved"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 85,
					defaultWidth: 85
				},
				{
					name: "_id",
					displayName: "Report ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 215,
					defaultWidth: 215
				},
				{
					name: "songId",
					displayName: "Song ID",
					properties: ["song"],
					sortProperty: "song._id",
					minWidth: 215,
					defaultWidth: 215
				},
				{
					name: "songYoutubeId",
					displayName: "Song YouTube ID",
					properties: ["song"],
					sortProperty: "song.youtubeId",
					minWidth: 165,
					defaultWidth: 165
				},
				{
					name: "resolved",
					displayName: "Resolved",
					properties: ["resolved"],
					sortProperty: "resolved"
				},
				{
					name: "categories",
					displayName: "Categories",
					properties: ["issues"],
					sortable: false
				},
				{
					name: "createdBy",
					displayName: "Created By",
					properties: ["createdBy"],
					sortProperty: "createdBy",
					defaultWidth: 150
				},
				{
					name: "createdAt",
					displayName: "Created At",
					properties: ["createdAt"],
					sortProperty: "createdAt",
					defaultWidth: 150
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Report ID",
					property: "_id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "songId",
					displayName: "Song ID",
					property: "song._id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "songYoutubeId",
					displayName: "Song YouTube ID",
					property: "song.youtubeId",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "resolved",
					displayName: "Resolved",
					property: "resolved",
					filterTypes: ["boolean"],
					defaultFilterType: "boolean"
				},
				{
					name: "categories",
					displayName: "Categories",
					property: "issues.category",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "createdBy",
					displayName: "Created By",
					property: "createdBy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "createdAt",
					displayName: "Created At",
					property: "createdAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				}
			],
			events: {
				adminRoom: "reports",
				updated: {
					event: "admin.report.updated",
					id: "report._id",
					item: "report"
				},
				removed: {
					event: "admin.report.removed",
					id: "reportId"
				}
			}
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		})
	},
	methods: {
		view(reportId) {
			this.viewReport(reportId);
			this.openModal("viewReport");
		},
		resolve(reportId, value) {
			return this.resolveReport({ reportId, value })
				.then(res => {
					if (res.status !== "success") new Toast(res.message);
				})
				.catch(err => new Toast(err.message));
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
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("admin/reports", ["resolveReport"]),
		...mapActions("modals/viewReport", ["viewReport"])
	}
};
</script>