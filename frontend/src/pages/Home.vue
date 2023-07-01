<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import {
	defineAsyncComponent,
	ref,
	computed,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { DraggableList } from "vue-draggable-list";
import { useI18n } from "vue-i18n";
import { useWebsocketsStore } from "@/stores/websockets";
import { useConfigStore } from "@/stores/config";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import keyboardShortcuts from "@/keyboardShortcuts";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const { t } = useI18n();

const configStore = useConfigStore();
const userAuthStore = useUserAuthStore();
const route = useRoute();
const router = useRouter();

const { sitename, registrationDisabled } = storeToRefs(configStore);
const { loggedIn, currentUser } = storeToRefs(userAuthStore);
const { hasPermission } = userAuthStore;

const { socket } = useWebsocketsStore();

const stations = ref([]);
const searchQuery = ref("");
const orderOfFavoriteStations = ref([]);
const handledLoginRegisterRedirect = ref(false);

const isOwner = station =>
	loggedIn.value && station.owner === currentUser.value;
const isDj = station =>
	loggedIn.value && !!station.djs.find(dj => dj === currentUser.value._id);
const isOwnerOrDj = station => isOwner(station) || isDj(station);

const isPlaying = station => typeof station.currentSong.title !== "undefined";

const filteredStations = computed(() => {
	const privacyOrder = ["public", "unlisted", "private"];
	return stations.value
		.filter(
			station =>
				JSON.stringify(Object.values(station)).indexOf(
					searchQuery.value
				) !== -1
		)
		.sort(
			(a, b) =>
				Number(isOwner(b)) - Number(isOwner(a)) ||
				Number(isDj(b)) - Number(isDj(a)) ||
				Number(isPlaying(b)) - Number(isPlaying(a)) ||
				a.paused - b.paused ||
				privacyOrder.indexOf(a.privacy) -
					privacyOrder.indexOf(b.privacy) ||
				b.userCount - a.userCount
		);
});

const favoriteStations = computed(() =>
	filteredStations.value
		.filter(station => station.isFavorited === true)
		.sort(
			(a, b) =>
				orderOfFavoriteStations.value.indexOf(a._id) -
				orderOfFavoriteStations.value.indexOf(b._id)
		)
);

const { openModal } = useModalsStore();

const fetchStations = () => {
	socket.dispatch(
		"stations.index",
		route.query.adminFilter === undefined,
		res => {
			if (res.status === "success") {
				stations.value = res.data.stations.map(station => {
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

					return modifiableStation;
				});

				orderOfFavoriteStations.value = res.data.favorited;
			}
		}
	);
};

const canRequest = (station, requireLogin = true) =>
	station &&
	(!requireLogin || loggedIn.value) &&
	station.requests &&
	station.requests.enabled &&
	(station.requests.access === "user" ||
		(station.requests.access === "owner" &&
			(isOwnerOrDj(station) || hasPermission("stations.request"))));

const favoriteStation = stationId => {
	socket.dispatch("stations.favoriteStation", stationId, res => {
		if (res.status === "success") {
			new Toast("Successfully favorited station.");
		} else new Toast(res.message);
	});
};

const unfavoriteStation = stationId => {
	socket.dispatch("stations.unfavoriteStation", stationId, res => {
		if (res.status === "success") {
			new Toast("Successfully unfavorited station.");
		} else new Toast(res.message);
	});
};

const changeFavoriteOrder = ({ moved }) => {
	const { updatedList } = moved;
	socket.dispatch(
		"users.updateOrderOfFavoriteStations",
		updatedList.map(station => station._id),
		res => new Toast(res.message)
	);
};

watch(
	() => hasPermission("stations.index.other"),
	value => {
		if (!value && route.query.adminFilter === null)
			router.push({
				query: {
					...route.query,
					adminFilter: undefined
				}
			});
	}
);

onMounted(async () => {
	if (route.query.searchQuery)
		searchQuery.value = JSON.stringify(route.query.query);

	if (
		!loggedIn.value &&
		route.redirectedFrom &&
		(route.redirectedFrom.name === "login" ||
			route.redirectedFrom.name === "register") &&
		!handledLoginRegisterRedirect.value
	) {
		// Makes sure the login/register modal isn't opened whenever the home page gets remounted due to a code change
		handledLoginRegisterRedirect.value = true;
		openModal(route.redirectedFrom.name);
	}

	socket.onConnect(() => {
		socket.dispatch("apis.joinRoom", "home");

		fetchStations();
	});

	socket.on("event:station.created", res => {
		const { station } = res.data;

		if (stations.value.find(_station => _station._id === station._id)) {
			stations.value.forEach(s => {
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
			stations.value.push(station);
		}
	});

	socket.on("event:station.deleted", res => {
		const { stationId } = res.data;

		const station = stations.value.find(
			station => station._id === stationId
		);

		if (station) {
			const stationIndex = stations.value.indexOf(station);
			stations.value.splice(stationIndex, 1);

			if (station.isFavorited)
				orderOfFavoriteStations.value =
					orderOfFavoriteStations.value.filter(
						favoritedId => favoritedId !== stationId
					);
		}
	});

	socket.on("event:station.userCount.updated", res => {
		const station = stations.value.find(
			station => station._id === res.data.stationId
		);

		if (station) station.userCount = res.data.userCount;
	});

	socket.on("event:station.updated", res => {
		const stationIndex = stations.value
			.map(station => station._id)
			.indexOf(res.data.station._id);

		if (stationIndex !== -1) {
			stations.value[stationIndex] = {
				...stations.value[stationIndex],
				...res.data.station
			};
		}
	});

	socket.on("event:station.nextSong", res => {
		const station = stations.value.find(
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

	socket.on("event:station.pause", res => {
		const station = stations.value.find(
			station => station._id === res.data.stationId
		);

		if (station) station.paused = true;
	});

	socket.on("event:station.resume", res => {
		const station = stations.value.find(
			station => station._id === res.data.stationId
		);

		if (station) station.paused = false;
	});

	socket.on("event:user.station.favorited", res => {
		const { stationId } = res.data;

		const station = stations.value.find(
			station => station._id === stationId
		);

		if (station) {
			station.isFavorited = true;
			orderOfFavoriteStations.value.push(stationId);
		}
	});

	socket.on("event:user.station.unfavorited", res => {
		const { stationId } = res.data;

		const station = stations.value.find(
			station => station._id === stationId
		);

		if (station) {
			station.isFavorited = false;
			orderOfFavoriteStations.value =
				orderOfFavoriteStations.value.filter(
					favoritedId => favoritedId !== stationId
				);
		}
	});

	socket.on("event:user.orderOfFavoriteStations.updated", res => {
		orderOfFavoriteStations.value = res.data.order;
	});

	socket.on("event:station.djs.added", res => {
		if (loggedIn.value && res.data.user._id === currentUser.value._id)
			fetchStations();
	});

	socket.on("event:station.djs.removed", res => {
		if (loggedIn.value && res.data.user._id === currentUser.value._id)
			fetchStations();
	});

	socket.on("keep.event:user.role.updated", () => {
		fetchStations();
	});

	// ctrl + alt + f
	keyboardShortcuts.registerShortcut("home.toggleAdminFilter", {
		keyCode: 70,
		ctrl: true,
		alt: true,
		handler: () => {
			if (hasPermission("stations.index.other"))
				if (route.query.adminFilter === undefined)
					router.push({
						query: {
							...route.query,
							adminFilter: null
						}
					});
				else
					router.push({
						query: {
							...route.query,
							adminFilter: undefined
						}
					});
		}
	});
});

onBeforeUnmount(() => {
	socket.dispatch("apis.leaveRoom", "home", () => {});

	const shortcutNames = ["home.toggleAdminFilter"];

	shortcutNames.forEach(shortcutName => {
		keyboardShortcuts.unregisterShortcut(shortcutName);
	});
});
</script>

<template>
	<div>
		<page-metadata :title="t('Home')" />
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
							v-if="sitename === 'Musare'"
							src="/assets/white_wordmark.png"
							:alt="sitename"
							class="logo"
						/>
						<span v-else class="logo">{{ sitename }}</span>
						<div v-if="!loggedIn" class="buttons">
							<button
								class="button login"
								@click="openModal('login')"
							>
								{{ t("Login") }}
							</button>
							<button
								v-if="!registrationDisabled"
								class="button register"
								@click="openModal('register')"
							>
								{{ t("Register") }}
							</button>
						</div>
					</div>
				</div>
			</div>
			<div class="group" v-show="favoriteStations.length > 0">
				<div class="group-title">
					<div>
						<h2>{{ t("MyFavorites") }}</h2>
					</div>
				</div>

				<draggable-list
					item-key="_id"
					tag="span"
					:list="favoriteStations"
					@update="changeFavoriteOrder"
				>
					<template #item="{ element }">
						<router-link
							:to="{
								name: 'station',
								params: { id: element.name }
							}"
							:class="{
								'station-card': true,
								isPrivate: element.privacy === 'private',
								isMine: isOwner(element),
								isDj: isDj(element)
							}"
							:style="
								'--primary-color: var(--' + element.theme + ')'
							"
						>
							<div class="card-content">
								<song-thumbnail :song="element.currentSong">
									<template #icon>
										<div class="icon-container">
											<div
												v-if="
													isOwnerOrDj(element) ||
													hasPermission(
														'stations.view.manage'
													)
												"
												class="material-icons manage-station"
												@click.prevent="
													openModal({
														modal: 'manageStation',
														props: {
															stationId:
																element._id,
															sector: 'home'
														}
													})
												"
												:content="t('ManageStation')"
												v-tippy
											>
												{{ t("Icons.ManageStation") }}
											</div>
											<div
												v-else
												class="material-icons manage-station"
												@click.prevent="
													openModal({
														modal: 'manageStation',
														props: {
															stationId:
																element._id,
															sector: 'home'
														}
													})
												"
												:content="t('ViewQueue')"
												v-tippy
											>
												{{ t("Icons.ViewQueue") }}
											</div>
										</div>
									</template>
								</song-thumbnail>
								<div class="media">
									<div class="displayName">
										<i
											v-if="
												loggedIn && !element.isFavorited
											"
											@click.prevent="
												favoriteStation(element._id)
											"
											class="favorite material-icons"
											:content="t('FavoriteStation')"
											v-tippy
											>{{ t("Icons.Favorite") }}</i
										>
										<i
											v-if="
												loggedIn && element.isFavorited
											"
											@click.prevent="
												unfavoriteStation(element._id)
											"
											class="favorite material-icons"
											:content="t('UnfavoriteStation')"
											v-tippy
											>{{ t("Icons.Unfavorite") }}</i
										>
										<h5>{{ element.displayName }}</h5>
										<i
											v-if="element.type === 'official'"
											class="material-icons verified-station"
											:content="t('OfficialStation')"
											v-tippy="{
												theme: 'info'
											}"
										>
											{{ t("Icons.Verified") }}
										</i>
									</div>
									<div class="content">
										{{ element.description }}
									</div>
									<div class="under-content">
										<p class="hostedBy">
											{{ t("HostedBy") }}
											<span class="host">
												<span
													v-if="
														element.type ===
														'official'
													"
													:title="sitename"
													>{{ sitename }}</span
												>
												<user-link
													v-else
													:user-id="element.owner"
												/>
											</span>
										</p>
										<div class="icons">
											<i
												v-if="
													element.type ===
														'community' &&
													isOwner(element)
												"
												class="homeIcon material-icons"
												:content="t('UserOwnsStation')"
												v-tippy="{ theme: 'info' }"
												>{{ t("Icons.Home") }}</i
											>
											<i
												v-if="isDj(element)"
												class="djIcon material-icons"
												:content="t('UserIsDj')"
												v-tippy="{ theme: 'info' }"
												>{{ t("Icons.DJ") }}</i
											>
											<i
												v-if="
													element.privacy ===
													'private'
												"
												class="privateIcon material-icons"
												:content="t('StationPrivate')"
												v-tippy="{ theme: 'info' }"
												>{{ t("Icons.Private") }}</i
											>
											<i
												v-if="
													element.privacy ===
													'unlisted'
												"
												class="unlistedIcon material-icons"
												:content="t('StationUnlisted')"
												v-tippy="{ theme: 'info' }"
												>{{ t("Icons.Unlisted") }}</i
											>
										</div>
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
									:content="t('StationPaused')"
									v-tippy="{ theme: 'info' }"
									>{{ t("Icons.Pause") }}</i
								>
								<i
									v-else-if="element.currentSong.title"
									class="material-icons"
									>{{ t("Icons.Song") }}</i
								>
								<i v-else class="material-icons">{{
									t("Icons.NoSong")
								}}</i>
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
								<span v-else class="songTitle">{{
									t("NoSongsPlaying")
								}}</span>
								<i
									v-if="canRequest(element)"
									class="material-icons"
									content="You can request songs in this station"
									v-tippy="{ theme: 'info' }"
								>
									{{ t("Icons.RequestSong") }}
								</i>
							</div>
						</router-link>
					</template>
				</draggable-list>
			</div>
			<div class="group bottom">
				<div class="group-title">
					<div>
						<h1>{{ t("Station", 0) }}</h1>
					</div>
				</div>
				<a
					v-if="loggedIn"
					@click="openModal('createStation')"
					class="station-card createStation"
				>
					<div class="card-content">
						<div class="thumbnail">
							<figure class="image">
								<i class="material-icons">{{
									t("Icons.Station")
								}}</i>
							</figure>
						</div>
						<div class="media">
							<div class="displayName">
								<h5>{{ t("CreateStation") }}</h5>
							</div>
							<div class="content">
								{{ t("ClickToCreateStation") }}
							</div>
						</div>
					</div>
					<div class="bottomBar"></div>
				</a>
				<a
					v-else
					@click="openModal('login')"
					class="station-card createStation"
				>
					<div class="card-content">
						<div class="thumbnail">
							<figure class="image">
								<i class="material-icons">{{
									t("Icons.RequestSong")
								}}</i>
							</figure>
						</div>
						<div class="media">
							<div class="displayName">
								<h5>{{ t("CreateStation") }}</h5>
							</div>
							<div class="content">
								{{ t("LoginToCreateStation") }}
							</div>
						</div>
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
						isMine: isOwner(station),
						isDj: isDj(station)
					}"
					:style="'--primary-color: var(--' + station.theme + ')'"
				>
					<div class="card-content">
						<song-thumbnail :song="station.currentSong">
							<template #icon>
								<div class="icon-container">
									<div
										v-if="
											isOwnerOrDj(station) ||
											hasPermission(
												'stations.view.manage'
											)
										"
										class="material-icons manage-station"
										@click.prevent="
											openModal({
												modal: 'manageStation',
												props: {
													stationId: station._id,
													sector: 'home'
												}
											})
										"
										:content="t('ManageStation')"
										v-tippy
									>
										{{ t("Icons.ManageStation") }}
									</div>
									<div
										v-else
										class="material-icons manage-station"
										@click.prevent="
											openModal({
												modal: 'manageStation',
												props: {
													stationId: station._id,
													sector: 'home'
												}
											})
										"
										:content="t('ViewQueue')"
										v-tippy
									>
										{{ t("Icons.ViewQueue") }}
									</div>
								</div>
							</template>
						</song-thumbnail>
						<div class="media">
							<div class="displayName">
								<i
									v-if="loggedIn && !station.isFavorited"
									@click.prevent="
										favoriteStation(station._id)
									"
									class="favorite material-icons"
									:content="t('FavoriteStation')"
									v-tippy
									>{{ t("Icons.Favorite") }}</i
								>
								<i
									v-if="loggedIn && station.isFavorited"
									@click.prevent="
										unfavoriteStation(station._id)
									"
									class="favorite material-icons"
									:content="t('UnfavoriteStation')"
									v-tippy
									>{{ t("Icons.Unfavorite") }}</i
								>
								<h5>{{ station.displayName }}</h5>
								<i
									v-if="station.type === 'official'"
									class="material-icons verified-station"
									:content="t('OfficialStation')"
									v-tippy="{ theme: 'info' }"
								>
									{{ t("Icons.Verified") }}
								</i>
							</div>
							<div class="content">
								{{ station.description }}
							</div>
							<div class="under-content">
								<p class="hostedBy">
									{{ t("HostedBy") }}
									<span class="host">
										<span
											v-if="station.type === 'official'"
											:title="sitename"
											>{{ sitename }}</span
										>
										<user-link
											v-else
											:user-id="station.owner"
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
										:content="t('UserOwnsStation')"
										v-tippy="{ theme: 'info' }"
										>{{ t("Icons.Home") }}</i
									>
									<i
										v-if="isDj(station)"
										class="djIcon material-icons"
										:content="t('UserIsDj')"
										v-tippy="{ theme: 'info' }"
										>{{ t("Icons.DJ") }}</i
									>
									<i
										v-if="station.privacy === 'private'"
										class="privateIcon material-icons"
										:content="t('StationPrivate')"
										v-tippy="{ theme: 'info' }"
										>{{ t("Icons.Private") }}</i
									>
									<i
										v-if="station.privacy === 'unlisted'"
										class="unlistedIcon material-icons"
										:content="t('StationUnlisted')"
										v-tippy="{ theme: 'info' }"
										>{{ t("Icons.Unlisted") }}</i
									>
								</div>
							</div>
						</div>
					</div>
					<div class="bottomBar">
						<i
							v-if="station.paused && station.currentSong.title"
							class="material-icons"
							:content="t('StationPaused')"
							v-tippy="{ theme: 'info' }"
							>{{ t("Icons.Pause") }}</i
						>
						<i
							v-else-if="station.currentSong.title"
							class="material-icons"
							>{{ t("Icons.Song") }}</i
						>
						<i v-else class="material-icons">{{
							t("Icons.NoSong")
						}}</i>
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
						<span v-else class="songTitle">{{
							t("NoSongsPlaying")
						}}</span>
						<i
							v-if="canRequest(station)"
							class="material-icons"
							:content="t('CanRequestInStation')"
							v-tippy="{ theme: 'info' }"
						>
							{{ t("Icons.RequestSong") }}
						</i>
						<i
							v-else-if="canRequest(station, false)"
							class="material-icons"
							:content="t('LoginToRequestInStation')"
							v-tippy="{ theme: 'info' }"
						>
							{{ t("Icons.RequestSong") }}
						</i>
					</div>
				</router-link>
				<h4 v-if="stations.length === 0">
					{{ t("NoStationsToDisplay", 0) }}
				</h4>
			</div>
			<main-footer />
		</div>
	</div>
</template>

<style lang="less">
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
		top: 300px !important;

		&.loggedIn {
			top: 200px !important;
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

<style lang="less" scoped>
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

	@media only screen and (min-width: 1200px) {
		font-size: 15px;
	}

	@media only screen and (min-width: 992px) {
		font-size: 14.5px;
	}

	@media only screen and (min-width: 0) {
		font-size: 14px;
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
	.station-card {
		background-color: var(--dark-grey-3);

		.thumbnail {
			background-color: var(--dark-grey-2);

			i {
				user-select: none;
				-webkit-user-select: none;
			}
		}

		.card-content .media {
			.icons i,
			.under-content .hostedBy {
				color: var(--light-grey-2) !important;
			}
		}
	}

	.group-title i {
		color: var(--light-grey-2);
	}
}

.header {
	display: flex;
	height: 300px;
	margin-top: -64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	img.background {
		height: 300px;
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
		height: 300px;
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
		height: 300px;
		.content {
			position: absolute;
			top: 50%;
			left: 0;
			right: 0;
			transform: translateY(-50%);
			background-color: transparent !important;
			.logo {
				max-height: 90px;
				font-size: 50px;
				color: var(--white);
				font-family: Pacifico, cursive;
				user-select: none;
				white-space: nowrap;
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
					border-radius: @border-radius;
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
		height: 200px;
		.overlay,
		.content-container,
		img.background {
			height: 200px;
		}
	}
}

.app {
	display: flex;
	flex-direction: column;
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
	border-radius: @border-radius;
	box-shadow: @box-shadow;

	.card-content {
		display: flex;
		flex-direction: row;
		flex-grow: 1;

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

		.media {
			display: flex;
			position: relative;
			padding: 10px 10px 10px 15px;
			flex-direction: column;
			flex-grow: 1;
			-webkit-line-clamp: 2;

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
					.djIcon {
						color: var(--primary-color);
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
		.card-content {
			.thumbnail {
				.image {
					width: 120px;

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

			.media {
				margin: auto 0;

				.displayName h5 {
					font-weight: 600;
				}
				.content {
					flex-grow: unset;
					margin-bottom: auto;
				}
			}
		}
	}

	&:hover {
		box-shadow: @box-shadow-hover;
		transition: all ease-in-out 0.2s;
	}
}

.group {
	flex: 1 0 auto;
	text-align: center;
	width: 100%;
	margin: 10px 0;
	min-height: 64px;

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
