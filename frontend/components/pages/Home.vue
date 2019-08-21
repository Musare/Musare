<template>
	<div>
		<div class="app">
			<main-header />
			<div class="content-wrapper">
				<div class="group">
					<div class="group-title">
						Stations&nbsp;
						<a
							v-if="loggedIn"
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
						v-for="(station, index) in filteredStations"
						:key="index"
						:to="{
							name: 'station',
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
								<div
									v-if="station.currentSong.ytThumbnail"
									class="ytThumbnailBg"
									v-bind:style="{
										'background-image':
											'url(' +
											station.currentSong.ytThumbnail +
											')'
									}"
								></div>
								<img
									v-if="station.currentSong.ytThumbnail"
									:src="station.currentSong.ytThumbnail"
									onerror="this.src='/assets/notes-transparent.png'"
									class="ytThumbnail"
								/>
								<img
									v-else
									:src="station.currentSong.thumbnail"
									onerror="this.src='/assets/notes-transparent.png'"
								/>
							</figure>
						</div>
						<div class="card-content">
							<div class="media">
								<div class="media-left displayName">
									<h5>
										{{ station.displayName }}
										<i
											v-if="station.type === 'official'"
											class="badge material-icons"
											>verified_user</i
										>
									</h5>
								</div>
							</div>

							<div class="content">
								{{ station.description }}
							</div>
							<div class="under-content">
								<span class="hostedby"
									>Hosted by
									<span class="host">
										<span
											v-if="station.type === 'official'"
											title="Musare"
											>Musare</span
										>
										<user-id-to-username
											v-else
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
									v-if="
										station.type === 'community' &&
											isOwner(station)
									"
									class="material-icons right-icon"
									title="This is your station."
									>home</i
								>
							</div>
						</div>
						<router-link
							class="absolute-a"
							:to="{
								name: 'station',
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

import io from "../../io";

export default {
	data() {
		return {
			recaptcha: {
				key: ""
			},
			stations: [],
			searchQuery: ""
		};
	},
	computed: {
		filteredStations() {
			return this.stations.filter(
				station =>
					JSON.stringify(Object.values(station)).indexOf(
						this.searchQuery
					) !== -1
			);
		},
		...mapState({
			modals: state => state.modals.modals.home,
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => {
				this.init();
			});
			this.socket.on("event:stations.created", res => {
				const station = res;

				if (!station.currentSong)
					station.currentSong = {
						thumbnail: "/assets/notes-transparent.png"
					};
				if (station.currentSong && !station.currentSong.thumbnail)
					station.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.songId}/mqdefault.jpg`;
				this.stations.push(station);
			});
			this.socket.on(
				"event:userCount.updated",
				(stationId, userCount) => {
					this.stations.forEach(s => {
						const station = s;
						if (station._id === stationId) {
							station.userCount = userCount;
						}
					});
				}
			);
			this.socket.on("event:station.nextSong", (stationId, song) => {
				let newSong = song;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						if (!newSong)
							newSong = {
								thumbnail: "/assets/notes-transparent.png"
							};
						if (newSong && !newSong.thumbnail)
							newSong.ytThumbnail = `https://img.youtube.com/vi/${newSong.songId}/mqdefault.jpg`;
						station.currentSong = newSong;
					}
				});
			});
		});
	},
	methods: {
		init() {
			this.socket.emit("stations.index", data => {
				this.stations = [];
				if (data.status === "success")
					data.stations.forEach(s => {
						const station = s;
						if (!station.currentSong)
							station.currentSong = {
								thumbnail: "/assets/notes-transparent.png"
							};
						if (
							station.currentSong &&
							!station.currentSong.thumbnail
						)
							station.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.songId}/mqdefault.jpg`;
						this.stations.push(station);
					});
			});
			this.socket.emit("apis.joinRoom", "home", () => {});
		},
		isOwner(station) {
			return (
				station.owner === this.userId && station.privacy === "public"
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
@import "styles/global.scss";

* {
	box-sizing: border-box;
}

html {
	width: 100%;
	height: 100%;
	color: $dark-grey-2;

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
		color: $primary-color;
		position: relative;
		top: -5px;
	}

	.hostedby {
		font-size: 15px;

		.host {
			color: $primary-color;

			a {
				color: $primary-color;
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
	background: $white;

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

	.card-image {
		height: 300px;
		width: 300px;
		overflow: hidden;
		.image {
			.ytThumbnailBg {
				background: url("/assets/notes-transparent.png") no-repeat
					center center;
				background-size: cover;
				height: 300px;
				width: 300px;
				position: absolute;
				top: 0;
				filter: blur(5px);
			}
			.ytThumbnail {
				height: auto;
				top: 0;
				margin-top: auto;
				margin-bottom: auto;
			}
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
	color: $dark-grey;
}

.community-button:hover {
	color: $primary-color;
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

	.badge {
		position: relative;
		padding-right: 2px;
		color: $green;
		top: +5px;
	}
}
</style>
