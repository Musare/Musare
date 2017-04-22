<template>
	<modal title='Create Playlist'>
		<div slot='body'>
			<p class='control is-expanded'>
				<input class='input' type='text' placeholder='Playlist Display Name' v-model='playlist.displayName' autofocus @keyup.enter='createPlaylist()'>
			</p>
		</div>
		<div slot='footer'>
			<a class='button is-info' @click='createPlaylist()'>Create Playlist</a>
		</div>
	</modal>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import Modal from '../Modal.vue';
	import io from '../../../io';

	export default {
		components: { Modal },
		data() {
			return {
				playlist: {
					displayName: null,
					songs: [],
					createdBy: this.$parent.$parent.username,
					createdAt: Date.now()
				}
			}
		},
		methods: {
			createPlaylist: function () {
				let _this = this;
				_this.socket.emit('playlists.create', _this.playlist, res => {
					Toast.methods.addToast(res.message, 3000);
				});
				this.$parent.modals.createPlaylist = !this.$parent.modals.createPlaylist;
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
			});
		},
		events: {
			closeModal: function() {
				this.$parent.modals.createPlaylist = !this.$parent.modals.createPlaylist;
			}
		}
	}
</script>

<style type='scss' scoped>
	.menu { padding: 0 20px; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	.menu-list a:hover { color: #000 !important; }

	li a {
		display: flex;
    	align-items: center;
	}

	.controls {
		display: flex;

		a {
			display: flex;
    		align-items: center;
		}
	}

	.table {
		margin-bottom: 0;
	}

	h5 { padding: 20px 0; }
</style>