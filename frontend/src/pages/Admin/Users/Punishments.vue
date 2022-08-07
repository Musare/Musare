<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);

const { socket } = useWebsocketsStore();

const ipBan = ref({
	ip: "",
	reason: "",
	expiresAt: "1h"
});
const columnDefault = ref(<TableColumn>{
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 150,
	maxWidth: 600
});
const columns = ref(<TableColumn[]>[
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "active", "status"],
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
]);
const filters = ref(<TableFilter[]>[
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
]);
const events = ref(<TableEvents>{
	adminRoom: "punishments",
	updated: {
		event: "admin.punishment.updated",
		id: "punishment._id",
		item: "punishment"
	}
});

const { openModal } = useModalsStore();

const banIP = () => {
	socket.dispatch(
		"punishments.banIP",
		ipBan.value.ip,
		ipBan.value.reason,
		ipBan.value.expiresAt,
		res => {
			new Toast(res.message);
		}
	);
};

const getDateFormatted = createdAt => {
	const date = new Date(createdAt);
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	const hour = `${date.getHours()}`.padStart(2, "0");
	const minute = `${date.getMinutes()}`.padStart(2, "0");
	return `${year}-${month}-${day} ${hour}:${minute}`;
};

const deactivatePunishment = punishmentId => {
	socket.dispatch("punishments.deactivatePunishment", punishmentId, res => {
		if (res.status === "success") {
			new Toast("Successfully deactivated punishment.");
		} else {
			new Toast(res.message);
		}
	});
};
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | Users | Punishments" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Punishments</h1>
				<p>Manage punishments or ban an IP</p>
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			:events="events"
			data-action="punishments.getData"
			name="admin-punishments"
			:max-width="1200"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'viewPunishment',
								data: { punishmentId: slotProps.item._id }
							})
						"
						:disabled="slotProps.item.removed"
						content="View Punishment"
						v-tippy
					>
						open_in_full
					</button>
					<quick-confirm
						@confirm="deactivatePunishment(slotProps.item._id)"
						:disabled="
							!slotProps.item.active || slotProps.item.removed
						"
					>
						<button
							class="button is-danger icon-with-button material-icons"
							:class="{
								disabled:
									!slotProps.item.active ||
									slotProps.item.removed
							}"
							:disabled="
								!slotProps.item.active || slotProps.item.removed
							"
							content="Deactivate Punishment"
							v-tippy
						>
							gavel
						</button>
					</quick-confirm>
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
				<user-link
					v-if="slotProps.item.type === 'banUserId'"
					:user-id="slotProps.item.value"
					:alt="slotProps.item.value"
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
				<user-link :user-id="slotProps.item.punishedBy" />
			</template>
			<template #column-punishedAt="slotProps">
				<span :title="new Date(slotProps.item.punishedAt).toString()">{{
					getDateFormatted(slotProps.item.punishedAt)
				}}</span>
			</template>
			<template #column-expiresAt="slotProps">
				<span :title="new Date(slotProps.item.expiresAt).toString()">{{
					getDateFormatted(slotProps.item.expiresAt)
				}}</span>
			</template>
		</advanced-table>
		<div class="card">
			<h4>Ban an IP</h4>
			<hr class="section-horizontal-rule" />
			<div class="card-content">
				<label class="label">Expires In</label>
				<p class="control is-expanded select">
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
				</p>
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
</template>

<style lang="less" scoped>
.card .button.is-primary {
	width: 100%;
}
</style>
