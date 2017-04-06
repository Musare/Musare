<template>
	<div>
		<modal title='Edit Station'>
			<div slot='body'>
				<label class='label'>Name</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Station Name' v-model='editing.name'>
				</p>
				<label class='label'>Display name</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Station Display Name' v-model='editing.displayName'>
				</p>
				<label class='label'>Description</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Station Display Name' v-model='editing.description'>
				</p>
				<label class='label'>Privacy</label>
				<p class='control'>
					<span class='select'>
						<select v-model='editing.privacy'>
							<option :value='"public"'>Public</option>
							<option :value='"unlisted"'>Unlisted</option>
							<option :value='"private"'>Private</option>
						</select>
					</span>
				</p>
				<br><br>
				<p class='control'>
					<label class="checkbox party-mode-inner">
						<input type="checkbox" v-model="editing.partyMode">
						&nbsp;Party mode
					</label>
				</p>
				<small>With party mode enabled, people can add songs to a queue that plays. With party mode disabled you can play a private playlist on loop.</small><br>
				<div v-if="$parent.station.partyMode">
					<br>
					<br>
					<label class='label'>Queue lock</label>
					<small v-if="$parent.station.partyMode">With the queue locked, only owners (you) can add songs to the queue.</small><br>
					<button class='button is-danger' v-if='!$parent.station.locked' @click="$parent.toggleLock()">Lock the queue</button>
					<button class='button is-success' v-if='$parent.station.locked' @click="$parent.toggleLock()">Unlock the queue</button>
				</div>
			</div>
			<div slot='footer'>
				<button class='button is-success' @click='update()'>Update Settings</button>
				<button class='button is-danger' @click='deleteStation()' v-if="$parent.type === 'community'">Delete station</button>
			</div>
		</modal>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import Modal from './Modal.vue';
	import io from '../../io';
	import validation from '../../validation';

	export default {
		data: function() {
			return {
				editing: {
					_id: '',
					name: '',
					type: '',
					displayName: '',
					description: '',
					privacy: 'private',
					partyMode: false
				}
			}
		},
		methods: {
			update: function () {
				if (this.$parent.station.name !== this.editing.name) this.updateName();
				if (this.$parent.station.displayName !== this.editing.displayName) this.updateDisplayName();
				if (this.$parent.station.description !== this.editing.description) this.updateDescription();
				if (this.$parent.station.privacy !== this.editing.privacy) this.updatePrivacy();
				if (this.$parent.station.partyMode !== this.editing.partyMode) this.updatePartyMode();
			},
			updateName: function () {
				const name = this.editing.name;
				if (!validation.isLength(name, 2, 16)) return Toast.methods.addToast('Name must have between 2 and 16 characters.', 8000);
				if (!validation.regex.az09_.test(name)) return Toast.methods.addToast('Invalid name format. Allowed characters: a-z, 0-9 and _.', 8000);


				this.socket.emit('stations.updateName', this.editing._id, name, res => {
					if (res.status === 'success') {
						if (this.$parent.station) _this.$parent.station.name = name;
						else {
							this.$parent.stations.forEach((station, index) => {
								if (station._id === this.editing._id) return this.$parent.stations[index].name = name;
							});
						}
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updateDisplayName: function () {
				const displayName = this.editing.displayName;
				if (!validation.isLength(displayName, 2, 32)) return Toast.methods.addToast('Display name must have between 2 and 32 characters.', 8000);
				if (!validation.regex.azAZ09_.test(displayName)) return Toast.methods.addToast('Invalid display name format. Allowed characters: a-z, A-Z, 0-9 and _.', 8000);


				this.socket.emit('stations.updateDisplayName', this.editing._id, displayName, res => {
					if (res.status === 'success') {
						if (this.$parent.station) _this.$parent.station.displayName = displayName;
						else {
							this.$parent.stations.forEach((station, index) => {
								if (station._id === this.editing._id) return this.$parent.stations[index].displayName = displayName;
							});
						}
					}
					Toast.methods.addToast(res.message, 8000);
				});
			},
			updateDescription: function () {
				const description = this.editing.description;
				if (!validation.isLength(description, 2, 200)) return Toast.methods.addToast('Description must have between 2 and 200 characters.', 8000);
				let characters = description.split("");
				characters = characters.filter(function(character) {
					return character.charCodeAt(0) === 21328;
				});
				if (characters.length !== 0) return Toast.methods.addToast('Invalid description format. Swastika\'s are not allowed.', 8000);


				this.socket.emit('stations.updateDescription', this.editing._id, description, res => {
					if (res.status === 'success') {
						if (_this.$parent.station) _this.$parent.station.description = description;
						else {
							_this.$parent.stations.forEach((station, index) => {
								if (station._id === station._id) return _this.$parent.stations[index].description = description;
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
			editStation: function(station) {
				for (let prop in station) {
					this.editing[prop] = station[prop];
				}
				this.$parent.modals.editStation = true;
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

	.select:after { border-color: #029ce3; }
</style>
