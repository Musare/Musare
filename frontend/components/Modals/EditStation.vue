<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Edit station</p>
				<button class='delete' @click='$parent.toggleModal("editStation")'></button>
			</header>
			<section class='modal-card-body'>
				<label class='label'>Display name</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Station Display Name' v-model='data.displayName' autofocus>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updateDisplayName()' href='#'>Update</a>
					</p>
				</div>
				<label class='label'>Description</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Station Display Name' v-model='data.description'>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updateDescription()' href='#'>Update</a>
					</p>
				</div>
				<label class='label'>Privacy</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<span class='select'>
							<select v-model='data.privacy'>
								<option :value='"public"'>Public</option>
								<option :value='"unlisted"'>Unlisted</option>
								<option :value='"private"'>Private</option>
							</select>
						</span>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updatePrivacy()' href='#'>Update</a>
					</p>
				</div>
				<div class='control is-grouped' v-if="$parent.type === 'community'">
					<p class="control is-expanded party-mode-outer">
						<label class="checkbox party-mode-inner">
							<input type="checkbox" v-model="data.partyMode">
							&nbsp;Party mode
						</label>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updatePartyMode()' href='#'>Update</a>
					</p>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	export default {
		data: function() {
			return {
				data: {
					displayName: '',
					description: '',
					privacy: 'private',
					partyMode: false
				}
			}
		},
		methods: {
			updateDisplayName: function () {
				this.socket.emit('stations.updateDisplayName', this.data.stationId, this.data.displayName, res => {
					if (res.status === 'success') {
						this.$parent.station.displayName = this.data.displayName;
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updateDescription: function () {
				this.socket.emit('stations.updateDescription', this.data.stationId, this.data.description, res => {
					if (res.status === 'success') {
						this.$parent.station.description = this.data.description;
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updatePrivacy: function () {
				this.socket.emit('stations.updatePrivacy', this.data.stationId, this.data.privacy, res => {
					if (res.status === 'success') {
						this.$parent.station.privacy = this.data.privacy;
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updatePartyMode: function () {
				this.socket.emit('stations.updatePartyMode', this.data.stationId, this.data.partyMode, res => {
					if (res.status === 'success') {
					this.$parent.station.partyMode = this.data.partyMode;
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
			});
			this.data.stationId = this.$parent.stationId;
			this.data.partyMode = this.$parent.station.partyMode;
			this.data.description = this.$parent.station.description;
			this.data.privacy = this.$parent.station.privacy;
			this.data.displayName = this.$parent.station.displayName;
		},
		events: {
			closeModal: function() {
				this.$parent.toggleModal("editStation")
			}
		}
	}
</script>

<style type='scss' scoped>
	.controls {
		display: flex;

		a {
			display: flex;
    		align-items: center;
		}
	}

	.table { margin-bottom: 0; }

	h5 { padding: 20px 0; }

	.party-mode-inner, .party-mode-outer {
		display: flex;
		align-items: center;
	}
</style>