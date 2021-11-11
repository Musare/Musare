<template>
	<div>
		<page-metadata title="Admin | Punishments" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Status</td>
						<td>Type</td>
						<td>Value</td>
						<td>Reason</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="punishment in sortedPunishments"
						:key="punishment._id"
					>
						<td>
							{{
								punishment.active &&
								new Date(punishment.expiresAt).getTime() >
									Date.now()
									? "Active"
									: "Inactive"
							}}
						</td>
						<td v-if="punishment.type === 'banUserId'">User ID</td>
						<td v-else>IP Address</td>
						<td v-if="punishment.type === 'banUserId'">
							<user-id-to-username
								:user-id="punishment.value"
								:alt="punishment.value"
								:link="true"
							/>
							({{ punishment.value }})
						</td>
						<td v-else>
							{{ punishment.value }}
						</td>
						<td>{{ punishment.reason }}</td>

						<td>
							<a
								class="button is-primary"
								@click="view(punishment)"
								content="Expand"
								v-tippy
							>
								<i class="material-icons icon-with-button">
									open_in_full
								</i>
								Expand
							</a>
						</td>
					</tr>
				</tbody>
			</table>
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

import ws from "@/ws";

import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		ViewPunishment: defineAsyncComponent(() =>
			import("@/components/modals/ViewPunishment.vue")
		),
		UserIdToUsername
	},
	data() {
		return {
			viewingPunishmentId: "",
			punishments: [],
			ipBan: {
				expiresAt: "1h"
			}
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
		ws.onConnect(this.init);

		this.socket.on("event:admin.punishment.created", res =>
			this.punishments.push(res.data.punishment)
		);
	},
	methods: {
		view(punishment) {
			this.viewingPunishmentId = punishment._id;
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
		init() {
			this.socket.dispatch("punishments.index", res => {
				if (res.status === "success")
					this.punishments = res.data.punishments;
			});

			this.socket.dispatch("apis.joinAdminRoom", "punishments", () => {});
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("admin/punishments", ["viewPunishment"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}

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
}

td {
	vertical-align: middle;
}
select {
	margin-bottom: 10px;
}
</style>
