<template>
	<div class="app">
		<main-header></main-header>
		<div class="group">
			<div class="group-title">Official Stations</div>
			<div class="card station-card" v-for="station in stations.official" v-link="{ path: '/official/' + station._id }" @click="this.$dispatch('joinStation', station._id)" :class="station.class">
				<div class="card-image">
					<figure class="image is-square">
						<img :src="station.currentSong.thumbnail" onerror="this.src='/assets/notes-transparent.png'" />
					</figure>
				</div>
				<div class="card-content">
					<div class="media">
						<div class="media-left displayName">
							<h5>{{ station.displayName }}</h5>
						</div>
						<div class="media-content"></div>
						<div class="media-right">
							<div>{{ station.userCount }}&nbsp;&nbsp;<i class="material-icons">perm_identity</i></div>
						</div>
					</div>

					<div class="content">
						{{ station.description }}
					</div>
				</div>
				<a @click="this.$dispatch('joinStation', station._id)" href='#' class='absolute-a'></a>
			</div>
		</div>
		<div class="group">
			<div class="group-title">Community Stations <a @click="toggleModal('createCommunityStation')" v-if="$parent.loggedIn" href='#'><i class="material-icons ccs-button">add_circle_outline</i></a></div>
			<div class="card station-card" v-for="station in stations.community" v-link="{ path: '/community/' + station._id }" @click="this.$dispatch('joinStation', station._id)" :class="station.class">
				<div class="card-image">
					<figure class="image is-square">
						<img :src="station.currentSong.thumbnail" onerror="this.src='/assets/notes-transparent.png'" />
					</figure>
				</div>
				<div class="card-content">
					<div class="media">
						<div class="media-left displayName">
							<h5>{{ station.displayName }}</h5>
						</div>
						<div class="media-content"></div>
						<div class="media-right">
							<div>{{ station.userCount }}&nbsp;&nbsp;<i class="material-icons">perm_identity</i></div>
						</div>
					</div>

					<div class="content">
						{{ station.description }}
					</div>
				</div>
				<a @click="this.$dispatch('joinStation', station._id)" href='#' class='absolute-a'></a>
			</div>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';
	import auth from '../../auth';
	import io from '../../io';

	export default {
		data() {
			return {
				isRegisterActive: false,
				isLoginActive: false,
				recaptcha: {
					key: ''
				},
				stations: {
					official: [],
					community: []
				}
			}
		},
		ready() {
			let _this = this;
			auth.getStatus((authenticated, role, username, userId) => {
				io.getSocket((socket) => {
					_this.socket = socket;
					if (_this.socket.connected) _this.init();
					io.onConnect(() => {
						_this.init();
					});
					_this.socket.on('event:stations.created', station => {
						if (!station.currentSong) station.currentSong = { thumbnail: '/assets/notes-transparent.png' };
						if (station.currentSong && !station.currentSong.thumbnail) station.currentSong.thumbnail = "/assets/notes-transparent.png";
						if (station.privacy !== 'public') {
							station.class = {'station-red': true}
						} else if (station.type === 'community') {
							if (station.owner === userId) {
								station.class = {'station-blue': true}
							}
						}
						_this.stations[station.type].push(station);
					});
				});
			});
		},
		methods: {
			toggleModal: function (type) {
				this.$dispatch('toggleModal', type);
			},
			init: function() {
				let _this = this;
				auth.getStatus((authenticated, role, username, userId) => {
					_this.socket.emit('stations.index', data => {
						_this.stations.community = [];
						_this.stations.official = [];
						if (data.status === "success") data.stations.forEach(station => {
							if (!station.currentSong) station.currentSong = { thumbnail: '/assets/notes-transparent.png' };
							if (station.currentSong && !station.currentSong.thumbnail) station.currentSong.thumbnail = "/assets/notes-transparent.png";
							if (station.privacy !== 'public') {
								station.class = { 'station-red': true }
							} else if (station.type === 'community') {
								if (station.owner === userId) {
									station.class = { 'station-blue': true }
								}
							}
							if (station.type == 'official') _this.stations.official.push(station);
							else _this.stations.community.push(station);
						});
					});
					_this.socket.emit("apis.joinRoom", 'home', () => {
					});
				});
			}
		},
		components: { MainHeader, MainFooter }
	}
</script>

<style lang='scss'>
	@import 'theme.scss';

	* { box-sizing: border-box; }

	html {
		width: 100%;
		height: 100%;
		color: rgba(0, 0, 0, 0.87);

		body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
		}
	}

	@media only screen and (min-width: 1200px) {
		html { font-size: 15px; }
	}

	@media only screen and (min-width: 992px) {
		html { font-size: 14.5px; }
	}

	@media only screen and (min-width: 0) {
		html { font-size: 14px; }
	}

	.group { min-height: 64px; }

	.station-card {
		margin: 10px;
		cursor: pointer;
	}

	.ccs-button {
		cursor: pointer;
		transition: .25s ease color;
		font-size: 30px;
		color: black;
	}

	.ccs-button:hover {
		color: #03a9f4;
	}

	.station-blue {
		outline: 5px solid #03a9f4;
	}

	.station-red {
		outline: 5px solid #f45703;
	}

	.label { display: flex; }

	.g-recaptcha {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}

	.group {
		text-align: center;
		width: 100%;
		margin: 64px 0 0 0;

		.group-title {
			float: left;
			clear: none;
			width: 100%;
			height: 64px;
			line-height: 48px;
			text-align: center;
			font-size: 48px;
			margin-bottom: 25px;
		}
	}

	.group .card {
		display: inline-flex;
    	flex-direction: column;
		overflow: hidden;
	}

	.displayName {
		word-wrap: break-word;
    	width: 80%;
	}

	.content {
		text-align: left;
		word-wrap: break-word;
	}
	
</style>
