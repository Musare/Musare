<script lang="ts" setup>
import {
	computed,
	defineAsyncComponent,
	onBeforeUnmount,
	onMounted,
	ref,
	watch
} from "vue";
import { useRoute, useRouter } from "vue-router";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useConfigStore } from "@/stores/config";
import { Station } from "@/types/station";
import dayjs from "@/dayjs";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const MediaItem = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/MediaItem.vue")
);
const MediaPlayer = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/MediaPlayer.vue")
);
const LeftSidebar = defineAsyncComponent(
	() => import("@/pages/NewStation/LeftSidebar.vue")
);
const RightSidebar = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Sidebar.vue")
);
const Queue = defineAsyncComponent(
	() => import("@/pages/NewStation/Queue.vue")
);
const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);

const props = defineProps<{
	id: string;
}>();

const { primaryColor } = useConfigStore();
const { userId, hasPermissionForStation, updatePermissionsForStation } =
	useUserAuthStore();
const { socket } = useWebsocketsStore();

const router = useRouter();
const route = useRoute();

const station = ref<Station>();
const canVoteToSkip = ref(false);
const votedToSkip = ref(false);
const votesToSkip = ref(0);
const reportStationStateInterval = ref();
const mediaPlayer = ref<typeof MediaPlayer>();
const systemTimeDifference = ref<{
	timeout?: number;
	current: number;
	last: number;
	consecutiveHighDifferenceCount: number;
}>({
	timeout: null,
	current: 0,
	last: 0,
	consecutiveHighDifferenceCount: 0
});

const startedAt = computed(() => dayjs(station.value.startedAt));

const pausedAt = computed(() => {
	if (station.value.paused) {
		return dayjs(station.value.pausedAt || station.value.startedAt);
	}

	return null;
});

const timePaused = computed(() => dayjs.duration(station.value.timePaused));

const timeOffset = computed(() =>
	dayjs.duration(systemTimeDifference.value.current)
);

const stationState = computed(() => {
	if (!station.value?.currentSong) return "no_song";
	if (station.value?.paused) return "station_paused";
	if (mediaPlayer.value) return mediaPlayer.value.playerState;
	return "buffering";
});

const votesRequiredToSkip = computed(() => {
	if (!station.value || !station.value.users.loggedIn) return 0;

	return Math.max(
		1,
		Math.round(
			station.value.users.loggedIn.length *
				(station.value.skipVoteThreshold / 100)
		)
	);
});

const refreshSkipVotes = () => {
	const { currentSong } = station.value;

	if (!currentSong) {
		canVoteToSkip.value = false;
		votedToSkip.value = false;
		votesToSkip.value = 0;

		return;
	}

	socket.dispatch(
		"stations.getSkipVotes",
		station.value._id,
		currentSong._id,
		res => {
			if (res.status === "success") {
				if (
					station.value.currentSong &&
					station.value.currentSong._id === currentSong._id
				) {
					const { skipVotes, skipVotesCurrent, voted } = res.data;

					canVoteToSkip.value = skipVotesCurrent;
					votedToSkip.value = voted;
					votesToSkip.value = skipVotes;
				}
			}
		}
	);
};

const redirectAwayUnauthorizedUser = () => {
	if (
		!hasPermissionForStation(station.value._id, "stations.view") &&
		station.value.privacy === "private"
	)
		router.push({
			path: "/",
			query: {
				toast: "You no longer have access to the station you were in."
			}
		});
};

const updateStationState = () => {
	socket.dispatch("stations.setStationState", stationState.value, () => {});
};

const setDocumentPrimaryColor = (theme: string) => {
	document.getElementsByTagName("html")[0].style.cssText =
		`--primary-color: var(--${theme})`;
};

const resume = () => {
	socket.dispatch("stations.resume", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully resumed the station.");
	});
};

const pause = () => {
	socket.dispatch("stations.pause", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully paused the station.");
	});
};

const forceSkip = () => {
	socket.dispatch("stations.forceSkip", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully skipped the station's current song.");
	});
};

const toggleSkipVote = (toastMessage?: string) => {
	if (!station.value.currentSong?._id) return;

	socket.dispatch(
		"stations.toggleSkipVote",
		station.value._id,
		station.value.currentSong._id,
		data => {
			if (data.status !== "success") new Toast(`Error: ${data.message}`);
			else
				new Toast(
					toastMessage ??
						"Successfully toggled vote to skip the current song."
				);
		}
	);
};

const automaticallySkipVote = () => {
	if (mediaPlayer.value?.isMediaPaused || station.value.currentSong.voted) {
		return;
	}

	toggleSkipVote(
		"Automatically voted to skip as this song isn't available for you."
	);

	// TODO: Persistent toast
};

const calculateTimeDifference = () => {
	if (localStorage.getItem("stationNoSystemTimeDifference") === "true") {
		console.log(
			"Not calculating time different because 'stationNoSystemTimeDifference' is 'true' in localStorage"
		);
		return;
	}

	clearTimeout(systemTimeDifference.value.timeout);

	// Store the current time in ms before we send a ping to the backend
	const beforePing = Date.now();
	socket.dispatch("ping", serverDate => {
		// Store the current time in ms after we receive a pong from the backend
		const afterPing = Date.now();

		// Calculate the approximate latency between the client and the backend, by taking the time the request took and dividing it in 2
		// This is not perfect, as the request could take longer to get to the server than be sent back, or the other way around
		let connectionLatency = (afterPing - beforePing) / 2;

		// If we have a station latency in localStorage, use that. Can be used for debugging.
		if (localStorage.getItem("stationLatency")) {
			connectionLatency = parseInt(
				localStorage.getItem("stationLatency")
			);
		}

		// Calculates the approximate different in system time that the current client has, compared to the system time of the backend
		// Takes into account the approximate latency, so if it took approximately 500ms between the backend sending the pong, and the client receiving the pong,
		// the system time from the backend has to have 500ms added for it to be correct
		const difference = serverDate + connectionLatency - afterPing;

		if (Math.abs(difference) > 3000) {
			console.warn("System time difference is bigger than 3 seconds.");
		}

		// Gets how many ms. difference there is between the last time this function was called and now
		const differenceBetweenLastTime = Math.abs(
			systemTimeDifference.value.last - difference
		);
		const differenceBetweenCurrent = Math.abs(
			systemTimeDifference.value.current - difference
		);

		// By default, we want to re-run this function every 5 minutes
		let timeoutTime = 1000 * 300;

		if (differenceBetweenCurrent > 250) {
			// If the calculated difference is more than 250ms, there might be something wrong
			if (differenceBetweenLastTime > 250) {
				// If there's more than 250ms difference between the last calculated difference, reset the difference in a row count to 1
				systemTimeDifference.value.consecutiveHighDifferenceCount = 1;
			} else if (
				systemTimeDifference.value.consecutiveHighDifferenceCount < 3
			) {
				systemTimeDifference.value.consecutiveHighDifferenceCount += 1;
			} else {
				// If we're on the third attempt in a row where the difference between last time is less than 250ms, accept it as the difference
				systemTimeDifference.value.consecutiveHighDifferenceCount = 0;
				systemTimeDifference.value.current = difference;
			}

			timeoutTime = 1000 * 10;
		} else {
			// Calculated difference is less than 250ms, so we just accept that it's correct
			systemTimeDifference.value.consecutiveHighDifferenceCount = 0;
			systemTimeDifference.value.current = difference;
		}

		if (systemTimeDifference.value.consecutiveHighDifferenceCount > 0) {
			console.warn(
				`System difference high difference in a row count: ${systemTimeDifference.value.consecutiveHighDifferenceCount}`
			);
		}

		systemTimeDifference.value.last = difference;

		systemTimeDifference.value.timeout = setTimeout(() => {
			calculateTimeDifference();
		}, timeoutTime);
	});
};

watch(
	() => station.value?.djs,
	(djs, oldDjs) => {
		if (!djs || !oldDjs) return;

		const wasDj = oldDjs.find(dj => dj._id === userId);
		const isDj = djs.find(dj => dj._id === userId);

		if (wasDj !== isDj)
			updatePermissionsForStation(station.value._id).then(
				redirectAwayUnauthorizedUser
			);
	}
);

watch(
	() => station.value?.name,
	async (name, oldName) => {
		if (!name || !oldName) return;

		await router.push(
			`${name}?${Object.keys(route.query)
				.map(
					key =>
						`${encodeURIComponent(key)}=${encodeURIComponent(
							JSON.stringify(route.query[key])
						)}`
				)
				.join("&")}`
		);

		// eslint-disable-next-line no-restricted-globals
		window.history.replaceState({ ...window.history.state, ...{} }, null);
	}
);

watch(
	() => station.value?.privacy,
	(privacy, oldPrivacy) => {
		if (!privacy || !oldPrivacy) return;

		if (privacy === "private") redirectAwayUnauthorizedUser();
	}
);

watch(
	() => station.value?.theme,
	theme => {
		if (!theme) return;

		setDocumentPrimaryColor(theme);
	}
);

watch(
	() => station.value?.currentSong?._id,
	() => {
		votedToSkip.value = false;
		votesToSkip.value = 0;
	}
);

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch("stations.join", props.id, ({ status, data }) => {
			if (status !== "success") {
				station.value = null;

				router.push("/404");
				return;
			}

			station.value = data;

			refreshSkipVotes();

			updatePermissionsForStation(station.value._id);

			updateStationState();

			reportStationStateInterval.value = setInterval(
				updateStationState,
				5000
			);

			calculateTimeDifference();
		});
	});

	socket.on("event:station.updated", res => {
		redirectAwayUnauthorizedUser();

		station.value = {
			...station.value,
			...res.data.station
		};
	});

	socket.on("event:station.pause", res => {
		station.value.pausedAt = res.data.pausedAt;
		station.value.paused = true;
	});

	socket.on("event:station.resume", res => {
		station.value.timePaused = res.data.timePaused;
		station.value.paused = false;
	});

	socket.on("event:station.toggleSkipVote", res => {
		console.log("toggleSkipVote", res);
		if (res.data.currentSongId !== station.value.currentSong?._id) return;

		if (res.data.voted) votesToSkip.value += 1;
		else votesToSkip.value -= 1;

		if (res.data.userId === userId) votedToSkip.value = res.data.voted;
	});

	socket.on("event:station.nextSong", res => {
		console.log("nextSong", res);
		station.value.currentSong = res.data.currentSong;
		station.value.startedAt = res.data.startedAt;
		station.value.paused = res.data.paused;
		station.value.timePaused = res.data.timePaused;
		station.value.pausedAt = 0;
	});

	socket.on("event:station.users.updated", res => {
		station.value.users = res.data.users;
	});

	socket.on("event:station.userCount.updated", res => {
		station.value.userCount = res.data.userCount;
	});

	socket.on("event:station.djs.added", res => {
		station.value.djs.push(res.data.user);
	});

	socket.on("event:station.djs.removed", res => {
		station.value.djs.forEach((dj, index) => {
			if (dj._id === res.data.user._id) {
				station.value.djs.splice(index, 1);
			}
		});
	});

	socket.on("keep.event:user.role.updated", redirectAwayUnauthorizedUser);

	socket.on("event:user.station.favorited", res => {
		if (res.data.stationId === station.value._id)
			station.value.isFavorited = true;
	});

	socket.on("event:user.station.unfavorited", res => {
		if (res.data.stationId === station.value._id)
			station.value.isFavorited = false;
	});

	socket.on("event:station.deleted", () => {
		router.push({
			path: "/",
			query: {
				toast: "The station you were in was deleted."
			}
		});
	});
});

onBeforeUnmount(() => {
	document.getElementsByTagName("html")[0].style.cssText =
		`--primary-color: ${primaryColor}`;

	clearInterval(reportStationStateInterval.value);

	clearTimeout(systemTimeDifference.value.timeout);

	if (station.value) {
		socket.dispatch("stations.leave", station.value._id, () => {});
	}
});
</script>

<template>
	<div v-if="station" class="app">
		<page-metadata :title="station.displayName" />

		<MainHeader />
		<div class="station-container">
			<LeftSidebar
				:station="station"
				:can-vote-to-skip="canVoteToSkip"
				:voted-to-skip="votedToSkip"
				:votes-to-skip="votesToSkip"
				:votes-required-to-skip="votesRequiredToSkip"
			/>
			<section
				style="
					display: flex;
					flex-grow: 1;
					gap: 40px;
					padding: 40px;
					max-height: calc(100vh - 64px);
					overflow: auto;
				"
			>
				<section
					style="
						display: flex;
						flex-direction: column;
						flex: 0 0 450px;
						gap: 10px;
						max-width: 450px;
						padding: 20px;
						background-color: var(--white);
						border-radius: 5px;
						border: solid 1px var(--light-grey-1);
					"
				>
					<MediaPlayer
						v-if="station.currentSong"
						ref="mediaPlayer"
						:source="station.currentSong"
						:source-started-at="startedAt"
						:source-paused-at="pausedAt"
						:source-time-paused="timePaused"
						:source-time-offset="timeOffset"
						sync-player-time-enabled
						@not-allowed="automaticallySkipVote"
						@not-found="automaticallySkipVote"
					>
						<template #sourcePausedReason>
							<p>
								<strong
									>This station is currently paused.</strong
								>
							</p>
							<p
								v-if="
									hasPermissionForStation(
										station._id,
										'stations.playback.toggle'
									)
								"
							>
								To continue playback click the resume station
								button below.
							</p>
							<p v-else>
								It can only be resumed by a station owner,
								station DJ or a site admin/moderator.
							</p>
						</template>
					</MediaPlayer>
					<h3
						style="
							margin: 0px;
							font-size: 16px;
							font-weight: 600 !important;
							line-height: 30px;
							display: inline-flex;
							align-items: center;
							gap: 5px;
						"
					>
						Currently Playing
						<span style="margin-right: auto"></span>

						<Button
							v-if="
								hasPermissionForStation(
									station._id,
									'stations.playback.toggle'
								) && !station.paused
							"
							icon="pause"
							square
							danger
							@click.prevent="pause"
							title="Pause station"
						/>
						<Button
							v-if="
								hasPermissionForStation(
									station._id,
									'stations.playback.toggle'
								) && station.paused
							"
							icon="play_arrow"
							square
							danger
							@click.prevent="resume"
							title="Resume station"
						/>
						<Button
							v-if="
								hasPermissionForStation(
									station._id,
									'stations.skip'
								)
							"
							icon="skip_next"
							square
							danger
							@click.prevent="forceSkip"
							title="Force skip station"
						/>

						<Button
							v-if="canVoteToSkip"
							icon="skip_next"
							:inverse="!votedToSkip"
							@click.prevent="toggleSkipVote"
							:title="
								votedToSkip
									? 'Remove vote to skip'
									: 'Vote to skip'
							"
						>
							{{ votesToSkip }}
							<small>/ {{ votesRequiredToSkip }}</small>
						</Button>
					</h3>
					<MediaItem
						v-if="station.currentSong"
						:media="station.currentSong"
						show-requested
					/>
					<h3
						style="
							margin: 0px;
							font-size: 16px;
							font-weight: 600 !important;
							line-height: 30px;
						"
					>
						Upcoming Queue
					</h3>
					<Queue :station="station" />
				</section>
				<section
					style="
						display: flex;
						flex-direction: column;
						flex-grow: 1;
						padding: 20px;
						background-color: var(--white);
						border-radius: 5px;
						border: solid 1px var(--light-grey-1);
					"
				></section>
			</section>
			<RightSidebar />
		</div>
		<MainFooter />
	</div>
</template>

<style lang="less" scoped>
/* inter-300 - latin */
@font-face {
	font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
	font-family: "Inter";
	font-style: normal;
	font-weight: 300;
	src: url("/fonts/inter-v18-latin-300.woff2") format("woff2"); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
}

/* inter-regular - latin */
@font-face {
	font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
	font-family: "Inter";
	font-style: normal;
	font-weight: 400;
	src: url("/fonts/inter-v18-latin-regular.woff2") format("woff2"); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
}

/* inter-500 - latin */
@font-face {
	font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
	font-family: "Inter";
	font-style: normal;
	font-weight: 500;
	src: url("/fonts/inter-v18-latin-500.woff2") format("woff2"); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
}

/* inter-600 - latin */
@font-face {
	font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
	font-family: "Inter";
	font-style: normal;
	font-weight: 600;
	src: url("/fonts/inter-v18-latin-600.woff2") format("woff2"); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
}

.station-container {
	position: relative;
	display: flex;
	flex: 1 0 auto;
	min-height: calc(100vh - 64px);
	background-color: var(--light-grey-2);
	color: var(--black);
}

:deep(.station-container) {
	--dark-grey-1: #515151;
	--light-grey-1: #d4d4d4;
	--light-grey-2: #ececec;
	--red: rgb(249, 49, 0);

	&,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6,
	p,
	button,
	input,
	select,
	textarea {
		font-family: "Inter";
		font-style: normal;
		font-weight: normal;
	}

	p,
	button,
	input,
	select,
	textarea {
		font-size: 16px;
	}

	*,
	*:before,
	*:after {
		box-sizing: border-box;
	}
}
</style>
