<template>
	<div>
		<modal title='Edit Station'>
			<div slot='body'>
				<label class='label'>Display name</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Station Display Name' v-model='editing.displayName' autofocus>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updateDisplayName()' href='#'>Update</a>
					</p>
				</div>
				<label class='label'>Description</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
						<input class='input' type='text' placeholder='Station Display Name' v-model='editing.description'>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updateDescription()' href='#'>Update</a>
					</p>
				</div>
				<label class='label'>Privacy</label>
				<div class='control is-grouped'>
					<p class='control is-expanded'>
							<span class='select'>
								<select v-model='editing.privacy'>
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
				<div class='control is-grouped' v-if="editing.type === 'community'">
					<p class="control is-expanded party-mode-outer">
						<label class="checkbox party-mode-inner">
							<input type="checkbox" v-model="editing.partyMode">
							&nbsp;Party mode
						</label>
					</p>
					<p class='control'>
						<a class='button is-info' @click='updatePartyMode()' href='#'>Update</a>
					</p>
				</div>
				<button class='button is-danger' @click='deleteStation()' v-if="$parent.type === 'community'">Delete station</button>
			</div>
		</modal>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';
	import io from '../../io';

	export default {
		data: function() {
			return {
				editing: {
					_id: '',
					type: '',
					displayName: '',
					description: '',
					privacy: 'private',
					partyMode: false
				}
			}
		},
		methods: {
			updateDisplayName: function () {
				let _this = this;
				this.socket.emit('stations.updateDisplayName', this.editing._id, this.editing.displayName, res => {
					if (res.status === 'success') {
						if (_this.$parent.station) _this.$parent.station.displayName = _this.editing.displayName;
						else {
							_this.$parent.stations.forEach((station, index) => {
								if (station._id === _this.editing._id) return _this.$parent.stations[index].displayName = _this.editing.displayName;
							});
						}
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updateDescription: function () {
				let _this = this;
				this.socket.emit('stations.updateDescription', this.editing._id, this.editing.description, res => {
					if (res.status === 'success') {
						if (_this.$parent.station) _this.$parent.station.description = _this.editing.description;
						else {
							_this.$parent.stations.forEach((station, index) => {
								if (station._id === station._id) return _this.$parent.stations[index].description = _this.editing.description;
							});
						}
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updatePrivacy: function () {
				let _this = this;
				this.socket.emit('stations.updatePrivacy', this.editing._id, this.editing.privacy, res => {
					if (res.status === 'success') {
						if (_this.$parent.station) _this.$parent.station.privacy = _this.editing.privacy;
						else {
							_this.$parent.stations.forEach((station, index) => {
								if (station._id === station._id) return _this.$parent.stations[index].privacy = _this.editing.privacy;
							});
						}
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updatePartyMode: function () {
				let _this = this;
				this.socket.emit('stations.updatePartyMode', this.editing._id, this.editing.partyMode, res => {
					if (res.status === 'success') {
						if (_this.$parent.station) _this.$parent.station.partyMode = _this.editing.partyMode;
						else {
							_this.$parent.stations.forEach((station, index) => {
								if (station._id === station._id) return _this.$parent.stations[index].partyMode = _this.editing.partyMode;
							});
						}
						return Toast.methods.addToast(res.message, 4000);
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			deleteStation: function() {
				let _this = this;
				this.socket.emit('stations.remove', this.editing._id, res => {
					Toast.methods.addToast(res.message, 8000);
					if (res.status === 'success' && _this.$parent.station) location.href = '/';
				});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket(socket => {
				_this.socket = socket;
			});
		},
		events: {
			closeModal: function() {
				this.$parent.modals.editStation = false;
			},
			editStation: function (station) {
				this.editing = station;
				this.$parent.toggleModal();
			}
		},
		components: { Modal }
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