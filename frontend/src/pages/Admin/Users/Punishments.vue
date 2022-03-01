<template>
	<div>
		<page-metadata title="Admin | Users | Punishments" />
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
							class="button is-primary icon-with-button material-icons"
							@click="view(slotProps.item._id)"
							:disabled="slotProps.item.removed"
							content="View Punishment"
							v-tippy
						>
							open_in_full
						</button>
					</div>
				</template>
				<template #column-status="slotProps">
					<span>{{ slotProps.item.status }}</span>
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
				<template #column-punishedBy="slotProps">
					<user-id-to-username
						:user-id="slotProps.item.punishedBy"
						:link="true"
					/>
				</template>
				<template #column-punishedAt="slotProps">
					<span :title="new Date(slotProps.item.punishedAt)">{{
						getDateFormatted(slotProps.item.punishedAt)
					}}</span>
				</template>
				<template #column-expiresAt="slotProps">
					<span :title="new Date(slotProps.item.expiresAt)">{{
						getDateFormatted(slotProps.item.expiresAt)
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
					displayName: "Options",
					properties: ["_id"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 76,
					defaultWidth: 76
				},
				{
					name: "status",
					displayName: "Status",
					properties: ["status"],
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
				},
				{
					name: "punishedBy",
					displayName: "Punished By",
					properties: ["punishedBy"],
					sortProperty: "punishedBy",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "punishedAt",
					displayName: "Punished At",
					properties: ["punishedAt"],
					sortProperty: "punishedAt",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				},
				{
					name: "expiresAt",
					displayName: "Expires At",
					properties: ["expiresAt"],
					sortProperty: "verifiedAt",
					defaultWidth: 200,
					defaultVisibility: "hidden"
				}
			],
			filters: [
				{
					name: "status",
					displayName: "Status",
					property: "status",
					filterTypes: ["exact"],
					defaultFilterType: "exact",
					dropdown: [
						["Active", "Active"],
						["Inactive", "Inactive"]
					]
				},
				{
					name: "type",
					displayName: "Type",
					property: "type",
					filterTypes: ["exact"],
					defaultFilterType: "exact",
					dropdown: [
						["banUserId", "User ID"],
						["banUserIp", "IP Address"]
					]
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
				},
				{
					name: "punishedBy",
					displayName: "Punished By",
					property: "punishedBy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "punishedAt",
					displayName: "Punished At",
					property: "punishedAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
				},
				{
					name: "expiresAt",
					displayName: "Expires At",
					property: "expiresAt",
					filterTypes: ["datetimeBefore", "datetimeAfter"],
					defaultFilterType: "datetimeBefore"
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
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("admin/punishments", ["viewPunishment"])
	}
};
</script>

<style lang="less" scoped>
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
	border-radius: @border-radius;
	background-color: var(--white);
	color: var(--dark-grey);
	box-shadow: @box-shadow;

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