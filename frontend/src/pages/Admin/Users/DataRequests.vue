<template>
	<div>
		<page-metadata title="Admin | Users | Data Requests" />
		<div class="container">
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="dataRequests.getData"
				name="admin-data-requests"
				max-width="1200"
				:events="events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<quick-confirm
							placement="right"
							@confirm="resolveDataRequest(slotProps.item._id)"
							:disabled="slotProps.item.removed"
						>
							<button
								class="button is-success icon-with-button material-icons"
								content="Resolve Data Request"
								v-tippy
							>
								done_all
							</button>
						</quick-confirm>
					</div>
				</template>
				<template #column-type="slotProps">
					<span
						:title="
							slotProps.item.type
								? 'Remove all associated data'
								: slotProps.item.type
						"
						>{{
							slotProps.item.type
								? "Remove all associated data"
								: slotProps.item.type
						}}</span
					>
				</template>
				<template #column-userId="slotProps">
					<span :title="slotProps.item.userId">{{
						slotProps.item.userId
					}}</span>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
			</advanced-table>
		</div>
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";

export default {
	components: {
		AdvancedTable
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
					properties: ["_id"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 76,
					defaultWidth: 76
				},
				{
					name: "type",
					displayName: "Type",
					properties: ["type"],
					sortable: false
				},
				{
					name: "userId",
					displayName: "User ID",
					properties: ["userId"],
					sortProperty: "userId"
				},
				{
					name: "_id",
					displayName: "Request ID",
					properties: ["_id"],
					sortProperty: "_id"
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Request ID",
					property: "_id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "userId",
					displayName: "User ID",
					property: "userId",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			],
			events: {
				adminRoom: "users",
				removed: {
					event: "admin.dataRequests.resolved",
					id: "dataRequestId"
				}
			}
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		resolveDataRequest(id) {
			this.socket.dispatch("dataRequests.resolve", id, res => {
				if (res.status === "success") new Toast(res.message);
			});
		}
	}
};
</script>
