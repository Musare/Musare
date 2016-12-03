<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Create Playlist</p>
				<button class='delete' @click='$parent.toggleModal("createPlaylist")'></button>
			</header>
			<section class='modal-card-body'>
				<p class='control is-expanded'>
					<input class='input' type='text' placeholder='Playlist ID' v-model='playlist.id'>
				</p>
				<p class='control is-expanded'>
					<input class='input' type='text' placeholder='Playlist Display Name' v-model='playlist.displayName'>
				</p>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-info' @click='createPlaylist()'>Create Playlist</a>
			</footer>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	export default {
		data() {
			return {
				playlist: {
					id: null,
					displayName: null
				}
			}
		},
		methods: {
			createPlaylist: function () {
				// socket
				this.$parent.toggleModal("createPlaylist");
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.$parent.socket) {
					_this.socket = _this.$parent.$parent.socket;
					clearInterval(socketInterval);
				}
			}, 100);
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