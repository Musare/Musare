<template>
	<station-header></station-header>
	<div class="station">
		<div class="columns is-mobile">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<div class="video-container">
					<div id="player"></div>
				</div>
			</div>
		</div>
		<div class="columns is-mobile">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<!--<button v-if="paused" @click="unpauseStation()">Unpause</button>-->
				<!--<button v-if="!paused" @click="pauseStation()">Pause</button>-->
				<div class="columns is-mobile">
					<div class="column is-8-desktop is-12-mobile">
						<h4 id="time-display">{{timeElapsed}} / {{currentSong.duration}}</h4>
						<h3>{{currentSong.title}}</h3>
						<h4 class="thin" style="margin-left: 0">{{currentSong.artists}}</h4>
						<div class="columns is-mobile">
							<form style="margin-top: 12px; margin-bottom: 0;" action="#" class="column is-7-desktop is-4-mobile">
								<p style="margin-top: 0; position: relative;">
									<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="changeVolume()" v-on:input="changeVolume()">
								</p>
							</form>
							<div class="column is-8-mobile is-5-desktop" style="float: right;">
								<ul id="ratings">
									<li id="like" class="right"><span class="flow-text">{{currentSong.likes}} </span> <i id="thumbs_up" class="material-icons grey-text">thumb_up</i></li>
									<li style="margin-right: 10px;" id="dislike" class="right"><span class="flow-text">{{currentSong.dislikes}} </span><i id="thumbs_down" class="material-icons grey-text">thumb_down</i></li>
								</ul>
							</div>
						</div>
						<div class="seeker-bar-container white" id="preview-progress">
							<div class="seeker-bar light-blue" style="width: 60.9869%;"></div>
						</div>
					</div>
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
								<a class="button is-success" @click="addSongToQueue(result)">
									Add
								</a>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	</div>
</template>

<script>
	import StationHeader from '../StationHeader.vue'

	export default {
		data() {
			return {
				isActive: false,
				playerReady: false,
				currentSong: {},
				player: undefined,
				timePaused: 0,
				paused: false,
				timeElapsed: "00:00:00",
				interval: 0,
				querySearch: "",
				queryResults: [],
				queue: []
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
					videoId: local.currentSong.id,
					playerVars: {controls: 1, iv_load_policy: 3, rel: 0, showinfo: 0},
					events: {
						'onReady': function(event) {
							local.playerReady = true;
							let volume = parseInt(localStorage.getItem("volume"));
							volume = (typeof volume === "number") ? volume : 20;
							local.player.setVolume(volume);
							if (volume > 0) {
								local.player.unMute();
							}
							local.playVideo();
						},
						'onStateChange': function(event) {
							if (event.data === 1 && local.videoLoading === true) {
								local.videoLoading = false;
								local.player.seekTo(local.getTimeElapsed() / 1000, true);
								if (local.paused) {
									local.player.pauseVideo();
								}
							}
						}
					}
				});
			},
			getTimeElapsed: function() {
				let local = this;
				if (local.currentSong !== undefined) {
					return Date.now() - local.currentSong.startedAt - local.timePaused;
				} else {
					return 0;
				}
			},
			playVideo: function() {
				let local = this;
				if (local.playerReady) {
					local.videoLoading = true;
					local.player.loadVideoById(local.currentSong.id);

					local.currentSong.artists = local.currentSong.artists.join(", ");

					if (local.interval !== 0) {
						clearInterval(local.interval);
					}

					local.interval = setInterval(function () {
						local.resizeSeekerbar();
						local.calculateTimeElapsed();
					}, 250);
				}
			},
			resizeSeekerbar: function() {
				let local = this;
				if (!local.paused) {
					$(".seeker-bar").width(((local.getTimeElapsed() / 1000) / local.currentSong.duration * 100) + "%");
				}
			},
			calculateTimeElapsed: function() {
				let local = this;
				let currentTime = Date.now();

				if (local.currentTime !== undefined && local.paused) {
					local.timePaused += (Date.now() - local.currentTime);
					local.currentTime = undefined;
				}

				let duration = (Date.now() - local.currentSong.startedAt - local.timePaused) / 1000;
				let songDuration = moment.duration(local.currentSong.duration, "hh:mm:ss").asSeconds();
				if (songDuration <= duration) {
					local.player.pauseVideo();
				}

				let d = moment.duration(duration, 'seconds');
				if ((!local.paused || local.timeElapsed === "0:00") && duration <= songDuration) {
					local.timeElapsed = (d.hours() < 10 ? ("0" + d.hours() + ":") : (d.hours() + ":")) + (d.minutes() < 10 ? ("0" + d.minutes() + ":") : (d.minutes() + ":")) + (d.seconds() < 10 ? ("0" + d.seconds()) : d.seconds());
				}
			},
			changeVolume: function() {
				let local = this;
				let volume = $("#volumeSlider").val();
				localStorage.setItem("volume", volume);
				if (local.playerReady) {
					local.player.setVolume(volume);
					if (volume > 0) {
						local.player.unMute();
					}
				}
			},
			unpauseStation: function() {
				let local = this;
				local.paused = false;
				if (local.playerReady) {
					local.player.seekTo(local.getTimeElapsed() / 1000);
					local.player.playVideo();
				}
			},
			pauseStation: function() {
				let local = this;
				local.paused = true;
				if (local.playerReady) {
					local.player.pauseVideo();
				}
			},
			addSongToQueue: function(song) {
				let local = this;
				local.socket.emit("/stations/add/:song", local.$route.params.id, song, function(data) {
					if (data) console.log(data);
				});
			},
			submitQuery: function() {
				let local = this;
				local.socket.emit("/youtube/getVideo/:query", local.querySearch, function(data) {
					local.queryResults = [];
					for (let i = 0; i < data.items.length; i++) {
						local.queryResults.push({
							id: data.items[i].id.videoId,
							url: `https://www.youtube.com/watch?v=${this.id}`,
							title: data.items[i].snippet.title,
							thumbnail: data.items[i].snippet.thumbnails.default.url
						});
					}
				});
			}
		},
		ready: function() {
			let local = this;

			local.interval = 0;

			local.socket = this.$parent.socket;
			local.stationSocket = io.connect(`${window.location.protocol + '//' + window.location.hostname + ':8081'}/${local.$route.params.id}`);
			local.stationSocket.on("connected", function(data) {
				local.currentSong = data.currentSong;
				local.paused = data.paused;
				local.timePaused = data.timePaused;
				local.currentTime  = data.currentTime;
			});

			local.youtubeReady();

			local.stationSocket.on("nextSong", function(currentSong) {
				local.currentSong = currentSong;
				local.timePaused = 0;
				local.playVideo();
			});

			let volume = parseInt(localStorage.getItem("volume"));
			volume = (typeof volume === "number") ? volume : 20;
			$("#volumeSlider").val(volume);
		},
		components: { StationHeader }
	}
</script>

<style lang="sass">
	.modal-large {
		width: 75%;
	}

	.station {
		flex: 1 0 auto;
		padding-top: 4.5vw;
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

	#thumbs_up:hover {
		color: #87D37C !important;
	}

	#thumbs_down:hover {
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
		margin-top: 20px;
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
