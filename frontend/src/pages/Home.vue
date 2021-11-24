<template>
	<div>
		<page-metadata title="Home" />
		<div class="app home-page">
			<main-header
				:hide-logo="true"
				:transparent="true"
				:hide-logged-out="true"
			/>
			<div class="header" :class="{ loggedIn }">
				<img class="background" src="/assets/homebg.jpeg" />
				<div class="overlay"></div>
				<div class="content-container">
					<div class="content">
						<img
							class="logo"
							src="/assets/white_wordmark.png"
							:alt="`${this.sitename}` || `Musare`"
						/>
						<div v-if="!loggedIn" class="buttons">
							<button
								class="button login"
								@click="openModal('login')"
							>
								Login
							</button>
							<button
								class="button register"
								@click="openModal('register')"
							>
								Register
							</button>
						</div>
					</div>
				</div>
			</div>
			<div class="group" v-show="favoriteStations.length > 0">
				<div class="group-title">
					<div>
						<h2>My Favorites</h2>
					</div>
				</div>

				<draggable
					item-key="_id"
					v-model="favoriteStations"
					v-bind="dragOptions"
					@change="changeFavoriteOrder"
				>
					<template #item="{ element }">
						<router-link
							:to="{
								name: 'station',
								params: { id: element.name }
							}"
							:class="{
								'station-card': true,
								'item-draggable': true,
								isPrivate: element.privacy === 'private',
								isMine: isOwner(element)
							}"
							:style="
								'--primary-color: var(--' + element.theme + ')'
							"
						>
							<song-thumbnail :song="element.currentSong">
								<template #icon v-if="isOwnerOrAdmin(element)">
									<div class="icon-container">
										<div
											class="
												material-icons
												manage-station
											"
											@click.prevent="
												manageStation(element._id)
											"
											content="Manage Station"
											v-tippy
										>
											settings
										</div>
									</div>
								</template>
							</song-thumbnail>
							<div class="card-content">
								<div class="media">
									<div class="media-left displayName">
										<i
											v-if="
												loggedIn && !element.isFavorited
											"
											@click.prevent="
												favoriteStation(element._id)
											"
											class="favorite material-icons"
											content="Favorite Station"
											v-tippy
											>star_border</i
										>
										<i
											v-if="
												loggedIn && element.isFavorited
											"
											@click.prevent="
												unfavoriteStation(element._id)
											"
											class="favorite material-icons"
											content="Unfavorite Station"
											v-tippy
											>star</i
										>
										<h5>{{ element.displayName }}</h5>
										<i
											v-if="element.type === 'official'"
											class="
												material-icons
												verified-station
											"
											content="Verified Station"
											v-tippy="{
												theme: 'info'
											}"
										>
											check_circle
										</i>
									</div>
								</div>

								<div class="content">
									{{ element.description }}
								</div>
								<div class="under-content">
									<p class="hostedBy">
										Hosted by
										<span class="host">
											<span
												v-if="
													element.type === 'official'
												"
												title="Musare"
												>Musare</span
											>
											<user-id-to-username
												v-else
												:user-id="element.owner"
												:link="true"
											/>
										</span>
									</p>
									<div class="icons">
										<i
											v-if="
												element.type === 'community' &&
												isOwner(element)
											"
											class="homeIcon material-icons"
											content="This is your station."
											v-tippy="{ theme: 'info' }"
											>home</i
										>
										<i
											v-if="element.privacy === 'private'"
											class="privateIcon material-icons"
											content="This station is not visible to other users."
											v-tippy="{ theme: 'info' }"
											>lock</i
										>
										<i
											v-if="
												element.privacy === 'unlisted'
											"
											class="unlistedIcon material-icons"
											content="Unlisted Station"
											v-tippy="{ theme: 'info' }"
											>link</i
										>
									</div>
								</div>
							</div>
							<div class="bottomBar">
								<i
									v-if="
										element.paused &&
										element.currentSong.title
									"
									class="material-icons"
									content="Station Paused"
									v-tippy="{ theme: 'info' }"
									>pause</i
								>
								<i
									v-else-if="element.currentSong.title"
									class="material-icons"
									>music_note</i
								>
								<i v-else class="material-icons">music_off</i>
								<span
									v-if="element.currentSong.title"
									class="songTitle"
									:title="
										element.currentSong.artists.length > 0
											? 'Now Playing: ' +
											  element.currentSong.title +
											  ' by ' +
											  element.currentSong.artists.join(
													', '
											  )
											: 'Now Playing: ' +
											  element.currentSong.title
									"
									>{{ element.currentSong.title }}
									{{
										element.currentSong.artists.length > 0
											? " by " +
											  element.currentSong.artists.join(
													", "
											  )
											: ""
									}}</span
								>
								<span v-else class="songTitle"
									>No Songs Playing</span
								>
								<i
									class="material-icons stationMode"
									:content="
										element.partyMode
											? 'Station in Party mode'
											: 'Station in Playlist mode'
									"
									v-tippy="{ theme: 'info' }"
									>{{
										element.partyMode
											? "emoji_people"
											: "playlist_play"
									}}</i
								>
							</div>
						</router-link>
					</template>
				</draggable>
			</div>
			<div class="group bottom">
				<div class="group-title">
					<div>
						<h1>Stations</h1>
					</div>
				</div>
				<a
					v-if="loggedIn"
					@click="openModal('createStation')"
					class="station-card createStation"
				>
					<div class="thumbnail">
						<figure class="image">
							<i class="material-icons">radio</i>
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
				<a
					v-else
					@click="openModal('login')"
					class="station-card createStation"
				>
					<div class="thumbnail">
						<figure class="image">
							<i class="material-icons">radio</i>
						</figure>
					</div>
					<div class="card-content">
						<div class="media">
							<div class="media-left displayName">
								<h5>Create Station</h5>
							</div>
						</div>

						<div class="content">Login to create a station!</div>
					</div>
					<div class="bottomBar"></div>
				</a>

				<router-link
					v-for="station in filteredStations"
					:key="station._id"
					:to="{
						name: 'station',
						params: { id: station.name }
					}"
					class="station-card"
					:class="{
						isPrivate: station.privacy === 'private',
						isMine: isOwner(station)
					}"
					:style="'--primary-color: var(--' + station.theme + ')'"
				>
					<song-thumbnail :song="station.currentSong">
						<template #icon v-if="isOwnerOrAdmin(station)">
							<div class="icon-container">
								<div
									class="material-icons manage-station"
									@click.prevent="manageStation(station._id)"
									content="Manage Station"
									v-tippy
								>
									settings
								</div>
							</div>
						</template>
					</song-thumbnail>
					<div class="card-content">
						<div class="media">
							<div class="media-left displayName">
								<i
									v-if="loggedIn && !station.isFavorited"
									@click.prevent="
										favoriteStation(station._id)
									"
									class="favorite material-icons"
									content="Favorite Station"
									v-tippy
									>star_border</i
								>
								<i
									v-if="loggedIn && station.isFavorited"
									@click.prevent="
										unfavoriteStation(station._id)
									"
									class="favorite material-icons"
									content="Unfavorite Station"
									v-tippy
									>star</i
								>
								<h5>{{ station.displayName }}</h5>
								<i
									v-if="station.type === 'official'"
									class="material-icons verified-station"
									content="Verified Station"
									v-tippy="{ theme: 'info' }"
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
									content="This is your station."
									v-tippy="{ theme: 'info' }"
									>home</i
								>
								<i
									v-if="station.privacy === 'private'"
									class="privateIcon material-icons"
									content="This station is not visible to other users."
									v-tippy="{ theme: 'info' }"
									>lock</i
								>
								<i
									v-if="station.privacy === 'unlisted'"
									class="unlistedIcon material-icons"
									content="Unlisted Station"
									v-tippy="{ theme: 'info' }"
									>link</i
								>
							</div>
						</div>
					</div>
					<div class="bottomBar">
						<i
							v-if="station.paused && station.currentSong.title"
							class="material-icons"
							content="Station Paused"
							v-tippy="{ theme: 'info' }"
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
									  station.currentSong.artists.join(', ')
									: 'Now Playing: ' +
									  station.currentSong.title
							"
							>{{ station.currentSong.title }}
							{{
								station.currentSong.artists.length > 0
									? " by " +
									  station.currentSong.artists.join(", ")
									: ""
							}}</span
						>
						<span v-else class="songTitle">No Songs Playing</span>
						<i
							class="material-icons stationMode"
							:content="
								station.partyMode
									? 'Station in Party mode'
									: 'Station in Playlist mode'
							"
							v-tippy="{ theme: 'info' }"
							>{{
								station.partyMode
									? "emoji_people"
									: "playlist_play"
							}}</i
						>
					</div>
				</router-link>
				<h4 v-if="stations.length === 0">
					There are no stations to display
				</h4>
			</div>
			<main-footer />
		</div>
		<create-station v-if="modals.createStation" />
		<manage-station
			v-if="modals.manageStation"
			:station-id="editingStationId"
			sector="home"
		/>
		<request-song v-if="modals.requestSong" />
		<create-playlist v-if="modals.createPlaylist" />
		<edit-playlist v-if="modals.editPlaylist" />
		<edit-song v-if="modals.editSong" song-type="songs" sector="home" />
		<report v-if="modals.report" />
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";
import draggable from "vuedraggable";
import Toast from "toasters";

import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";
import SongThumbnail from "@/components/SongThumbnail.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

import ws from "@/ws";

export default {
	components: {
		MainHeader,
		MainFooter,
		SongThumbnail,
		CreateStation: defineAsyncComponent(() =>
			import("@/components/modals/CreateStation.vue")
		),
		ManageStation: defineAsyncComponent(() =>
			import("@/components/modals/ManageStation/index.vue")
		),
		RequestSong: defineAsyncComponent(() =>
			import("@/components/modals/RequestSong.vue")
		),
		EditPlaylist: defineAsyncComponent(() =>
			import("@/components/modals/EditPlaylist")
		),
		CreatePlaylist: defineAsyncComponent(() =>
			import("@/components/modals/CreatePlaylist.vue")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		UserIdToUsername,
		draggable
	},
	data() {
		return {
			recaptcha: { key: "" },
			stations: [],
			favoriteStations: [],
			searchQuery: "",
			sitename: "Musare",
			orderOfFavoriteStations: [],
			handledLoginRegisterRedirect: false,
			editingStationId: null
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role,
			modals: state => state.modalVisibility.modals
		}),
		...mapGetters({
			socket: "websockets/getSocket"
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
		dragOptions() {
			return {
				animation: 200,
				group: "favoriteStations",
				disabled: false,
				ghostClass: "draggable-list-ghost",
				filter: ".ignore-elements",
				fallbackTolerance: 50
			};
		}
	},
	watch: {
		orderOfFavoriteStations: {
			deep: true,
			handler() {
				this.calculateFavoriteStations();
			}
		}
	},
	async mounted() {
		this.sitename = await lofig.get("siteSettings.sitename");

		if (
			!this.loggedIn &&
			this.$route.redirectedFrom &&
			(this.$route.redirectedFrom.name === "login" ||
				this.$route.redirectedFrom.name === "register") &&
			!this.handledLoginRegisterRedirect
		) {
			// Makes sure the login/register modal isn't opened whenever the home page gets remounted due to a code change
			this.handledLoginRegisterRedirect = true;
			this.openModal(this.$route.redirectedFrom.name);
		}

		ws.onConnect(this.init);

		this.socket.on("event:station.created", res => {
			const { station } = res.data;

			if (this.stations.find(_station => _station._id === station._id)) {
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
					station.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.youtubeId}/mqdefault.jpg`;
				this.stations.push(station);
			}
		});

		this.socket.on("event:station.deleted", res => {
			const { stationId } = res.data;

			const station = this.stations.find(
				station => station._id === stationId
			);

			if (station) {
				const stationIndex = this.stations.indexOf(station);
				this.stations.splice(stationIndex, 1);

				if (station.isFavorited)
					this.orderOfFavoriteStations.filter(
						favoritedId => favoritedId !== stationId
					);
			}
		});

		this.socket.on("event:station.userCount.updated", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.userCount = res.data.userCount;
		});

		this.socket.on("event:station.privacy.updated", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.privacy = res.data.privacy;
		});

		this.socket.on("event:station.name.updated", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.name = res.data.name;
		});

		this.socket.on("event:station.displayName.updated", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.displayName = res.data.displayName;
		});

		this.socket.on("event:station.description.updated", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.description = res.data.description;
		});

		this.socket.on("event:station.theme.updated", res => {
			const { stationId, theme } = res.data;
			const station = this.stations.find(
				station => station._id === stationId
			);

			if (station) station.theme = theme;
		});

		this.socket.on("event:station.partyMode.updated", res => {
			const { stationId, partyMode } = res.data;
			const station = this.stations.find(
				station => station._id === stationId
			);

			if (station) station.partyMode = partyMode;
		});

		this.socket.on("event:station.nextSong", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) {
				let newSong = res.data.currentSong;

				if (!newSong)
					newSong = {
						thumbnail: "/assets/notes-transparent.png"
					};

				station.currentSong = newSong;
			}
		});

		this.socket.on("event:station.pause", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.paused = true;
		});

		this.socket.on("event:station.resume", res => {
			const station = this.stations.find(
				station => station._id === res.data.stationId
			);

			if (station) station.paused = false;
		});

		this.socket.on("event:user.station.favorited", res => {
			const { stationId } = res.data;

			const station = this.stations.find(
				station => station._id === stationId
			);

			if (station) {
				station.isFavorited = true;
				this.orderOfFavoriteStations.push(stationId);
			}
		});

		this.socket.on("event:user.station.unfavorited", res => {
			const { stationId } = res.data;

			const station = this.stations.find(
				station => station._id === stationId
			);

			if (station) {
				station.isFavorited = false;
				this.orderOfFavoriteStations =
					this.orderOfFavoriteStations.filter(
						favoritedId => favoritedId !== stationId
					);
			}
		});

		this.socket.on("event:user.orderOfFavoriteStations.updated", res => {
			this.orderOfFavoriteStations = res.data.order;
		});
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRoom", "home", () => {});
	},
	methods: {
		init() {
			this.socket.dispatch("stations.index", res => {
				this.stations = [];

				if (res.status === "success") {
					res.data.stations.forEach(station => {
						const modifiableStation = station;

						if (!modifiableStation.currentSong)
							modifiableStation.currentSong = {
								thumbnail: "/assets/notes-transparent.png"
							};

						if (
							modifiableStation.currentSong &&
							!modifiableStation.currentSong.thumbnail
						)
							modifiableStation.currentSong.ytThumbnail = `https://img.youtube.com/vi/${station.currentSong.youtubeId}/mqdefault.jpg`;

						this.stations.push(modifiableStation);
					});

					this.orderOfFavoriteStations = res.data.favorited;
				}
			});

			this.socket.dispatch("apis.joinRoom", "home");
		},
		isOwner(station) {
			return this.loggedIn && station.owner === this.userId;
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin(station) {
			return this.isOwner(station) || this.isAdmin();
		},
		isPlaying(station) {
			return typeof station.currentSong.title !== "undefined";
		},
		favoriteStation(stationId) {
			this.socket.dispatch("stations.favoriteStation", stationId, res => {
				if (res.status === "success") {
					new Toast("Successfully favorited station.");
				} else new Toast(res.message);
			});
		},
		unfavoriteStation(stationId) {
			this.socket.dispatch(
				"stations.unfavoriteStation",
				stationId,
				res => {
					if (res.status === "success") {
						new Toast("Successfully unfavorited station.");
					} else new Toast(res.message);
				}
			);
		},
		calculateFavoriteStations() {
			this.favoriteStations = this.filteredStations
				.filter(station => station.isFavorited === true)
				.sort(
					(a, b) =>
						this.orderOfFavoriteStations.indexOf(a._id) -
						this.orderOfFavoriteStations.indexOf(b._id)
				);
		},
		changeFavoriteOrder() {
			const recalculatedOrder = [];
			this.favoriteStations.forEach(station =>
				recalculatedOrder.push(station._id)
			);

			this.socket.dispatch(
				"users.updateOrderOfFavoriteStations",
				recalculatedOrder,
				res => new Toast(res.message)
			);
		},
		manageStation(stationId) {
			this.editingStationId = stationId;
			this.openModal("manageStation");
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("station", ["updateIfStationIsFavorited"])
	}
};
</script>

<style lang="scss">
.christmas-mode .home-page {
	.header .overlay {
		background: linear-gradient(
			180deg,
			rgba(231, 77, 60, 0.8) 0%,
			rgba(231, 77, 60, 0.95) 31.25%,
			rgba(231, 77, 60, 0.9) 54.17%,
			rgba(231, 77, 60, 0.8) 100%
		);
	}
	.christmas-lights {
		top: 35vh !important;

		&.loggedIn {
			top: 20vh !important;
		}
	}
	.header {
		&,
		.background,
		.overlay {
			border-radius: unset;
		}
	}
}
</style>

<style lang="scss" scoped>
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
	.station-card,
	.card-content,
	.card-content div {
		background-color: var(--dark-grey-3);
	}

	.card-content .icons i,
	.group-title i {
		color: var(--light-grey-2);
	}

	.thumbnail i {
		user-select: none;
		-webkit-user-select: none;
	}

	.thumbnail {
		background-color: var(--dark-grey-2);
	}

	.card-content .under-content .hostedBy {
		color: var(--light-grey-2);
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
	min-height: 300px;
	margin-top: -64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	img.background {
		height: 35vh;
		min-height: 300px;
		width: 100%;
		object-fit: cover;
		object-position: center;
		filter: blur(1px);
		border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;
		overflow: hidden;
		user-select: none;
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
		min-height: 300px;
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
		height: 35vh;
		min-height: 300px;
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
				color: var(--white);
				font-family: Pacifico, cursive;
				user-select: none;
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
					background: var(--white);
					color: var(--primary-color);
				}
				.register {
					background: var(--purple);
					color: var(--white);
				}
			}
		}
	}
	&.loggedIn {
		height: 20vh;
		min-height: 200px;
		.overlay,
		.content-container,
		img.background {
			height: 20vh;
			min-height: 200px;
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
			color: var(--orange);
		}
		.privateIcon {
			color: var(--dark-pink);
		}
		.homeIcon {
			color: var(--light-purple);
		}
	}

	.hostedBy {
		font-weight: 400;
		font-size: 12px;
		color: var(--black);
		.host,
		.host a {
			font-weight: 400;
			color: var(--primary-color);
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
	position: relative;
	background-color: var(--white);
	color: var(--dark-grey);
	flex-direction: row;
	overflow: hidden;
	margin: 10px;
	cursor: pointer;
	filter: none;
	height: 150px;
	width: calc(100% - 30px);
	max-width: 400px;
	flex-wrap: wrap;
	border-radius: 5px;
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);

	.card-content {
		display: flex;
		position: relative;
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
					color: var(--yellow);
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
					color: var(--primary-color);
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

	.thumbnail {
		display: flex;
		position: relative;
		min-width: 120px;
		width: 120px;
		height: 120px;
		margin: 0;

		.image {
			display: flex;
			position: relative;
			padding-top: 100%;
		}

		.icon-container {
			display: flex;
			position: absolute;
			z-index: 2;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;

			.material-icons.manage-station {
				display: inline-flex;
				opacity: 0;
				background: var(--primary-color);
				color: var(--white);
				margin: auto;
				font-size: 40px;
				border-radius: 100%;
				padding: 10px;
				transition: all 0.2s ease-in-out;
			}

			&:hover,
			&:focus {
				.material-icons.manage-station {
					opacity: 1;
					&:hover,
					&:focus {
						filter: brightness(90%);
					}
				}
			}
		}
	}

	.bottomBar {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--primary-color);
		width: 100%;
		height: 30px;
		line-height: 30px;
		color: var(--white);
		font-weight: 400;
		font-size: 12px;
		padding: 0 5px;
		flex-basis: 100%;

		i.material-icons {
			vertical-align: middle;
			margin-left: 5px;
			font-size: 22px;
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
		.thumbnail {
			.image {
				width: 120px;

				@media screen and (max-width: 330px) {
					width: 50px;

					.material-icons {
						font-size: 35px !important;
					}
				}

				.material-icons {
					position: absolute;
					top: 25px;
					bottom: 25px;
					left: 0;
					right: 0;
					text-align: center;
					font-size: 70px;
					color: var(--primary-color);
				}
			}
		}
		.card-content {
			width: min-content;

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

.community-button {
	cursor: pointer;
	transition: 0.25s ease color;
	font-size: 30px;
	color: var(--dark-grey);
}

.community-button:hover {
	color: var(--primary-color);
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
