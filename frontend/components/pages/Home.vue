<template>
	<div class="app">
		<main-header></main-header>
		<div class="group" v-if="stations.official.length">
			<div class="group-title">Official Stations</div>
			<div class="group-stations">
				<div class="stations-station" v-for="station in stations.official" v-link="{ path: '/official/' + station._id }" @click="this.$dispatch('joinStation', station._id)">
					<img class="station-image" :src="station.currentSong.thumbnail" />
					<div class="station-info">
						<div class="station-grid-left">
							<h3>{{ station.displayName }}</h3>
							<p>{{ station.description }}</p>
						</div>
						<div class="station-grid-right">
							<div>{{ station.userCount }}&nbsp;&nbsp;<i class="material-icons">perm_identity</i></div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="group" v-if="stations.community.length">
			<div class="group-title">Community Stations</div>
			<div class="group-stations">
				<div class="stations-station" v-for="station in stations.community" v-link="{ path: '/community/' + station._id }" @click="this.$dispatch('joinStation', station._id)">
					<img class="station-image" :src="station.currentSong.thumbnail" />
					<div class="station-info">
						<div class="station-grid-left">
							<h3>{{ station.displayName }}</h3>
							<p>{{ station.description }}</p>
						</div>
						<div class="station-grid-right">
							<div>{{ station.userCount }}&nbsp;&nbsp;<i class="material-icons">perm_identity</i></div>
						</div>
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

			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					_this.socket.emit("stations.index", data => {
						console.log(data)
						if (data.status === "success")  data.stations.forEach(station => {
							if (station.type == 'official') _this.stations.official.push(station);
							else _this.stations.community.push(station);
						});
					});
					_this.socket.emit("apis.joinRoom", 'home', () => {});
					_this.socket.on('event:stations.created', (station) => {
						_this.stations[station.type].push(station);
					});
					clearInterval(socketInterval);
				}
			}, 100);
		},
		components: { MainHeader, MainFooter }
	}
</script>

<style lang="scss">

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

	.label {
		display: flex;
	}

	.g-recaptcha {
		display: flex;
		justify-content: center;
		margin-top: 20px;
	}

	.group {
		width: 100%;
		height: 448px;
		margin: 64px 0 0 0;

		.group-title {
			float: left;
			clear: none;
			width: 100%;
			height: 64px;
			line-height: 48px;
			text-align: center;
			font-size: 48px;
		}

		.group-stations {
			white-space: nowrap;
			text-align: center;
			overflow: hidden;
			float: left;
			clear: none;
			width: 100%;
			height: 400px;

			.stations-station {
				position: relative;
				top: 16px;
				display: inline-block;
				clear: none;
				width: 256px;
				height: 370px;
				margin: 0 16px 0 16px;
				box-shadow: 0 1px 6px 2px rgba(0, 0, 0, 0.25);
				cursor: pointer;

				.station-info {
					display: flex;
					flex-direction: row;
					align-items: center;
				}

				.station-image {
					width: 100%;
					height: 256px;
					object-fit: cover;
				}

				.station-grid-left {
					display: flex;
					flex-direction: column;
					width: 75%;
					text-align: left;
					padding-left: 10px;

					h3 {
						color: $blue;
						margin: 0;
						white-space: normal;
						padding-top: 10px;
					}

					p {
						margin: 0;
						white-space: normal;
						padding-top: 10px;
					}
				}

				.station-grid-right {
					display: flex;
					flex-direction: column;
					width: 25%;
					i {
						color: $blue;
					}
				}
			}
		}
	}
</style>
