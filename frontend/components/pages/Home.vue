<template>
	<div>
		<div class="app">
			<main-header />
			<div class="content-wrapper">
				<div class="group">
					<div class="group-title">
						Official Stations
					</div>
					<router-link
						v-for="(station, index) in stations.official"
						:key="index"
						class="card station-card"
						:to="{ name: 'official', params: { id: station.name } }"
						:class="{ isPrivate: station.privacy === 'private' }"
					>
						<div class="card-image">
							<figure class="image is-square">
								<img
									:src="station.currentSong.thumbnail"
									onerror="this.src='/assets/notes-transparent.png'"
								/>
							</figure>
						</div>
						<div class="card-content">
							<div class="media">
								<div class="media-left displayName">
									<h5>{{ station.displayName }}</h5>
								</div>
							</div>

							<div class="content">
								{{ station.description }}
							</div>

							<div class="under-content">
								<span class="official"
									><i class="badge material-icons"
										>verified_user</i
									>Official</span
								>
								<i
									v-if="station.privacy !== 'public'"
									class="material-icons right-icon"
									title="This station is not visible to other users."
									>lock</i
								>
							</div>
						</div>
						<router-link
							href="#"
							class="absolute-a"
							:to="{
								name: 'official',
								params: { id: station.name }
							}"
						/>
					</router-link>
				</div>
				<div class="group">
					<div class="group-title">
						Community Stations&nbsp;
						<a
							v-if="$parent.loggedIn"
							href="#"
							@click="
								openModal({
									sector: 'home',
									modal: 'createCommunityStation'
								})
							"
						>
							<i class="material-icons community-button"
								>add_circle_outline</i
							>
						</a>
					</div>
					<router-link
						v-for="(station, index) in stations.community"
						:key="index"
						:to="{
							name: 'community',
							params: { id: station.name }
						}"
						class="card station-card"
						:class="{
							isPrivate: station.privacy === 'private',
							isMine: isOwner(station)
						}"
					>
						<div class="card-image">
							<figure class="image is-square">
								<img
									:src="station.currentSong.thumbnail"
									onerror="this.src='/assets/notes-transparent.png'"
								/>
							</figure>
						</div>
						<div class="card-content">
							<div class="media">
								<div class="media-left displayName">
									<h5>{{ station.displayName }}</h5>
								</div>
							</div>

							<div class="content">
								{{ station.description }}
							</div>
							<div class="under-content">
								<span class="hostedby"
									>Hosted by
									<span class="host">
										<user-id-to-username
											:userId="station.owner"
											:link="true"
										/>
									</span>
								</span>
								<i
									v-if="station.privacy !== 'public'"
									class="material-icons right-icon"
									title="This station is not visible to other users."
									>lock</i
								>
								<i
									v-if="isOwner(station)"
									class="material-icons right-icon"
									title="This is your station."
									>home</i
								>
							</div>
						</div>
						<router-link
							href="#"
							class="absolute-a"
							:to="{
								name: 'community',
								params: { id: station.name }
							}"
						/>
					</router-link>
				</div>
			</div>
			<main-footer />
		</div>
		<create-community-station v-if="modals.createCommunityStation" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";
import CreateCommunityStation from "../Modals/CreateCommunityStation.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

import auth from "../../auth";
import io from "../../io";

export default {
	data() {
		return {
			recaptcha: {
				key: ""
			},
			stations: {
				official: [],
				community: []
			}
		};
	},
	computed: mapState("modals", {
		modals: state => state.modals.home
	}),
	mounted() {
		let _this = this;
		auth.getStatus(() => {
			io.getSocket(socket => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				io.onConnect(() => {
					_this.init();
				});
				_this.socket.on("event:stations.created", station => {
					if (!station.currentSong)
						station.currentSong = {
							thumbnail: "/assets/notes-transparent.png"
						};
					if (station.currentSong && !station.currentSong.thumbnail)
						station.currentSong.thumbnail =
							"/assets/notes-transparent.png";
					_this.stations[station.type].push(station);
				});
				_this.socket.on(
					"event:userCount.updated",
					(stationId, userCount) => {
						_this.stations.official.forEach(station => {
							if (station._id === stationId) {
								station.userCount = userCount;
							}
						});

						_this.stations.community.forEach(station => {
							if (station._id === stationId) {
								station.userCount = userCount;
							}
						});
					}
				);
				_this.socket.on(
					"event:station.nextSong",
					(stationId, newSong) => {
						_this.stations.official.forEach(station => {
							if (station._id === stationId) {
								if (!newSong)
									newSong = {
										thumbnail:
											"/assets/notes-transparent.png"
									};
								if (newSong && !newSong.thumbnail)
									newSong.thumbnail =
										"/assets/notes-transparent.png";
								station.currentSong = newSong;
							}
						});

						_this.stations.community.forEach(station => {
							if (station._id === stationId) {
								if (!newSong)
									newSong = {
										thumbnail:
											"/assets/notes-transparent.png"
									};
								if (newSong && !newSong.thumbnail)
									newSong.thumbnail =
										"/assets/notes-transparent.png";
								station.currentSong = newSong;
							}
						});
					}
				);
			});
		});
	},
	methods: {
		init: function() {
			let _this = this;
			auth.getStatus((authenticated, role, username, userId) => {
				_this.socket.emit("stations.index", data => {
					_this.stations.community = [];
					_this.stations.official = [];
					if (data.status === "success")
						data.stations.forEach(station => {
							if (!station.currentSong)
								station.currentSong = {
									thumbnail: "/assets/notes-transparent.png"
								};
							if (
								station.currentSong &&
								!station.currentSong.thumbnail
							)
								station.currentSong.thumbnail =
									"/assets/notes-transparent.png";
							if (station.privacy !== "public")
								station.class = { "station-red": true };
							else if (
								station.type === "community" &&
								station.owner === userId
							)
								station.class = { "station-blue": true };
							if (station.type == "official")
								_this.stations.official.push(station);
							else _this.stations.community.push(station);
						});
				});
				_this.socket.emit("apis.joinRoom", "home", () => {});
			});
		},
		isOwner: function(station) {
			let _this = this;
			return (
				station.owner === _this.$parent.userId &&
				station.privacy === "public"
			);
		},
		...mapActions("modals", ["openModal"])
	},
	components: {
		MainHeader,
		MainFooter,
		CreateCommunityStation,
		UserIdToUsername
	}
};
</script>

<style lang="scss">
* {
	box-sizing: border-box;
}

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

.under-content {
	width: calc(100% - 40px);
	left: 20px;
	right: 20px;
	bottom: 10px;
	text-align: left;
	height: 25px;
	position: absolute;
	margin-bottom: 10px;
	line-height: 1;
	font-size: 24px;
	vertical-align: middle;

	* {
		z-index: 10;
		position: relative;
	}

	.official {
		font-size: 18px;
		color: #03a9f4;
		position: relative;
		top: -5px;

		.badge {
			position: relative;
			padding-right: 2px;
			color: #38d227;
			top: +5px;
		}
	}

	.hostedby {
		font-size: 15px;

		.host {
			color: #03a9f4;

			a {
				color: #03a9f4;
			}
		}
	}

	.right-icon {
		float: right;
	}
}

.users-count {
	font-size: 20px;
	position: relative;
	top: -4px;
}

.right {
	float: right;
}

.group {
	min-height: 64px;
}

.station-card {
	margin: 10px;
	cursor: pointer;
	height: 475px;

	transition: all ease-in-out 0.2s;

	.card-content {
		max-height: 159px;

		.content {
			word-wrap: break-word;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			line-height: 20px;
			max-height: 60px;
		}
	}
}

.station-card:hover {
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.3), 0 0 10px rgba(10, 10, 10, 0.3);
	transition: all ease-in-out 0.2s;
}

/*.isPrivate {
		background-color: #F8BBD0;
	}

	.isMine {
		background-color: #29B6F6;
	}*/

.community-button {
	cursor: pointer;
	transition: 0.25s ease color;
	font-size: 30px;
	color: #4a4a4a;
}

.community-button:hover {
	color: #03a9f4;
}

.station-privacy {
	text-transform: capitalize;
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

	.content {
		text-align: left;
		word-wrap: break-word;
	}

	.media {
		display: flex;
		align-items: center;

		.station-status {
			line-height: 13px;
		}

		h5 {
			margin: 0;
		}
	}
}

.displayName {
	word-wrap: break-word;
	width: 80%;
	word-wrap: break-word;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 1;
	line-height: 30px;
	max-height: 30px;
}
</style>
