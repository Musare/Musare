<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.songslist'>
		<div class='inner-wrapper'>
			<div class='title' v-if='$parent.type === "community"'>Queue</div>
			<div class='title' v-else>Playlist</div>

			<article class="media" v-if="!$parent.noSong">
				<figure class="media-left" v-if="$parent.currentSong.thumbnail">
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
			<p v-if="$parent.noSong" class="center">There is currently no song playing.</p>

			<article class="media" v-for='song in $parent.songsList'>
				<div class="media-content">
					<div class="content" style="display: block;padding-top: 10px;">
							<strong class="songTitle">{{ song.title }}</strong>
							<small>{{ song.artists.join(', ') }}</small>
							<div v-if="this.$parent.$parent.type === 'community' && this.$parent.$parent.station.partyMode === true">
								<small>Requested by <b>{{this.$parent.$parent.$parent.getUsernameFromId(song.requestedBy)}} {{this.userIdMap['Z' + song.requestedBy]}}</b></small>
								<i class="material-icons" style="vertical-align: middle;" @click="removeFromQueue(song.songId)" v-if="isOwnerOnly() || isAdminOnly()">delete_forever</i>
							</div>
					</div>
				</div>
				<div class="media-right">
					{{ $parent.$parent.formatTime(song.duration) }}
				</div>
			</article>
			<div v-if="$parent.type === 'community' && $parent.$parent.loggedIn && $parent.station.partyMode === true">
				<button class='button add-to-queue' @click='$parent.modals.addSongToQueue = !$parent.modals.addSongToQueue' v-if="($parent.station.locked && isOwnerOnly()) || !$parent.station.locked || ($parent.station.locked && isAdminOnly() && dismissedWarning)">Add Song to Queue</button>
				<button class='button add-to-queue add-to-queue-warning' @click='dismissedWarning = true' v-if="$parent.station.locked && isAdminOnly() && !isOwnerOnly() && !dismissedWarning">THIS STATION'S QUEUE IS LOCKED.</button>
				<button class='button add-to-queue add-to-queue-disabled' v-if="$parent.station.locked && !isAdminOnly() && !isOwnerOnly()">THIS STATION'S QUEUE IS LOCKED.</button>
			</div>
		</div>
	</div>
</template>

<script>
	import io from '../../io';
	import { Toast } from 'vue-roaster';

	export default {
		data: function () {
			return {
				dismissedWarning: false,
				userIdMap: this.$parent.$parent.userIdMap
			}
		},
		methods: {
			isOwnerOnly: function () {
				return this.$parent.$parent.loggedIn && this.$parent.$parent.userId === this.$parent.station.owner;
			},
			isAdminOnly: function() {
				return this.$parent.$parent.loggedIn && this.$parent.$parent.role === 'admin';
			},
			removeFromQueue: function(songId) {
				socket.emit('stations.removeFromQueue', this.$parent.station._id, songId, res => {
					if (res.status === 'success') {
						Toast.methods.addToast('Successfully removed song from the queue.', 4000);
					} else Toast.methods.addToast(res.message, 8000);
				});
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

	.add-to-queue.add-to-queue-warning {
		background-color: red;
	}

	.add-to-queue.add-to-queue-disabled {
		background-color: gray;
	}
	.add-to-queue.add-to-queue-disabled:focus {
		background-color: gray;
	}

	.add-to-queue:focus { background: #029ce3; }

	.media-right { line-height: 64px; }

	.songTitle {
		word-wrap: break-word;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-height: 20px;
		max-height: 40px;
	}

</style>
