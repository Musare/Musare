<template>
	<div>
		<metadata title="Home" />
		<div class="app">
			<main-header
				:hide-logo="true"
				:transparent="true"
				:hide-logged-out="true"
			/>
			<div class="header" :class="{ loggedIn }">
				<img
					class="background"
					src="/assets/homebg.jpeg"
				/>
				<div class="overlay"></div>
				<div class="content-container">
					<div class="content">
						<img
							class="logo"
							src="/assets/white_wordmark.png"
							:alt="`${this.siteName}` || `Musare`"
						/>
						<div v-if="!loggedIn" class="buttons">
							<button
								class="button login"
								@click="
									openModal({
										sector: 'header',
										modal: 'login'
									})
								"
							>
								Login
							</button>
							<button
								class="button register"
								@click="
									openModal({
										sector: 'header',
										modal: 'register'
									})
								"
							>
								Register
							</button>
						</div>
					</div>
				</div>
			</div>
			<div v-if="favoriteStations.length > 0" class="group">
				<div class="group-title">
					<div>
						<h2>My Favorites</h2>
					</div>
				</div>
				<router-link
					v-for="(station, index) in favoriteStations"
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
					:style="'--station-theme: ' + station.themeCode"
				>
					<div class="card-image">
						<figure class="image is-square">
							<div
								v-if="station.currentSong.ytThumbnail"
								class="ytThumbnailBg"
								:style="{
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
								<i
									v-if="loggedIn && !station.isFavorited"
									@click.prevent="favoriteStation(station)"
									class="favorite material-icons"
									>star_border</i
								>
								<i
									v-if="loggedIn && station.isFavorited"
									@click.prevent="unfavoriteStation(station)"
									class="favorite material-icons"
									>star</i
								>
								<h5>{{ station.displayName }}</h5>
								<i
									v-if="station.type === 'official'"
									class="material-icons verified-station"
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
							<p class="hostedBy">
								Hosted by
								<span class="host">
									<span
										v-if="station.type === 'official'"
										title="Musare"
										>Musare</span
									>
									<user-id-to-username
										v-else
										:user-id="station.owner"
										:link="true"
									/>
								</span>
							</p>
							<div class="icons">
								<i
									v-if="
										station.type === 'community' &&
											isOwner(station)
									"
									class="homeIcon material-icons"
									title="This is your station."
									>home</i
								>
								<i
									v-if="station.privacy === 'private'"
									class="privateIcon material-icons"
									title="This station is not visible to other users."
									>lock</i
								>
								<i
									v-if="station.privacy === 'unlisted'"
									class="unlistedIcon material-icons"
									title="Unlisted Station"
									>link</i
								>
							</div>
						</div>
					</div>
					<div class="bottomBar">
						<i
							v-if="station.paused && station.currentSong.title"
							class="material-icons"
							title="Station Paused"
							>pause</i
						>
						<i
							v-else-if="station.currentSong.title"
							class="material-icons"
							>music_note</i
						>
						<i v-else class="material-icons">music_off</i>
						<span
							v-if="station.currentSong.title"
							class="songTitle"
							:title="
								station.currentSong.artists.length > 0
									? 'Now Playing: ' +
									  station.currentSong.title +
									  ' by ' +
									  station.currentSong.artists.join(',')
									: 'Now Playing: ' +
									  station.currentSong.title
							"
							>{{ station.currentSong.title }}
							{{
								station.currentSong.artists.length > 0
									? " by " +
									  station.currentSong.artists.join(",")
									: ""
							}}</span
						>
						<span v-else class="songTitle">No Songs Playing</span>
					</div>
				</router-link>
			</div>
			<div class="group bottom">
				<div class="group-title">
					<div>
						<h1>Stations</h1>
					</div>
				</div>
				<a
					v-if="loggedIn"
					@click="
						openModal({
							sector: 'home',
							modal: 'createCommunityStation'
						})
					"
					class="card station-card createStation"
					:style="'--station-theme: rgb(2, 166, 242)'"
				>
					<div class="card-image">
						<figure class="image is-square">
							<i class="material-icons">radio</i>
							<!-- <img src="/assets/notes-transparent.png" /> -->
						</figure>
					</div>
					<div class="card-content">
						<div class="media">
							<div class="media-left displayName">
								<h5>Create Station</h5>
							</div>
						</div>

						<div class="content">
							Click here to create your own station!
						</div>
					</div>
					<div class="bottomBar"></div>
				</a>

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
					:style="'--station-theme: ' + station.themeCode"
				>
					<div class="card-image">
						<figure class="image is-square">
							<div
								v-if="station.currentSong.ytThumbnail"
								class="ytThumbnailBg"
								:style="{
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
								<i
									v-if="loggedIn && !station.isFavorited"
									@click.prevent="favoriteStation(station)"
									class="favorite material-icons"
									>star_border</i
								>
								<i
									v-if="loggedIn && station.isFavorited"
									@click.prevent="unfavoriteStation(station)"
									class="favorite material-icons"
									>star</i
								>
								<h5>{{ station.displayName }}</h5>
								<i
									v-if="station.type === 'official'"
									class="material-icons verified-station"
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
							<p class="hostedBy">
								Hosted by
								<span class="host">
									<span
										v-if="station.type === 'official'"
										title="Musare"
										>Musare</span
									>
									<user-id-to-username
										v-else
										:user-id="station.owner"
										:link="true"
									/>
								</span>
							</p>
							<div class="icons">
								<i
									v-if="
										station.type === 'community' &&
											isOwner(station)
									"
									class="homeIcon material-icons"
									title="This is your station."
									>home</i
								>
								<i
									v-if="station.privacy === 'private'"
									class="privateIcon material-icons"
									title="This station is not visible to other users."
									>lock</i
								>
								<i
									v-if="station.privacy === 'unlisted'"
									class="unlistedIcon material-icons"
									title="Unlisted Station"
									>link</i
								>
							</div>
						</div>
					</div>
					<div class="bottomBar">
						<i
							v-if="station.paused && station.currentSong.title"
							class="material-icons"
							title="Station Paused"
							>pause</i
						>
						<i
							v-else-if="station.currentSong.title"
							class="material-icons"
							>music_note</i
						>
						<i v-else class="material-icons">music_off</i>
						<span
							v-if="station.currentSong.title"
							class="songTitle"
							:title="
								station.currentSong.artists.length > 0
									? 'Now Playing: ' +
									  station.currentSong.title +
									  ' by ' +
									  station.currentSong.artists.join(',')
									: 'Now Playing: ' +
									  station.currentSong.title
							"
							>{{ station.currentSong.title }}
							{{
								station.currentSong.artists.length > 0
									? " by " +
									  station.currentSong.artists.join(",")
									: ""
							}}</span
						>
						<span v-else class="songTitle">No Songs Playing</span>
					</div>
				</router-link>
				<h4 v-if="stations.length === 0">
					There are no stations to display
				</h4>
			</div>
			<main-footer />
		</div>
		<create-community-station v-if="modals.createCommunityStation" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import MainHeader from "../../components/layout/MainHeader.vue";
import MainFooter from "../../components/layout/MainFooter.vue";
import CreateCommunityStation from "./CreateCommunityStation.vue";
import UserIdToUsername from "../../components/common/UserIdToUsername.vue";

import io from "../../io";

export default {
	components: {
		MainHeader,
		MainFooter,
		CreateCommunityStation,
		UserIdToUsername
	},
	data() {
		return {
			recaptcha: {
				key: ""
			},
			stations: [],
			searchQuery: "",
			siteName: "Musare"
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			modals: state => state.modalVisibility.modals.home
		}),
		filteredStations() {
			const privacyOrder = ["public", "unlisted", "private"];
			return this.stations
				.filter(
					station =>
						JSON.stringify(Object.values(station)).indexOf(
							this.searchQuery
						) !== -1
				)
				.sort(
					(a, b) =>
						this.isOwner(b) - this.isOwner(a) ||
						this.isPlaying(b) - this.isPlaying(a) ||
						a.paused - b.paused ||
						privacyOrder.indexOf(a.privacy) -
							privacyOrder.indexOf(b.privacy) ||
						b.userCount - a.userCount
				);
		},
		favoriteStations() {
			return this.filteredStations.filter(
				station => station.isFavorited === true
			);
		}
	},
	mounted() {
		lofig.get("siteSettings.siteName").then(siteName => {
			this.siteName = siteName;
		});

		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			io.onConnect(() => {
				this.init();
			});
			this.socket.on("event:stations.created", res => {
				const station = res;
				if (
					this.stations.find(_station => _station._id === station._id)
				) {
					this.stations.forEach(s => {
						const _station = s;
						if (_station._id === station._id) {
							_station.privacy = station.privacy;
						}
					});
				} else {
					if (!station.currentSong)
						station.currentSong = {
							thumbnail: "/assets/notes-transparent.png"
						};
					if (station.currentSong && !station.currentSong.thumbnail)
						station.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.songId}/mqdefault.jpg`;
					this.stations.push(station);
				}
			});

			this.socket.on("event:station.removed", response => {
				const { stationId } = response;
				const station = this.stations.find(
					station => station._id === stationId
				);
				if (station) {
					const stationIndex = this.stations.indexOf(station);
					this.stations.splice(stationIndex, 1);
				}
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

			this.socket.on("event:station.updatePrivacy", response => {
				const { stationId, privacy } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.privacy = privacy;
					}
				});
			});

			this.socket.on("event:station.updateName", response => {
				const { stationId, name } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.name = name;
					}
				});
			});

			this.socket.on("event:station.updateDisplayName", response => {
				const { stationId, displayName } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.displayName = displayName;
					}
				});
			});

			this.socket.on("event:station.updateDescription", response => {
				const { stationId, description } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.description = description;
					}
				});
			});

			this.socket.on("event:station.updateTheme", response => {
				const { stationId, theme } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.theme = theme;
						if (theme === "blue") {
							station.themeCode = "rgb(2, 166, 242)";
						} else if (theme === "purple") {
							station.themeCode = "rgb(143, 40, 140)";
						} else if (theme === "teal") {
							station.themeCode = "rgb(0, 209, 178)";
						} else if (theme === "orange") {
							station.themeCode = "rgb(255, 94, 0)";
						} else {
							station.themeCode = "rgb(2, 166, 242)";
						}
					}
				});
			});

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

			this.socket.on("event:station.pause", response => {
				const { stationId } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.paused = true;
					}
				});
			});

			this.socket.on("event:station.resume", response => {
				const { stationId } = response;
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.paused = false;
					}
				});
			});

			this.socket.on("event:user.favoritedStation", stationId => {
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.isFavorited = true;
					}
				});
			});

			this.socket.on("event:user.unfavoritedStation", stationId => {
				this.stations.forEach(s => {
					const station = s;
					if (station._id === stationId) {
						station.isFavorited = false;
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
					data.stations.forEach(station => {
						const modifiableStation = station;

						if (!modifiableStation.currentSong)
							modifiableStation.currentSong = {
								thumbnail: "/assets/notes-transparent.png"
							};

						if (
							modifiableStation.currentSong &&
							!modifiableStation.currentSong.thumbnail
						)
							modifiableStation.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.songId}/mqdefault.jpg`;

						if (modifiableStation.theme === "blue") {
							modifiableStation.themeCode = "rgb(2, 166, 242)";
						} else if (modifiableStation.theme === "purple") {
							modifiableStation.themeCode = "rgb(143, 40, 140)";
						} else if (modifiableStation.theme === "teal") {
							modifiableStation.themeCode = "rgb(0, 209, 178)";
						} else if (modifiableStation.theme === "orange") {
							modifiableStation.themeCode = "rgb(255, 94, 0)";
						} else {
							modifiableStation.themeCode = "rgb(2, 166, 242)";
						}

						this.stations.push(modifiableStation);
					});
			});

			this.socket.emit("apis.joinRoom", "home", () => {});
		},
		isOwner(station) {
			return station.owner === this.userId;
		},
		isPlaying(station) {
			return typeof station.currentSong.title !== "undefined";
		},
		favoriteStation(station) {
			this.socket.emit("stations.favoriteStation", station._id, res => {
				if (res.status === "success") {
					new Toast({
						content: "Successfully favorited station.",
						timeout: 4000
					});
				} else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		unfavoriteStation(station) {
			this.socket.emit("stations.unfavoriteStation", station._id, res => {
				if (res.status === "success") {
					new Toast({
						content: "Successfully unfavorited station.",
						timeout: 4000
					});
				} else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("station", ["updateIfStationIsFavorited"])
	}
};
</script>

<style lang="scss">
@import "../../styles/global.scss";

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

.night-mode {
	.header .overlay {
		background: linear-gradient(
			180deg,
			rgba(34, 34, 34, 0.8) 0%,
			rgba(34, 34, 34, 0.95) 31.25%,
			rgba(34, 34, 34, 0.9) 54.17%,
			rgba(34, 34, 34, 0.8) 100%
		);
	}
	.card,
	.card-content,
	.card-content div {
		background-color: $night-mode-bg-secondary;
	}

	.card-content .icons i,
	.group-title i {
		color: $night-mode-text;
	}

	.card-image .image {
		background-color: #333;
	}

	.card-content .under-content .hostedBy {
		color: $night-mode-text;
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

.header {
	display: flex;
	height: 35vh;
	margin-top: -64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	img.background {
		height: 35vh;
		width: 100%;
		object-fit: cover;
		object-position: center;
		filter: blur(1px);
		border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;
		overflow: hidden;
	}
	.overlay {
		background: linear-gradient(
			180deg,
			rgba(3, 169, 244, 0.8) 0%,
			rgba(3, 169, 244, 0.95) 31.25%,
			rgba(3, 169, 244, 0.9) 54.17%,
			rgba(3, 169, 244, 0.8) 100%
		);
		position: absolute;
		height: 35vh;
		width: 100%;
		border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;
		overflow: hidden;
	}
	.content-container {
		position: absolute;
		left: 0;
		right: 0;
		margin-left: auto;
		margin-right: auto;
		text-align: center;
		height: 100%;
		height: 35vh;
		.content {
			position: absolute;
			top: 50%;
			left: 0;
			right: 0;
			transform: translateY(-50%);
			background-color: transparent !important;
			img.logo {
				max-height: 90px;
				font-size: 40px;
				color: white;
				font-family: Pacifico, cursive;
			}
			.buttons {
				display: flex;
				justify-content: center;
				margin-top: 20px;
				flex-wrap: wrap;

				.login,
				.register {
					margin: 5px 10px;
					padding: 10px 15px;
					border-radius: 5px;
					font-size: 18px;
					width: 100%;
					max-width: 250px;
					font-weight: 600;
					border: 0;
					height: inherit;
				}
				.login {
					background: white;
					color: $musare-blue;
				}
				.register {
					background: $purple;
					color: white;
				}
			}
		}
	}
	&.loggedIn {
		height: 20vh;
		.overlay,
		.content-container,
		img.background {
			height: 20vh;
		}
	}
}

@media only screen and (max-width: 550px) {
	.header {
		height: 45vh;
		.overlay,
		.content-container,
		img.background {
			height: 45vh;
		}
	}
}

.under-content {
	height: 20px;
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

		.material-icons {
			font-size: 22px;
		}
		.material-icons:first-child {
			margin-left: 5px;
		}
		.unlistedIcon {
			color: $light-orange;
		}
		.privateIcon {
			color: $dark-pink;
		}
		.homeIcon {
			color: $light-purple;
		}
	}

	.hostedBy {
		font-weight: 400;
		font-size: 12px;
		color: $black;
		.host,
		.host a {
			font-weight: 400;
			color: var(--station-theme);
			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
	}
}

.app {
	display: flex;
	flex-direction: column;
}

.users-count {
	font-size: 20px;
	position: relative;
	top: -4px;
}

.group {
	min-height: 64px;
	flex: 1 0 auto;
}

.station-card {
	display: inline-flex;
	flex-direction: row;
	overflow: hidden;
	margin: 10px;
	cursor: pointer;
	height: 150px;
	width: calc(100% - 30px);
	max-width: 400px;
	flex-wrap: wrap;
	border-radius: 5px;
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
	transition: all ease-in-out 0.2s;

	.card-content {
		padding: 10px 10px 10px 15px;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		-webkit-line-clamp: 2;

		.media {
			display: flex;
			align-items: center;
			margin-bottom: 0;

			.displayName {
				display: flex;
				align-items: center;
				width: 100%;
				overflow: hidden;
				text-overflow: ellipsis;
				display: flex;
				line-height: 30px;
				max-height: 30px;
				.favorite {
					position: absolute;
					color: $yellow;
					right: 10px;
					top: 10px;
					font-size: 28px;
				}
				h5 {
					font-size: 20px;
					font-weight: 400;
					margin: 0;
					display: inline;
					margin-right: 6px;
					line-height: 30px;
					text-overflow: ellipsis;
					overflow: hidden;
					white-space: nowrap;
					max-width: 200px;
				}

				i {
					font-size: 22px;
				}

				.verified-station {
					color: var(--station-theme);
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
			flex-grow: 1;
			text-align: left;
			word-wrap: break-word;
			margin-bottom: 0;
		}
	}

	.card-image {
		width: 120px;
		.image {
			box-shadow: 1px 0 3px rgba(100, 100, 100, 0.3);
			.ytThumbnailBg {
				background: url("/assets/notes-transparent.png") no-repeat
					center center;
				background-size: cover;
				height: 100%;
				width: 100%;
				position: absolute;
				top: 0;
				filter: blur(1px);
			}
			img {
				height: auto;
				width: 120px;
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
		background: var(--station-theme);
		// box-shadow: inset 0px 2px 4px rgba(100, 100, 100, 0.3);
		width: 100%;
		height: 30px;
		line-height: 30px;
		color: $white;
		font-weight: 400;
		font-size: 12px;
		padding: 0 5px;
		flex-basis: 100%;

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

	&.createStation {
		.card-image .image.is-square .material-icons {
			position: absolute;
			top: 25px;
			bottom: 25px;
			left: 0;
			right: 0;
			text-align: center;
			font-size: 70px;
			color: var(--station-theme);
		}
		.card-content {
			.media {
				margin-top: auto;
				.displayName h5 {
					font-weight: 600;
				}
			}
			.content {
				flex-grow: unset;
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
	margin: 10px 0;
	.group-title {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 25px 0;

		h1 {
			display: inline-block;
			font-size: 45px;
			margin: 0;
		}

		h2 {
			font-size: 35px;
			margin: 0;
		}

		a {
			display: flex;
			margin-left: 8px;
		}
	}
	&.bottom {
		margin-bottom: 40px;
	}
}
</style>
