<template>
	<div class="app">
		<main-header></main-header>
		<div class="group">
			<div class="group-title">Official Stations</div>
			<div class="card" v-for="station in stations.official" v-link="{ path: '/official/' + station._id }" @click="this.$dispatch('joinStation', station._id)" :class="station.class">
				<div class="card-image">
					<figure class="image is-square">
						<img :src="station.currentSong.thumbnail" onerror="this.src='/assets/notes.png'" />
					</figure>
				</div>
				<div class="card-content">
					<div class="media">
						<div class="media-left">
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
			</div>
		</div>
		<div class="group">
			<div class="group-title">Community Stations <i class="material-icons ccs-button" @click="toggleModal('createCommunityStation')" v-if="$parent.loggedIn">add</i></div>
			<div class="card" v-for="station in stations.community" v-link="{ path: '/community/' + station._id }" @click="this.$dispatch('joinStation', station._id)" :class="station.class">
				<div class="card-image">
					<figure class="image is-square">
						<img :src="station.currentSong.thumbnail" onerror="this.src='/assets/notes.png'" />
					</figure>
				</div>
				<div class="card-content">
					<div class="media">
						<div class="media-left">
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
			</div>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';
	import auth from '../../auth';

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
				_this.socket = _this.$parent.socket;
				_this.socket.emit("stations.index", data => {
					if (data.status === "success")  data.stations.forEach(station => {
						if (!station.currentSong) station.currentSong = { thumbnail: '/assets/notes.png' };
						console.log(station.privacy);
						if (station.privacy !== 'public') {
							console.log(123);
							station.class = {'station-red': true}
						} else if (station.type === 'community') {
							if (station.owner === userId) {
								station.class = {'station-blue': true}
							}
						}
						if (station.type == 'official') _this.stations.official.push(station);
						else _this.stations.community.push(station);
					});
				});
				_this.socket.emit("apis.joinRoom", 'home', () => {});
				_this.socket.on('event:stations.created', station => {
					console.log("CREATED!!!", station);
					if (!station.currentSong) station.currentSong = {thumbnail: '/assets/notes.png'};
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
		},
		methods: {
			toggleModal: function (type) {
				this.$dispatch('toggleModal', type);
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
		html {
			font-size: 15px;
		}
	}

	@media only screen and (min-width: 992px) {
		html {
			font-size: 14.5px;
		}
	}

	@media only screen and (min-width: 0) {
		html {
			font-size: 14px;
		}
	}

	.ccs-button {
		cursor: pointer;
		transition: .25s ease color;
		font-size: 30px;
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

	.label {
		display: flex;
	}

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
		display: inline-block;
		height: 415px;
		overflow: hidden;
	}

	.media-left {
		word-wrap: break-word;
    	width: 80%;
	}

	.content {
		word-wrap: break-word;
	}
	
</style>
