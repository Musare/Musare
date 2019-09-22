<template>
	<div>
		<metadata title="Home" />
		<div class="app">
			<main-header />
			<div class="group">
				<div class="group-title">
					Stations&nbsp;
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
					v-for="(station, index) in stations"
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
								<h5>{{ station.displayName }}</h5>
								<i
									v-if="station.type === 'official'"
									class="material-icons blue-icon"
									title="Verified station"
								>
									check_circle
								</i>
							</div>
						</div>

						<div class="content">
							{{ station.description }}
						</div>
						<div class="under-content">
							<p v-if="station.type === 'community'">
								Hosted by
								<user-id-to-username
									:userId="station.owner"
									:link="true"
								/>
							</p>
							<div class="icons">
								<i
									v-if="isOwner(station)"
									class="material-icons dark-grey-icon"
									title="This is your station."
									>home</i
								>
								<i
									v-if="station.privacy !== 'public'"
									class="material-icons dark-grey-icon"
									title="This station is not visible to other users."
									>lock</i
								>
							</div>
						</div>
					</div>
					<div class="bottomBar">
						<i
							v-if="station.currentSong.title"
							class="material-icons"
							>music_note</i
						>
						<i v-else class="material-icons">music_off</i>
						<span
							v-if="station.currentSong.title"
							class="songTitle"
							:title="'Now Playing: ' + station.currentSong.title"
							>{{ station.currentSong.title }}</span
						>
						<span v-else class="songTitle">No Songs Playing</span>
					</div>
				</router-link>
			</div>
			<main-footer />
		</div>
		<create-community-station v-if="modals.createCommunityStation" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

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
			favoriteStations: [],
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

			this.socket.on("event:user.favoritedStation", stationId => {
				this.favoriteStations.push(stationId);
			});

			this.socket.on("event:user.unfavoritedStation", stationId => {
				const index = this.favoriteStations.indexOf(stationId);
				this.favoriteStations.splice(index, 1);
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
			this.socket.emit("users.getFavoriteStations", data => {
				if (data.status === "success")
					this.favoriteStations = data.favoriteStations;
			});
			this.socket.emit("apis.joinRoom", "home", () => {});
		},
		isOwner(station) {
			return station.owner === this.userId;
		},
		isFavorite(station) {
			return this.favoriteStations.indexOf(station._id) !== -1;
		},
		favoriteStation(event, station) {
			event.preventDefault();
			this.socket.emit("stations.favoriteStation", station._id, res => {
				if (res.status === "success") {
					new Toast({
						content: "Successfully favorited station.",
						timeout: 4000
					});
				} else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		unfavoriteStation(event, station) {
			event.preventDefault();
			this.socket.emit("stations.unfavoriteStation", station._id, res => {
				if (res.status === "success") {
					new Toast({
						content: "Successfully unfavorited station.",
						timeout: 4000
					});
				} else new Toast({ content: res.message, timeout: 8000 });
			});
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
	height: 25px;
	position: relative;
	line-height: 1;
	font-size: 24px;
	display: flex;
	align-items: center;
	text-align: left;
	margin-top: 10px;

	p {
		font-size: 15px;
		line-height: 15px;
		display: inline;
	}

	i {
		font-size: 20px;
	}

	* {
		z-index: 10;
		position: relative;
	}

	.icons {
		position: absolute;
		right: 0;

		.dark-grey-icon {
			color: $dark-grey-2;
		}
	}
}

.users-count {
	font-size: 20px;
	position: relative;
	top: -4px;
}

.group {
	min-height: 64px;
}

.station-card {
	display: inline-flex;
	flex-direction: column;
	overflow: hidden;
	margin: 10px;
	cursor: pointer;
	height: 485px;
	transition: all ease-in-out 0.2s;

	.card-content {
		padding: 10px 15px;

		.media {
			display: flex;
			align-items: center;

			.displayName {
				display: flex;
				align-items: center;
				word-wrap: break-word;
				width: 80%;
				word-wrap: break-word;
				overflow: hidden;
				text-overflow: ellipsis;
				display: flex;
				line-height: 30px;
				max-height: 30px;

				h5 {
					font-weight: 400;
					margin: 0;
					display: inline;
					margin-right: 6px;
					line-height: 30px;
				}

				i {
					font-size: 22px;
				}

				.blue-icon {
					color: $musareBlue;
				}
			}
		}

		.content {
			word-wrap: break-word;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			line-height: 20px;
			height: 60px;
			text-align: left;
			word-wrap: break-word;
			margin-bottom: 0;
		}
	}

	.card-image {
		.image {
			.ytThumbnailBg {
				background: url("/assets/notes-transparent.png") no-repeat
					center center;
				background-size: cover;
				height: 100%;
				width: 100%;
				position: absolute;
				top: 0;
				filter: blur(3px);
			}
			img {
				height: auto;
				width: 100%;
				top: 0;
				margin-top: auto;
				margin-bottom: auto;
				z-index: 1;
			}
		}
	}

	.bottomBar {
		position: relative;
		display: flex;
		align-items: center;
		background: $primary-color;
		width: 100%;
		height: 30px;
		line-height: 30px;
		color: $white;
		font-weight: 400;
		font-size: 12px;

		i.material-icons {
			vertical-align: middle;
			margin-left: 5px;
			font-size: 18px;
		}

		.songTitle {
			text-align: left;
			vertical-align: middle;
			margin-left: 5px;
			line-height: 30px;
			flex: 2 1 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
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
	margin: 64px 0 0 0;
	padding-bottom: 240px;
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
</style>
