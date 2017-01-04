<template>
	<official-header v-if='type == "official"'></official-header>
	<community-header v-if='type == "community"'></community-header>

	<song-queue v-if='modals.addSongToQueue'></song-queue>
	<edit-playlist v-if='modals.editPlaylist'></edit-playlist>
	<create-playlist v-if='modals.createPlaylist'></create-playlist>
	<edit-station v-if='modals.editStation'></edit-station>
	<report v-if='modals.report'></report>

	<songs-list-sidebar v-if='sidebars.songslist'></songs-list-sidebar>
	<playlist-sidebar v-if='sidebars.playlist'></playlist-sidebar>
	<users-sidebar v-if='sidebars.users'></users-sidebar>
	
	<div class="station">
		<div v-show="noSong" class="no-song">
			<h1>No song is currently playing</h1>
			<h4 v-if='type === "community" && station.partyMode'>
				<a href='#' class='no-song' @click='modals.addSongToQueue = true'>Add a Song to the Queue</a>
			</h4>
			<h4 v-if='type === "community" && !station.partyMode && $parent.userId === station.owner && !station.privatePlaylist'>
				<a href='#' class='no-song' @click='sidebars.playlist = true'>Play a private playlist</a>
			</h4>
			<h1 v-if='type === "community" && !station.partyMode && $parent.userId === station.owner && station.privatePlaylist'>Maybe you can add some songs to your selected private playlist and then press the skip button</h1>
		</div>
		<div class="columns is-mobile" v-show="!noSong">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<div class="video-container">
					<div id="player"></div>
					<div class="seeker-bar-container white" id="preview-progress">
						<div class="seeker-bar light-blue" style="width: 0%;"></div>
					</div>
				</div>
			</div>
		</div>
		<div class="columns is-mobile" v-show="!noSong">
			<div class="column is-8-desktop is-offset-2-desktop is-12-mobile">
				<div class="columns is-mobile">
					<div class="column is-12-mobile" v-bind:class="{'is-8-desktop': !simpleSong}">
						<h4 id="time-display">{{timeElapsed}} / {{formatTime(currentSong.duration)}}</h4>
						<h3>{{currentSong.title}}</h3>
						<h4 class="thin" style="margin-left: 0">{{currentSong.artists}}</h4>
						<div class="columns is-mobile">
							<form style="margin-top: 12px; margin-bottom: 0;" action="#" class="column is-7-desktop is-4-mobile">
								<p class='volume-slider-wrapper'>
									<i class="material-icons" @click='toggleMute()' v-if='muted'>volume_mute</i>
									<i class="material-icons" @click='toggleMute()' v-else>volume_down</i>
									<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="changeVolume()" v-on:input="changeVolume()">
									<i class="material-icons" @click='toggleMaxVolume()'>volume_up</i>
								</p>
							</form>
							<div class="column is-8-mobile is-5-desktop" style="float: right;">
								<ul id="ratings" v-if="currentSong.likes !== -1 && currentSong.dislikes !== -1">
									<li id="like" class="right" @click="toggleLike()">
										<span class="flow-text">{{currentSong.likes}} </span>
										<i id="thumbs_up" class="material-icons grey-text" v-bind:class="{ liked: liked }">thumb_up</i>
										<a class='absolute-a behind' @click="toggleLike()" href='#'></a>
									</li>
									<li style="margin-right: 10px;" id="dislike" class="right" @click="toggleDislike()">
										<span class="flow-text">{{currentSong.dislikes}} </span>
										<i id="thumbs_down" class="material-icons grey-text" v-bind:class="{ disliked: disliked }">thumb_down</i>
										<a class='absolute-a behind' @click="toggleDislike()" href='#'></a>
									</li>
								</ul>
							</div>
						</div>
					</div>
					<div class="column is-4-desktop" v-if="!simpleSong">
						<img class="image" id="song-thumbnail" style="margin-top: 10px !important" :src="currentSong.thumbnail" alt="Song Thumbnail" onerror="this.src='/assets/notes-transparent.png'" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import SongQueue from '../Modals/AddSongToQueue.vue';
	import EditPlaylist from '../Modals/Playlists/Edit.vue';
	import CreatePlaylist from '../Modals/Playlists/Create.vue';
	import EditStation from '../Modals/EditStation.vue';
	import Report from '../Modals/Report.vue';

	import SongsListSidebar from '../Sidebars/SongsList.vue';
	import PlaylistSidebar from '../Sidebars/Playlist.vue';
	import UsersSidebar from '../Sidebars/UsersList.vue';

	import OfficialHeader from './OfficialHeader.vue';
	import CommunityHeader from './CommunityHeader.vue';
	import io from '../../io';
	import auth from '../../auth';

	export default {
		data() {
			return {
				type: '',
				playerReady: false,
				previousSong: null,
				currentSong: {},
				player: undefined,
				timePaused: 0,
				paused: false,
				muted: false,
				timeElapsed: '0:00',
				liked: false,
				disliked: false,
				modals: {
					addSongToQueue: false,
					editPlaylist: false,
					createPlaylist: false,
					editStation: false,
					report: false
				},
				sidebars: {
					songslist: false,
					users: false,
					playlist: false
				},
				noSong: false,
				simpleSong: false,
				songsList: [],
				timeBeforePause: 0,
				station: {},
				skipVotes: 0,
				privatePlaylistQueueSelected: null,
				automaticallyRequestedSongId: null,
				systemDifference: 0
			}
		},
		methods: {
			editPlaylist: function (id) {
				this.playlistBeingEdited = id;
				this.modals.editPlaylist = !this.modals.editPlaylist;
			},
			toggleSidebar: function (type) {
				Object.keys(this.sidebars).forEach(sidebar => {
					if (sidebar !== type) this.sidebars[sidebar] = false;
					else this.sidebars[type] = !this.sidebars[type];
				});
			},
			youtubeReady: function() {
				let local = this;
				if (!local.player) {
					local.player = new YT.Player("player", {
						height: 270,
						width: 480,
						videoId: local.currentSong._id,
						startSeconds: local.getTimeElapsed() / 1000 + local.currentSong.skipDuration,
						playerVars: {controls: 0, iv_load_policy: 3, rel: 0, showinfo: 0},
						events: {
							'onReady': function (event) {
								local.playerReady = true;
								let volume = parseInt(localStorage.getItem("volume"));
								volume = (typeof volume === "number") ? volume : 20;
								local.player.setVolume(volume);
								if (volume > 0) local.player.unMute();
								local.playVideo();
							},
							'onError': function(err) {
								console.log("iframe error", err);
								local.voteSkipStation();
							},
							'onStateChange': function (event) {
								if (event.data === 1 && local.videoLoading === true) {
									local.videoLoading = false;
									local.player.seekTo(local.getTimeElapsed() / 1000 + local.currentSong.skipDuration, true);
									if (local.paused) local.player.pauseVideo();
								} else if (event.data === 1 && local.paused) {
									local.player.seekTo(local.timeBeforePause / 1000, true);
									local.player.pauseVideo();
								}
								if (event.data === 2 && !local.paused && !local.noSong && (local.player.getDuration() / 1000) < local.currentSong.duration) {
									local.player.seekTo(local.getTimeElapsed() / 1000 + local.currentSong.skipDuration, true);
									local.player.playVideo();
								}
							}
						}
					});
				}
			},
			getTimeElapsed: function() {
				let local = this;
				if (local.currentSong) return Date.currently() - local.startedAt - local.timePaused;
				else return 0;
			},
			playVideo: function() {
				let local = this;
				if (local.playerReady) {
					local.videoLoading = true;
					local.player.loadVideoById(local.currentSong._id, local.getTimeElapsed() / 1000 + local.currentSong.skipDuration);

					if (local.currentSong.artists) local.currentSong.artists = local.currentSong.artists.join(", ");
					if (window.stationInterval !== 0) clearInterval(window.stationInterval);
					window.stationInterval = setInterval(function () {
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
				if (duration < 0) return "0:00";
				return ((d.hours() > 0) ? (d.hours() < 10 ? ("0" + d.hours() + ":") : (d.hours() + ":")) : "") + (d.minutes() + ":") + (d.seconds() < 10 ? ("0" + d.seconds()) : d.seconds());
			},
			calculateTimeElapsed: function() {
				let local = this;
				let currentTime = Date.currently();

				if (local.currentTime !== undefined && local.paused) {
					local.timePaused += (Date.currently() - local.currentTime);
					local.currentTime = undefined;
				}

				let duration = (Date.currently() - local.startedAt - local.timePaused) / 1000;
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
				if (!this.noSong) {
					if (this.playerReady) {
						this.player.seekTo(this.getTimeElapsed() / 1000 + this.currentSong.skipDuration);
						this.player.playVideo();
					}
				}
			},
			pauseLocalStation: function() {
				this.paused = true;
				if (!this.noSong) {
					this.timeBeforePause = this.getTimeElapsed();
					if (this.playerReady) this.player.pauseVideo();
				}
			},
			skipStation: function () {
				let _this = this;
				_this.socket.emit('stations.forceSkip', _this.stationId, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
					else Toast.methods.addToast('Successfully skipped the station\'s current song.', 4000);
				});
			},
			voteSkipStation: function () {
				let _this = this;
				_this.socket.emit('stations.voteSkip', _this.stationId, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
					else Toast.methods.addToast('Successfully voted to skip the current song.', 4000);
				});
			},
			resumeStation: function () {
				let _this = this;
				_this.socket.emit('stations.resume', _this.stationId, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
					else Toast.methods.addToast('Successfully resumed the station.', 4000);
				});
			},
			pauseStation: function () {
				let _this = this;
				_this.socket.emit('stations.pause', _this.stationId, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
					else Toast.methods.addToast('Successfully paused the station.', 4000);
				});
			},
			toggleMute: function () {
				if (this.playerReady) {
					let previousVolume = parseInt(localStorage.getItem("volume"));
					let volume = this.player.getVolume() <= 0 ? previousVolume : 0;
					this.muted = !this.muted;
					$("#volumeSlider").val(volume);
					this.player.setVolume(volume);
				}
			},
			toggleMaxVolume: function () {
				if (this.playerReady) {
					let previousVolume = parseInt(localStorage.getItem("volume"));
					let volume = this.player.getVolume() <= previousVolume ? 100 : previousVolume;
					$("#volumeSlider").val(volume);
					this.player.setVolume(volume);
				}
			},
			toggleLike: function() {
				let _this = this;
				if (_this.liked) _this.socket.emit('songs.unlike', _this.currentSong._id, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
				}); else _this.socket.emit('songs.like', _this.currentSong._id, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
				});
			},
			toggleDislike: function() {
				let _this = this;
				if (_this.disliked) return _this.socket.emit('songs.undislike', _this.currentSong._id, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
				});
				_this.socket.emit('songs.dislike', _this.currentSong._id, data => {
					if (data.status !== 'success') Toast.methods.addToast(`Error: ${data.message}`, 8000);
				});
			},
			addFirstPrivatePlaylistSongToQueue: function() {
				let _this = this;
				let isInQueue = false;
				let userId = _this.$parent.userId;
				if (_this.type === 'community') {
					_this.songsList.forEach((queueSong) => {
						if (queueSong.requestedBy === userId) isInQueue = true;
					});
					if (!isInQueue && _this.privatePlaylistQueueSelected) {

						_this.socket.emit('playlists.getFirstSong', _this.privatePlaylistQueueSelected, data => {
							if (data.status === 'success') {
								let songId = data.song._id;
								_this.automaticallyRequestedSongId = songId;
								_this.socket.emit('stations.addToQueue', _this.stationId, songId, data => {
									if (data.status === 'success') {
										_this.socket.emit('playlists.moveSongToBottom', _this.privatePlaylistQueueSelected, songId, data => {
											if (data.status === 'success') {}
										});
									}
								});
							}
						});
					}
				}
			},
			joinStation: function () {
				let _this = this;
				_this.socket.emit('stations.join', _this.stationId, res => {
					if (res.status === 'success') {
						_this.station = {
							displayName: res.data.displayName,
							description: res.data.description,
							privacy: res.data.privacy,
							partyMode: res.data.partyMode,
							owner: res.data.owner,
							privatePlaylist: res.data.privatePlaylist
						};
						_this.currentSong = (res.data.currentSong) ? res.data.currentSong : {};
						_this.type = res.data.type;
						_this.startedAt = res.data.startedAt;
						_this.paused = res.data.paused;
						_this.timePaused = res.data.timePaused;
						if (res.data.currentSong) {
							_this.noSong = false;
							_this.simpleSong = (res.data.currentSong.likes === -1 && res.data.currentSong.dislikes === -1);
							if (_this.simpleSong) {
								_this.currentSong.skipDuration = 0;
							}
							_this.youtubeReady();
							_this.playVideo();
							_this.socket.emit('songs.getOwnSongRatings', res.data.currentSong._id, data => {
								if (_this.currentSong._id === data.songId) {
									_this.liked = data.liked;
									_this.disliked = data.disliked;
								}
							});
						} else {
							if (_this.playerReady) _this.player.pauseVideo();
							_this.noSong = true;
						}
						if (_this.type === 'community') {
							_this.socket.emit('stations.getQueue', _this.stationId, data => {
								if (data.status === 'success') _this.songsList = data.queue;
							});
						}
					}

					_this.socket.emit('stations.getPlaylist', _this.stationId, res => {
				 		if (res.status == 'success') _this.songsList = res.data;
				 	});
					// UNIX client time before ping
					let beforePing = Date.now();
					_this.socket.emit('apis.ping', res => {
						// UNIX client time after ping
						let afterPing = Date.now();
						// Average time in MS it took between the server responding and the client receiving
						let connectionLatency = (afterPing - beforePing) / 2;
						console.log(connectionLatency, beforePing - afterPing);
						// UNIX server time
						let serverDate = res.date;
						// Difference between the server UNIX time and the client UNIX time after ping, with the connectionLatency added to the server UNIX time
						let difference = (serverDate + connectionLatency) - afterPing;
						console.log("Difference: ", difference);
						if (difference > 3000 || difference < -3000) {
							console.log("System time difference is bigger than 3 seconds.");
						}
						_this.systemDifference = difference;
					});
				});
			}
		},
		ready: function() {
			let _this = this;

			Date.currently = () => {
				return new Date().getTime() + _this.systemDifference;
			};

			_this.stationId = _this.$route.params.id;

			window.stationInterval = 0;

			auth.getStatus(isLoggedIn => {
				if (!isLoggedIn) _this.$router.go('/404');
			});

			io.getSocket(socket => {
				_this.socket = socket;

				io.removeAllListeners();

				if (_this.socket.connected) _this.joinStation();
				io.onConnect(() => {
					_this.joinStation();
				});

				_this.socket.emit('stations.find', _this.stationId, res => {
					if (res.status === 'error') {
						_this.$router.go('/404');
						Toast.methods.addToast(res.message, 3000);
						console.log('yup')
					}
				});

				_this.socket.on('event:songs.next', data => {
					_this.previousSong = (_this.currentSong._id) ? _this.currentSong : null;
					_this.currentSong = (data.currentSong) ? data.currentSong : {};
					_this.startedAt = data.startedAt;
					_this.paused = data.paused;
					_this.timePaused = data.timePaused;
					if (data.currentSong) {
						_this.noSong = false;
						_this.simpleSong = (data.currentSong.likes === -1 && data.currentSong.dislikes === -1);
						if (_this.simpleSong) _this.currentSong.skipDuration = 0;
						if (!_this.playerReady) _this.youtubeReady();
						else _this.playVideo();
						_this.socket.emit('songs.getOwnSongRatings', data.currentSong._id, (data) => {
							if (_this.currentSong._id === data.songId) {
								_this.liked = data.liked;
								_this.disliked = data.disliked;
							}
						});
					} else {
						if (_this.playerReady) _this.player.pauseVideo();
						_this.noSong = true;
					}

					let isInQueue = false;
					let userId = _this.$parent.userId;
					_this.songsList.forEach((queueSong) => {
						if (queueSong.requestedBy === userId) isInQueue = true;
					});
					if (!isInQueue && _this.privatePlaylistQueueSelected && (_this.automaticallyRequestedSongId !== _this.currentSong._id || !_this.currentSong._id)) {
						_this.addFirstPrivatePlaylistSongToQueue();
					}
				});

				_this.socket.on('event:stations.pause', data => {
					_this.pauseLocalStation();
				});

				_this.socket.on('event:stations.resume', data => {
					_this.timePaused = data.timePaused;
					_this.resumeLocalStation();
				});

				_this.socket.on('event:song.like', data => {
					if (!this.noSong) {
						if (data.songId === _this.currentSong._id) {
							_this.currentSong.dislikes = data.dislikes;
							_this.currentSong.likes = data.likes;
						}
					}
				});

				_this.socket.on('event:song.dislike', data => {
					if (!this.noSong) {
						if (data.songId === _this.currentSong._id) {
							_this.currentSong.dislikes = data.dislikes;
							_this.currentSong.likes = data.likes;
						}
					}
				});

				_this.socket.on('event:song.unlike', data => {
					if (!this.noSong) {
						if (data.songId === _this.currentSong._id) {
							_this.currentSong.dislikes = data.dislikes;
							_this.currentSong.likes = data.likes;
						}
					}
				});

				_this.socket.on('event:song.undislike', data => {
					if (!this.noSong) {
						if (data.songId === _this.currentSong._id) {
							_this.currentSong.dislikes = data.dislikes;
							_this.currentSong.likes = data.likes;
						}
					}
				});

				_this.socket.on('event:song.newRatings', data => {
					if (!this.noSong) {
						if (data.songId === _this.currentSong._id) {
							_this.liked = data.liked;
							_this.disliked = data.disliked;
						}
					}
				});

				_this.socket.on('event:queue.update', queue => {
					if (this.type === 'community') this.songsList = queue;
				});

				_this.socket.on('event:song.voteSkipSong', () => {
					if (this.currentSong) this.currentSong.skipVotes++;
				});

				_this.socket.on('event:privatePlaylist.selected', (playlistId) => {
					if (this.type === 'community') {
						this.station.privatePlaylist = playlistId;
					}
				});

				_this.socket.on('event:partyMode.updated', (partyMode) => {
					if (this.type === 'community') {
						this.station.partyMode = partyMode;
					}
				});

				_this.socket.on('event:newOfficialPlaylist', (playlist) => {
					console.log(playlist);
					if (this.type === 'official') {
						this.songsList = playlist;
					}
				});
			});


			let volume = parseInt(localStorage.getItem("volume"));
			volume = (typeof volume === "number" && !isNaN(volume)) ? volume : 20;
			localStorage.setItem("volume", volume);
			$("#volumeSlider").val(volume);
		},
		components: {
			OfficialHeader,
			CommunityHeader,
			SongQueue,
			EditPlaylist,
			CreatePlaylist,
			EditStation,
			Report,
			SongsListSidebar,
			PlaylistSidebar,
			UsersSidebar
		}
	}
</script>

<style lang="scss">
	.no-song {
		color: #03A9F4;
		text-align: center;
	}

	#volumeSlider {
		padding: 0 15px;
    	background: transparent;
	}

	.volume-slider-wrapper {
		margin-top: 0;
		position: relative;
		display: flex;
		align-items: center;
	}

	.material-icons { cursor: pointer; }

	.stationDisplayName {
		color: white !important;
	}

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

	.menu { padding: 0 10px; }

	.menu-list li a:hover { color: #000 !important; }

	.menu-list li {
		display: flex;
		justify-content: space-between;
	}

	.menu-list a {
		/*padding: 0 10px !important;*/
	}

	.menu-list a:hover {
		background-color : transparent;
	}

	.icons-group { display: flex; }

	#like, #dislike {
		position: relative;
	}

	.behind {
		z-index: -1;
	}

	.behind:focus {
		z-index: 0;
	}
</style>
