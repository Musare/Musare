<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Create community station</p>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
				<label class='label'>Unique ID (lowercase, a-z, used in the url)</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Name...' v-model='newCommunity._id'>
				</p>
				<label class='label'>Display Name</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Display name...' v-model='newCommunity.displayName'>
				</p>
				<label class='label'>Description</label>
				<p class='control'>
					<input class='input' type='text' placeholder='Description...' v-model='newCommunity.description'>
				</p>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-primary' @click='submitModal()'>Create</a>
			</footer>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				newCommunity: {
					_id: '',
					displayName: '',
					description: ''
				}
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					clearInterval(socketInterval);
				}
			}, 100);
		},
		methods: {
			toggleModal: function () {
				this.$dispatch('toggleModal', 'createCommunityStation');
			},
			submitModal: function () {
				let _this = this;
				if (_this.newCommunity._id == '') return Toast.methods.addToast('ID cannot be a blank field', 3000);
				if (_this.newCommunity.displayName == '') return Toast.methods.addToast('Display Name cannot be a blank field', 3000);
				if (_this.newCommunity.description == '') return Toast.methods.addToast('Description cannot be a blank field', 3000);
				this.socket.emit('stations.create', {
					_id: _this.newCommunity._id,
					type: 'community',
					displayName: _this.newCommunity.displayName,
					description: _this.newCommunity.description
				}, res => {
					if (res.status === 'success') Toast.methods.addToast(`You have added the station successfully`, 4000);
					else Toast.methods.addToast(res.message, 4000);
				});
				this.toggleModal();
			}
		}
	}
</script>