<template>
	<div>
		<page-metadata title="Admin | Reports" />
		<div class="container">
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="reports.getData"
				name="admin-reports"
				max-width="1200"
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
							@click="view(slotProps.item._id)"
							content="View Report"
							v-tippy
						>
							open_in_full
						</button>
						<button
							class="
								button
								is-success
								icon-with-button
								material-icons
							"
							@click="resolve(slotProps.item._id)"
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
import { mapState, mapActions, mapGetters } from "vuex";
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
					displayName: "Edit",
					properties: ["_id"],
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
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		// ws.onConnect(this.init);
		// this.socket.on("event:admin.report.resolved", res => {
		// 	this.reports = this.reports.filter(
		// 		report => report._id !== res.data.reportId
		// 	);
		// });
		// this.socket.on("event:admin.report.created", res =>
		// 	this.reports.unshift(res.data.report)
		// );
	},
	methods: {
		// init() {
		// 	this.socket.dispatch("apis.joinAdminRoom", "reports", () => {});
		// },
		view(reportId) {
			this.viewReport(reportId);
			this.openModal("viewReport");
		},
		resolve(reportId) {
			return this.resolveReport(reportId)
				.then(res => {
					if (res.status === "success" && this.modals.viewReport)
						this.closeModal("viewReport");
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
