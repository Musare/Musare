<template>
	<station-header></station-header>
	<div class="station">
		<div class="columns is-mobile">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<div class="video-container">
					<div id="player"></div>
					<div class="seeker-bar-container white" id="preview-progress">
						<div class="seeker-bar light-blue" style="width: 60.9869%;"></div>
					</div>
				</div>
			</div>
		</div>
		<div class="columns is-mobile">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<!--<button v-if="paused" @click="unpauseStation()">Unpause</button>-->
				<!--<button v-if="!paused" @click="pauseStation()">Pause</button>-->
				<div class="columns is-mobile">
					<div class="column is-8-desktop is-12-mobile">
						<h4 id="time-display">{{timeElapsed}} / {{formatTime(currentSong.duration)}}</h4>
						<h3>{{currentSong.title}}</h3>
						<h4 class="thin" style="margin-left: 0">{{currentSong.artists}}</h4>
						<div class="columns is-mobile">
							<form style="margin-top: 12px; margin-bottom: 0;" action="#" class="column is-7-desktop is-4-mobile">
								<p style="margin-top: 0; position: relative;">
									<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="changeVolume()" v-on:input="changeVolume()">
								</p>
							</form>
							<div class="column is-8-mobile is-5-desktop" style="float: right;">
								<ul id="ratings" v-if="currentSong.likes !== -1 && currentSong.dislikes !== -1">
									<li id="like" class="right" @click="toggleLike()"><span class="flow-text">{{currentSong.likes}} </span> <i id="thumbs_up" class="material-icons grey-text" v-bind:class="{liked: liked}">thumb_up</i></li>
									<li style="margin-right: 10px;" id="dislike" class="right" @click="toggleDislike()"><span class="flow-text">{{currentSong.dislikes}} </span><i id="thumbs_down" class="material-icons grey-text" v-bind:class="{disliked: disliked}">thumb_down</i></li>
								</ul>
							</div>
						</div>
					</div>
					<button @click="addSongToQueue('aHjpOzsQ9YI')">ADD CRYSTALIZE!</button>
					<div class="column is-4-desktop is-12-mobile">
						<img class="image" id="song-thumbnail" style="margin-top: 10px !important" :src="currentSong.thumbnail" alt="Song Thumbnail" />
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="modal" :class="{ 'is-active': isActive }">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Add Songs to Station</p>
				<button class="delete" @click="toggleModal()" ></button>
			</header>
			<section class="modal-card-body">
				<div class="control is-grouped">
					<p class="control is-expanded">
						<input class="input" type="text" placeholder="YouTube Query" v-model="querySearch">
					</p>
					<p class="control">
						<a class="button is-info" @click="submitQuery()">
							Search
						</a>
					</p>
				</div>
				<table class="table">
					<tbody>
						<tr v-for="result in queryResults">
							<td>
								<img :src="result.thumbnail" />
							</td>
							<td>{{result.title}}</td>
							<td>
								<a class="button is-success" @click="addSongToQueue(result.id)">
									Add
								</a>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	</div>
	<div class="slideout" v-if="slideout.playlist">
		<h5 class="slideout-header">Playlist</h5>
		<div class="slideout-content">

		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import StationHeader from './StationHeader.vue';

	export default {
		data() {
			return {
				isActive: false,
				playerReady: false,
				currentSong: {},
				player: undefined,
				timePaused: 0,
				paused: false,
				timeElapsed: "0:00",
				interval: 0,
				querySearch: "",
				queryResults: [],
				queue: [],
				slideout: {
					playlist: false
				},
				liked: false,
				disliked: false
			}
		},
		methods: {
			toggleModal: function() {
				this.isActive = !this.isActive;
			},
			youtubeReady: function() {
				let local = this;
				local.player = new YT.Player("player", {
					height: 270,
					width: 480,
					videoId: local.currentSong._id,
					playerVars: { controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0 },
					events: {
						'onReady': function(event) {
							local.playerReady = true;
							let volume = parseInt(localStorage.getItem("volume"));
							volume = (typeof volume === "number") ? volume : 20;
							local.player.setVolume(volume);
							if (volume > 0) local.player.unMute();
							local.playVideo();
						},
						'onStateChange': function(event) {
							if (event.data === 1 && local.videoLoading === true) {
								local.videoLoading = false;
								local.player.seekTo(local.getTimeElapsed() / 1000, true);
								if (local.paused) local.player.pauseVideo();
							}
						}
					}
				});
			},
			getTimeElapsed: function() {
				let local = this;
				if (local.currentSong) {
					return Date.now() - local.startedAt - local.timePaused;
				} else {
					return 0;
				}
			},
			playVideo: function() {
				let local = this;
				if (local.playerReady) {
					local.videoLoading = true;
					local.player.loadVideoById(local.currentSong._id);

					if (local.currentSong.artists) local.currentSong.artists = local.currentSong.artists.join(", ");
					if (local.interval !== 0) clearInterval(local.interval);
					local.interval = setInterval(function () {
						local.resizeSeekerbar();
						local.calculateTimeElapsed();
					}, 250);
				}
			},
			resizeSeekerbar: function() {
				let local = this;
				if (!local.paused) {
					$(".seeker-bar").width(parseInt(((local.getTimeElapsed() / 1000) / local.currentSong.duration * 100)) + "%");
				}
			},
			formatTime: function(duration) {
				let d = moment.duration(duration, 'seconds');
				return ((d.hours() > 0) ? (d.hours() < 10 ? ("0" + d.hours() + ":") : (d.hours() + ":")) : "") + (d.minutes() + ":") + (d.seconds() < 10 ? ("0" + d.seconds()) : d.seconds());
			},
			calculateTimeElapsed: function() {
				let local = this;
				let currentTime = Date.now();

				if (local.currentTime !== undefined && local.paused) {
					local.timePaused += (Date.now() - local.currentTime);
					local.currentTime = undefined;
				}

				let duration = (Date.now() - local.startedAt - local.timePaused) / 1000;
				let songDuration = local.currentSong.duration;
				if (songDuration <= duration) local.player.pauseVideo();
				if ((!local.paused) && duration <= songDuration) local.timeElapsed = local.formatTime(duration);
			},
			changeVolume: function() {
				let local = this;
				let volume = $("#volumeSlider").val();
				localStorage.setItem("volume", volume);
				if (local.playerReady) {
					local.player.setVolume(volume);
					if (volume > 0) local.player.unMute();
				}
			},
			resumeLocalStation: function() {
				this.paused = false;
				if (this.playerReady) {
					this.player.seekTo(this.getTimeElapsed() / 1000);
					this.player.playVideo();
				}
			},
			pauseLocalStation: function() {
				this.paused = true;
				if (this.playerReady) this.player.pauseVideo();
			},
			skipStation: function () {
				let _this = this;
				_this.socket.emit('stations.forceSkip', _this.stationId, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					} else {
						Toast.methods.addToast('Successfully skipped the station\'s current song.', 4000);
					}
				});
			},
			resumeStation: function () {
				let _this = this;
				_this.socket.emit('stations.resume', _this.stationId, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					} else {
						Toast.methods.addToast('Successfully resumed the station.', 4000);
					}
				});
			},
			pauseStation: function () {
				let _this = this;
				_this.socket.emit('stations.pause', _this.stationId, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					} else {
						Toast.methods.addToast('Successfully paused the station.', 4000);
					}
				});
			},
			addSongToQueue: function(songId) {
				let local = this;
				local.socket.emit('queueSongs.add', songId, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					} else {
						Toast.methods.addToast(`${data.message}`, 4000);
					}
				});
			},
			submitQuery: function() {
				let local = this;
				local.socket.emit('apis.searchYoutube', local.querySearch, results => {
					results = results.data;
					local.queryResults = [];
					for (let i = 0; i < results.items.length; i++) {
						local.queryResults.push({
							id: results.items[i].id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: results.items[i].snippet.title,
							thumbnail: results.items[i].snippet.thumbnails.default.url
						});
					}
				});
			},
			toggleLike: function() {
				let _this = this;
				if (_this.liked) _this.socket.emit('songs.unlike', _this.currentSong._id, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					}
				}); else _this.socket.emit('songs.like', _this.currentSong._id, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					}
				});
			},
			toggleDislike: function() {
				let _this = this;
				if (_this.disliked) return _this.socket.emit('songs.undislike', _this.currentSong._id, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					}
				});
				_this.socket.emit('songs.dislike', _this.currentSong._id, data => {
					if (data.status !== 'success') {
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
					}
				});
			}
		},
		ready: function() {
			let _this = this;
			_this.stationId = _this.$route.params.id;
			_this.interval = 0;

			_this.socket = _this.$parent.socket;
			_this.socket.emit('stations.join', _this.stationId, data => {
				if (data.status === "success") {
					_this.currentSong = data.currentSong;
					_this.startedAt = data.startedAt;
					_this.paused = data.paused;
					_this.timePaused = data.timePaused;
					_this.youtubeReady();
					_this.playVideo();
					_this.socket.emit('songs.getOwnSongRatings', data.currentSong._id, data => {
						if (_this.currentSong._id === data.songId) {
							_this.liked = data.liked;
							_this.disliked = data.disliked;
						}
					});
				} else {
					//TODO Handle error
				}
			});

			_this.socket.on('event:songs.next', data => {
				_this.currentSong = data.currentSong;
				_this.startedAt = data.startedAt;
				_this.paused = data.paused;
				_this.timePaused = data.timePaused;
				_this.playVideo();
				_this.socket.emit('songs.getOwnSongRatings', data.currentSong._id, (data) => {
					if (_this.currentSong._id === data.songId) {
						_this.liked = data.liked;
						_this.disliked = data.disliked;
					}
				});
			});

			_this.socket.on('event:stations.pause', data => {
				_this.pauseLocalStation();
			});

			_this.socket.on('event:stations.resume', data => {
				_this.timePaused = data.timePaused;
				_this.resumeLocalStation();
			});

			_this.socket.on('event:song.like', data => {
				if (data.songId === _this.currentSong._id) {
					_this.currentSong.likes++;
					if (data.undisliked) _this.currentSong.dislikes--;
				}
			});

			_this.socket.on('event:song.dislike', data => {
				if (data.songId === _this.currentSong._id) {
					_this.currentSong.dislikes++;
					if (data.unliked) _this.currentSong.likes--;
				}
			});

			_this.socket.on('event:song.unlike', data => {
				if (data.songId === _this.currentSong._id) _this.currentSong.likes--;
			});

			_this.socket.on('event:song.undislike', data => {
				if (data.songId === _this.currentSong._id) _this.currentSong.dislikes--;
			});

			_this.socket.on('event:song.newRatings', data => {
				console.log(data, 1234);
				if (data.songId === _this.currentSong._id) {
					_this.liked = data.liked;
					_this.disliked = data.disliked;
				}
			});

			let volume = parseInt(localStorage.getItem("volume"));
			volume = (typeof volume === "number") ? volume : 20;
			$("#volumeSlider").val(volume);
		},
		components: { StationHeader }
	}
</script>

<style lang="scss">
	.slideout {
		top: 50px;
		height: 100%;
		position: fixed;
		right: 0;
		width: 350px;
		background-color: white;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
		.slideout-header {
			text-align: center;
			background-color: rgb(3, 169, 244) !important;
			margin: 0;
			padding-top: 5px;
			padding-bottom: 7px;
			color: white;
		}

		.slideout-content {
			height: 100%;
		}
	}

	.modal-large {
		width: 75%;
	}

	.station {
		flex: 1 0 auto;
		padding-top: 0.5vw;
		transition: all 0.1s;
		margin: 0 auto;
		max-width: 1280px;
		width: 90%;

		@media only screen and (min-width: 993px) {
			width: 70%;
		}

		@media only screen and (min-width: 601px) {
			width: 85%;
		}

		input[type=range] {
			-webkit-appearance: none;
			width: 100%;
			margin: 7.3px 0;
		}

		input[type=range]:focus {
			outline: none;
		}

		input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 0;
			border: 0;
		}

		input[type=range]::-webkit-slider-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}

		input[type=range]::-moz-range-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 0;
			border: 0;
		}

		input[type=range]::-moz-range-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}

		input[type=range]::-ms-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 1.3px;
		}

		input[type=range]::-ms-fill-lower {
			background: #c2c0c2;
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type=range]::-ms-fill-upper {
			background: #c2c0c2;
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type=range]::-ms-thumb {
			box-shadow: 0;
			border: 0;
			height: 15px;
			width: 15px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: 1.5px;
		}

		.video-container {
			position: relative;
			padding-bottom: 56.25%;
			height: 0;
			overflow: hidden;

			iframe {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
			}
		}
		.video-col {
			padding-right: 0.75rem;
			padding-left: 0.75rem;
		}
	}

	.room-title {
		left: 50%;
		-webkit-transform: translateX(-50%);
		transform: translateX(-50%);
		font-size: 2.1em;
	}

	#ratings {
		span {
			font-size: 1.68rem;
		}

		i {
			color: #9e9e9e !important;
			cursor: pointer;
			transition: 0.1s color;
		}
	}

	#time-display {
		margin-top: 30px;
		float: right;
	}

	#thumbs_up:hover, #thumbs_up.liked {
		color: #87D37C !important;
	}

	#thumbs_down:hover, #thumbs_down.disliked {
		color: #EC644B !important;
	}

	#song-thumbnail {
		max-width: 100%;
		width: 85%;
	}

	.seeker-bar-container {
		position: relative;
		height: 5px;
		display: block;
		width: 100%;
		overflow: hidden;
	}

	.seeker-bar {
		top: 0;
		left: 0;
		bottom: 0;
		position: absolute;
	}

	ul {
		list-style: none;
		margin: 0;
		display: block;
	}

	h1, h2, h3, h4, h5, h6 {
		font-weight: 400;
		line-height: 1.1;
	}

	h1 a, h2 a, h3 a, h4 a, h5 a, h6 a {
		font-weight: inherit;
	}

	h1 {
		font-size: 4.2rem;
		line-height: 110%;
		margin: 2.1rem 0 1.68rem 0;
	}

	h2 {
		font-size: 3.56rem;
		line-height: 110%;
		margin: 1.78rem 0 1.424rem 0;
	}

	h3 {
		font-size: 2.92rem;
		line-height: 110%;
		margin: 1.46rem 0 1.168rem 0;
	}

	h4 {
		font-size: 2.28rem;
		line-height: 110%;
		margin: 1.14rem 0 0.912rem 0;
	}

	h5 {
		font-size: 1.64rem;
		line-height: 110%;
		margin: 0.82rem 0 0.656rem 0;
	}

	h6 {
		font-size: 1rem;
		line-height: 110%;
		margin: 0.5rem 0 0.4rem 0;
	}

	.thin {
		font-weight: 200;
	}

	.left {
		float: left !important;
	}

	.right {
		float: right !important;
	}

	.light-blue {
		background-color: #03a9f4 !important;
	}

	.white {
		background-color: #FFFFFF !important;
	}

	.btn-search {
		font-size: 14px;
	}
</style>
