<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.songslist'>
		<div class='inner-wrapper'>
			<div class='title' v-if='$parent.type === "community"'>Queue</div>
			<div class='title' v-else>Playlist</div>

			<article class="media" v-if="!$parent.noSong">
				<figure class="media-left">
					<p class="image is-64x64">
						<img :src="$parent.currentSong.thumbnail" onerror="this.src='/assets/notes-transparent.png'">
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
				<div class="media-right">
					{{ $parent.formatTime($parent.currentSong.duration) }}
				</div>
			</article>

			<article class="media" v-for='song in $parent.songsList'>
				<div class="media-content">
					<div class="content">
						<p>
							<strong>{{ song.title }}</strong>
							<br>
							<small>{{ song.artists.join(', ') }}</small>
						</p>
					</div>
				</div>
				<div class="media-right">
					{{ $parent.$parent.formatTime(song.duration) }}
				</div>
			</article>
			<a class='button add-to-queue' href='#' @click='$parent.modals.addSongToQueue = !$parent.modals.addSongToQueue' v-if="$parent.type === 'community'">Add Song to Queue</a>
		</div>
	</div>
</template>

<script>
	import io from '../../io';

	export default {
		data: function () {
			return {

			}
		},
		ready: function () {
			/*let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;

			});*/
		}
	}
</script>

<style type='scss' scoped>
	.sidebar {
		position: fixed;
		z-index: 1;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		background-color: #fff;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.inner-wrapper {	
		top: 64px;
		position: relative;
		overflow: auto;
		height: 100%;
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

	.media { padding: 0 25px; }

	.media-content .content {
		min-height: 64px;
		display: flex;
		align-items: center;
	}

	.content p strong { word-break: break-word; }
	
	.content p small { word-break: break-word; }

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
	
	.add-to-queue:focus { background: #029ce3; }

	.media-right { line-height: 64px; }
</style>