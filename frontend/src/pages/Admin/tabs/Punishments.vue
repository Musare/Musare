<template>
	<div>
		<metadata title="Admin | Punishments" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Type</td>
						<td>Value</td>
						<td>Reason</td>
						<td>Status</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(punishment, index) in sortedPunishments"
						:key="index"
					>
						<td v-if="punishment.type === 'banUserId'">User ID</td>
						<td v-else>IP Address</td>
						<td>{{ punishment.value }}</td>
						<td>{{ punishment.reason }}</td>
						<td>
							{{
								punishment.active &&
								new Date(punishment.expiresAt).getTime() >
									Date.now()
									? "Active"
									: "Inactive"
							}}
						</td>
						<td>
							<button
								class="button is-primary"
								@click="view(punishment)"
							>
								View
							</button>
						</td>
					</tr>
				</tbody>
			</table>
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">Ban an IP</p>
				</header>
				<div class="card-content">
					<div class="content">
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
					</div>
				</div>
				<footer class="card-footer">
					<a class="card-footer-item" @click="banIP()" href="#"
						>Ban IP</a
					>
				</footer>
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

import ws from "@/ws";

export default {
	components: {
		ViewPunishment: () => import("@/components/modals/ViewPunishment.vue")
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
			//   return _.orderBy(this.punishments, -1);
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
		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());

		this.socket.on("event:admin.punishment.added", res =>
			this.punishments.push(res.data.punishment)
		);
	},
	methods: {
		view(punishment) {
			// this.viewPunishment(punishment);
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

		.card-header {
			box-shadow: 0 1px 2px rgba(10, 10, 10, 0.8);
		}

		p,
		.label {
			color: var(--light-grey-2);
		}
	}
}

body {
	font-family: "Hind", sans-serif;
}

td {
	vertical-align: middle;
}
select {
	margin-bottom: 10px;
}
</style>
