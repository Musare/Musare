<template>
	<div class='container'>
		<table class='table is-striped'>
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
			<tr v-for='(index, punishment) in punishments | orderBy "expiresAt" -1' track-by='$index'>
				<td v-if='punishment.type === "banUserId"'>User ID</td>
				<td v-else>IP Address</td>
				<td>{{ punishment.value }}</td>
				<td>{{ punishment.reason }}</td>
				<td>{{ (punishment.active && new Date(punishment.expiresAt).getTime() > Date.now()) ? 'Active' : 'Inactive' }}</td>
				<td>
					<button class='button is-primary' @click='view(punishment)'>View</button>
				</td>
			</tr>
			</tbody>
		</table>
		<div class='card is-fullwidth'>
			<header class='card-header'>
				<p class='card-header-title'>Ban an IP</p>
			</header>
			<div class='card-content'>
				<div class='content'>
					<label class='label'>Expires In</label>
					<select v-model='ipBan.expiresAt'>
						<option value='1h'>1 Hour</option>
						<option value='12h'>12 Hours</option>
						<option value='1d'>1 Day</option>
						<option value='1w'>1 Week</option>
						<option value='1m'>1 Month</option>
						<option value='3m'>3 Months</option>
						<option value='6m'>6 Months</option>
						<option value='1y'>1 Year</option>
					</select>
					<label class='label'>IP</label>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='IP address (xxx.xxx.xxx.xxx)' v-model='ipBan.ip'>
					</p>
					<label class='label'>Reason</label>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Reason' v-model='ipBan.reason'>
					</p>
				</div>
			</div>
			<footer class='card-footer'>
				<a class='card-footer-item' @click='banIP()' href='#'>Ban IP</a>
			</footer>
		</div>
	</div>
	<view-punishment v-show='modals.viewPunishment'></view-punishment>
</template>

<script>
	import ViewPunishment from '../Modals/ViewPunishment.vue';
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	export default {
		components: { ViewPunishment },
		data() {
			return {
				punishments: [],
				modals: { viewPunishment: false },
				ipBan: {
					expiresAt: '1h'
				}
			}
		},
		methods: {
			toggleModal: function () {
				this.modals.viewPunishment = !this.modals.viewPunishment;
			},
			view: function (punishment) {
				this.$broadcast('viewPunishment', punishment);
			},
			banIP: function() {
				let _this = this;
				_this.socket.emit('punishments.banIP', _this.ipBan.ip, _this.ipBan.reason, _this.ipBan.expiresAt, res => {
					Toast.methods.addToast(res.message, 6000);
				});
			},
			init: function () {
				let _this = this;
				_this.socket.emit('punishments.index', result => {
					if (result.status === 'success') _this.punishments = result.data;
				});
				//_this.socket.emit('apis.joinAdminRoom', 'punishments', () => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket(socket => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				io.onConnect(() => _this.init());
			});
		}
	}
</script>

<style lang='scss' scoped>
	body { font-family: 'Roboto', sans-serif; }

	td { vertical-align: middle; }
	select { margin-bottom: 10px; }
</style>
