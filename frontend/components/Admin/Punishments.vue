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
						<td v-if="punishment.type === 'banUserId'">
							User ID
						</td>
						<td v-else>
							IP Address
						</td>
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
					<p class="card-header-title">
						Ban an IP
					</p>
				</header>
				<div class="card-content">
					<div class="content">
						<label class="label">Expires In</label>
						<select v-model="ipBan.expiresAt">
							<option value="1h">
								1 Hour
							</option>
							<option value="12h">
								12 Hours
							</option>
							<option value="1d">
								1 Day
							</option>
							<option value="1w">
								1 Week
							</option>
							<option value="1m">
								1 Month
							</option>
							<option value="3m">
								3 Months
							</option>
							<option value="6m">
								6 Months
							</option>
							<option value="1y">
								1 Year
							</option>
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
					<a class="card-footer-item" v-on:click="banIP()" href="#"
						>Ban IP</a
					>
				</footer>
			</div>
		</div>
		<view-punishment v-if="modals.viewPunishment" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { Toast } from "vue-roaster";

import ViewPunishment from "../Modals/ViewPunishment.vue";
import io from "../../io";

export default {
	components: { ViewPunishment },
	data() {
		return {
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
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	methods: {
		view(punishment) {
			this.viewPunishment(punishment);
			this.openModal({ sector: "admin", modal: "viewPunishment" });
		},
		banIP() {
			this.socket.emit(
				"punishments.banIP",
				this.ipBan.ip,
				this.ipBan.reason,
				this.ipBan.expiresAt,
				res => {
					Toast.methods.addToast(res.message, 6000);
				}
			);
		},
		init() {
			this.socket.emit("punishments.index", res => {
				if (res.status === "success") this.punishments = res.data;
			});
			this.socket.emit("apis.joinAdminRoom", "punishments", () => {});
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("admin/punishments", ["viewPunishment"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => this.init());
			socket.on("event:admin.punishment.added", punishment => {
				this.punishments.push(punishment);
			});
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

body {
	font-family: "Roboto", sans-serif;
}

td {
	vertical-align: middle;
}
select {
	margin-bottom: 10px;
}
</style>
