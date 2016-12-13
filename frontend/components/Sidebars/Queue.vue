<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.queue'>
		<div class='inner-wrapper'>
			<div class='title'>Queue</div>

			<article class="media">
				<figure class="media-left">
					<p class="image is-64x64">
						<img :src="$parent.currentSong.thumbnail" onerror="this.src='/assets/notes.png'">
					</p>
				</figure>
				<div class="media-content">
					<div class="content">
						<p>
							Current Song: <strong>{{ $parent.currentSong.title }}</strong>
							<br>
							<small>{{ $parent.currentSong.artists }}</small>
						</p>
					</div>
				</div>
			</article>

			<article class="media" v-for='song in $parent.queue'>
				<div class="media-content">
					<div class="content">
						<p>
							<strong>{{ song.title }}</strong>
							<br>
							<small>{{ song.artists }}</small>
						</p>
					</div>
				</div>
			</article>

			<a class='button add-to-queue' @click='$parent.toggleModal("addSongToQueue")'>Add Song to Queue</a>
		</div>
	</div>
</template>

<script>
	import io from '../../io';

	export default {
		data() {
			return {
				playlist: []
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('stations.getPlaylist', _this.$parent.stationId, res => {
					if (res.status == 'success') _this.playlist = res.data;
				});
			});
		}
	}
</script>

<style type='scss' scoped>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		background-color: #fff;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.inner-wrapper {	
		top: 50px;
		position: relative;
	}

	.slide-transition {
		transition: transform 0.6s ease-in-out;
		transform: translateX(0);
	}

	.slide-enter, .slide-leave { transform: translateX(100%); }

	.title {
		background-color: rgb(3, 169, 244);
		text-align: center;
		padding: 10px;
		color: white;
		font-weight: 600;
	}

	.add-to-queue {
		width: 100%;
    	margin-top: 25px;
		height: 40px;
		border-radius: 0;
		background: rgb(3, 169, 244);
    	color: #fff !important;
		border: 0;

		&:active, &:focus { border: 0; }
	}

	.media { padding: 0px 25px;}

	.media-content .content {
		height: 64px;
		display: flex;
		align-items: center;
	}
</style>