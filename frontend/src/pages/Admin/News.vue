<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { GenericResponse } from "@musare_types/actions/GenericActions";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const { socket } = useWebsocketsStore();

const columnDefault = ref<TableColumn>({
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 150,
	maxWidth: 600
});
const columns = ref<TableColumn[]>([
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
]);
const filters = ref<TableFilter[]>([
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
]);
const events = ref<TableEvents>({
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
});

const { openModal } = useModalsStore();

const { hasPermission } = useUserAuthStore();

const remove = (id: string) => {
	socket.dispatch(
		"news.remove",
		id,
		(res: GenericResponse) => new Toast(res.message)
	);
};
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | News" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>News</h1>
				<p>Create and update news items</p>
			</div>
			<div class="button-row">
				<button
					v-if="hasPermission('news.create')"
					class="is-primary button"
					@click="
						openModal({
							modal: 'editNews',
							props: { createNews: true }
						})
					"
				>
					Create News Item
				</button>
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			data-action="news.getData"
			name="admin-news"
			:max-width="1200"
			:events="events"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						v-if="hasPermission('news.update')"
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'editNews',
								props: { newsId: slotProps.item._id }
							})
						"
						content="Edit News"
						v-tippy
					>
						edit
					</button>
					<quick-confirm
						v-if="hasPermission('news.remove')"
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
				<user-link
					:user-id="slotProps.item.createdBy"
					:alt="slotProps.item.createdBy"
				/>
			</template>
			<template #column-markdown="slotProps">
				<span :title="slotProps.item.markdown">{{
					slotProps.item.markdown
				}}</span>
			</template>
		</advanced-table>
	</div>
</template>
