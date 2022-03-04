<template>
	<div>
		<page-metadata title="Admin | News" />
		<div class="container">
			<div class="button-row">
				<button class="is-primary button" @click="edit()">
					Create News Item
				</button>
			</div>
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="news.getData"
				name="admin-news"
				max-width="1200"
				:events="events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="button is-primary icon-with-button material-icons"
							@click="edit(slotProps.item._id)"
							content="Edit News"
							v-tippy
						>
							edit
						</button>
						<quick-confirm
							@confirm="remove(slotProps.item._id)"
							:disabled="slotProps.item.removed"
						>
							<button
								class="button is-danger icon-with-button material-icons"
								content="Remove News"
								v-tippy
							>
								delete_forever
							</button>
						</quick-confirm>
					</div>
				</template>
				<template #column-status="slotProps">
					<span :title="slotProps.item.status">{{
						slotProps.item.status
					}}</span>
				</template>
				<template #column-showToNewUsers="slotProps">
					<span :title="slotProps.item.showToNewUsers">{{
						slotProps.item.showToNewUsers
					}}</span>
				</template>
				<template #column-title="slotProps">
					<span :title="slotProps.item.title">{{
						slotProps.item.title
					}}</span>
				</template>
				<template #column-createdBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.createdBy"
						:alt="slotProps.item.createdBy"
						:link="true"
					/>
				</template>
				<template #column-markdown="slotProps">
					<span :title="slotProps.item.markdown">{{
						slotProps.item.markdown
					}}</span>
				</template>
			</advanced-table>
		</div>

		<edit-news
			v-if="modals.editNews"
			:news-id="editingNewsId"
			sector="admin"
		/>
	</div>
</template>

<script>
import { mapActions, mapState, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";
import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		AdvancedTable,
		QuickConfirm,
		UserIdToUsername,
		EditNews: defineAsyncComponent(() =>
			import("@/components/modals/EditNews.vue")
		)
	},
	data() {
		return {
			editingNewsId: "",
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
					properties: ["_id"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 85,
					defaultWidth: 85
				},
				{
					name: "status",
					displayName: "Status",
					properties: ["status"],
					sortProperty: "status",
					defaultWidth: 150
				},
				{
					name: "showToNewUsers",
					displayName: "Show to new users",
					properties: ["showToNewUsers"],
					sortProperty: "showToNewUsers",
					defaultWidth: 180
				},
				{
					name: "title",
					displayName: "Title",
					properties: ["title"],
					sortProperty: "title"
				},
				{
					name: "createdBy",
					displayName: "Created By",
					properties: ["createdBy"],
					sortProperty: "createdBy",
					defaultWidth: 150
				},
				{
					name: "markdown",
					displayName: "Markdown",
					properties: ["markdown"],
					sortProperty: "markdown"
				}
			],
			filters: [
				{
					name: "status",
					displayName: "Status",
					property: "status",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "showToNewUsers",
					displayName: "Show to new users",
					property: "showToNewUsers",
					filterTypes: ["boolean"],
					defaultFilterType: "boolean"
				},
				{
					name: "title",
					displayName: "Title",
					property: "title",
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
					name: "markdown",
					displayName: "Markdown",
					property: "markdown",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			],
			events: {
				adminRoom: "news",
				updated: {
					event: "admin.news.updated",
					id: "news._id",
					item: "news"
				},
				removed: {
					event: "admin.news.deleted",
					id: "newsId"
				}
			}
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
	methods: {
		edit(id) {
			if (id) this.editingNewsId = id;
			else this.editingNewsId = "";
			this.openModal("editNews");
		},
		remove(id) {
			this.socket.dispatch(
				"news.remove",
				id,
				res => new Toast(res.message)
			);
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>
