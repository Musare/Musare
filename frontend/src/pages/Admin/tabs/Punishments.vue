<template>
	<div>
		<page-metadata title="Admin | Punishments" />
		<div class="container">
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="punishments.getData"
				name="admin-punishments"
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
							content="View Punishment"
							v-tippy
						>
							open_in_full
						</button>
					</div>
				</template>
				<template #column-status="slotProps">
					<span>{{
						slotProps.item.active &&
						new Date(slotProps.item.expiresAt).getTime() >
							Date.now()
							? "Active"
							: "Inactive"
					}}</span>
				</template>
				<template #column-type="slotProps">
					<span
						:title="
							slotProps.item.type === 'banUserId'
								? 'User ID'
								: 'IP Address'
						"
						>{{
							slotProps.item.type === "banUserId"
								? "User ID"
								: "IP Address"
						}}</span
					>
				</template>
				<template #column-value="slotProps">
					<user-id-to-username
						v-if="slotProps.item.type === 'banUserId'"
						:user-id="slotProps.item.value"
						:alt="slotProps.item.value"
						:link="true"
					/>
					<span v-else :title="slotProps.item.value">{{
						slotProps.item.value
					}}</span>
				</template>
				<template #column-reason="slotProps">
					<span :title="slotProps.item.reason">{{
						slotProps.item.reason
					}}</span>
				</template>
			</advanced-table>
			<div class="card">
				<header class="card-header">
					<p>Ban an IP</p>
				</header>
				<div class="card-content">
					<label class="label">Expires In</label>
					<select v-model="ipBan.expiresAt">
						<option value="1h">1 Hour</option>
						<option value="12h">12 Hours</option>
						<option value="1d">1 Day</option>
						<option value="1w">1 Week</option>
						<option value="1m">1 Month</option>
						<option value="3m">3 Months</option>
						<option value="6m">6 Months</option>
						<option value="1y">1 Year</option>
					</select>
					<label class="label">IP</label>
					<p class="control is-expanded">
						<input
							v-model="ipBan.ip"
							class="input"
							type="text"
							placeholder="IP address (xxx.xxx.xxx.xxx)"
						/>
					</p>
					<label class="label">Reason</label>
					<p class="control is-expanded">
						<input
							v-model="ipBan.reason"
							class="input"
							type="text"
							placeholder="Reason"
						/>
					</p>
					<button class="button is-primary" @click="banIP()">
						Ban IP
					</button>
				</div>
			</div>
		</div>
		<view-punishment
			v-if="modals.viewPunishment"
			:punishment-id="viewingPunishmentId"
			sector="admin"
		/>
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import Toast from "toasters";
import { defineAsyncComponent } from "vue";

// import ws from "@/ws";

import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		ViewPunishment: defineAsyncComponent(() =>
			import("@/components/modals/ViewPunishment.vue")
		),
		AdvancedTable,
		UserIdToUsername
	},
	data() {
		return {
			viewingPunishmentId: "",
			ipBan: {
				expiresAt: "1h"
			},
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
					minWidth: 51,
					defaultWidth: 51
				},
				{
					name: "status",
					displayName: "Status",
					properties: ["active", "expiresAt"],
					sortable: false,
					defaultWidth: 150
				},
				{
					name: "type",
					displayName: "Type",
					properties: ["type"],
					sortProperty: "type"
				},
				{
					name: "value",
					displayName: "Value",
					properties: ["value"],
					sortProperty: "value",
					defaultWidth: 150
				},
				{
					name: "reason",
					displayName: "Reason",
					properties: ["reason"],
					sortProperty: "reason"
				}
			],
			filters: [
				// {
				// 	name: "status",
				// 	displayName: "Status",
				// 	property: "status",
				// 	filterTypes: ["contains", "exact", "regex"],
				// 	defaultFilterType: "contains"
				// },
				{
					name: "type",
					displayName: "Type",
					property: "type",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "value",
					displayName: "Value",
					property: "value",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "reason",
					displayName: "Reason",
					property: "reason",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			]
		};
	},
	computed: {
		sortedPunishments() {
			return this.punishments;
		},
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		// ws.onConnect(this.init);
		// this.socket.on("event:admin.punishment.created", res =>
		// 	this.punishments.push(res.data.punishment)
		// );
	},
	methods: {
		view(punishmentId) {
			this.viewingPunishmentId = punishmentId;
			this.openModal("viewPunishment");
		},
		banIP() {
			this.socket.dispatch(
				"punishments.banIP",
				this.ipBan.ip,
				this.ipBan.reason,
				this.ipBan.expiresAt,
				res => {
					new Toast(res.message);
				}
			);
		},
		// init() {
		// 	this.socket.dispatch("apis.joinAdminRoom", "punishments", () => {});
		// },
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("admin/punishments", ["viewPunishment"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.card {
		background: var(--dark-grey-3);

		p,
		.label {
			color: var(--light-grey-2);
		}
	}
}

.card {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	padding: 20px;
	margin: 10px 0;
	border-radius: 5px;
	background-color: var(--white);
	color: var(--dark-grey);
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);

	.card-header {
		font-weight: 700;
		padding-bottom: 10px;
	}

	.button.is-primary {
		width: 100%;
	}

	select {
		margin-bottom: 10px;
	}
}
</style>
