<script setup lang="ts">
import { defineAsyncComponent, computed, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";
import SongItem from "@/components/SongItem.vue";

const stationStore = useStationStore();

const { socket } = useWebsocketsStore();

const { history } = storeToRefs(stationStore);

const station = computed({
	get() {
		return stationStore.station;
	},
	set(value) {
		stationStore.updateStation(value);
	}
});

const songsList = computed({
	get() {
		return stationStore.songsList;
	},
	set(value) {
		stationStore.updateSongsList(value);
	}
});

const songsInQueue = computed(() => {
	if (station.value.currentSong)
		return songsList.value
			.map(song => song.youtubeId)
			.concat(station.value.currentSong.youtubeId);
	return songsList.value.map(song => song.youtubeId);
});

const formatDate = dateString => {
	const skippedAtDate = new Date(dateString);
	const now = new Date();
	const time = `${skippedAtDate
		.getHours()
		.toString()
		.padStart(2, "0")}:${skippedAtDate
		.getMinutes()
		.toString()
		.padStart(2, "0")}`;
	const date = `${skippedAtDate.getFullYear()}-${(
		skippedAtDate.getMonth() + 1
	)
		.toString()
		.padStart(2, "0")}-${skippedAtDate
		.getDate()
		.toString()
		.padStart(2, "0")}`;
	if (skippedAtDate.toLocaleDateString() === now.toLocaleDateString()) {
		return time;
	}
	return `${date} ${time}`;
};
const formatSkipReason = skipReason => {
	if (skipReason === "natural") return "";
	if (skipReason === "other") return " - automatically skipped";
	if (skipReason === "vote_skip") return " - vote skipped";
	if (skipReason === "force_skip") return " - force skipped";
	return "";
};

const addSongToQueue = (youtubeId: string) => {
	socket.dispatch(
		"stations.addToQueue",
		station.value._id,
		youtubeId,
		res => {
			if (res.status !== "success") new Toast(`Error: ${res.message}`);
			else {
				new Toast(res.message);
			}
		}
	);
};

onMounted(async () => {});
</script>

<template>
	<div class="station-history">
		<div v-for="historyItem in history" :key="historyItem._id">
			<SongItem
				:song="historyItem.payload.song"
				:requested-by="true"
				:header="`Finished playing at ${formatDate(
					historyItem.payload.skippedAt
				)}${formatSkipReason(historyItem.payload.skipReason)}`"
			>
				<template #actions>
					<transition
						name="musare-history-query-actions"
						mode="out-in"
					>
						<i
							v-if="
								songsInQueue.indexOf(
									historyItem.payload.song.youtubeId
								) !== -1
							"
							class="material-icons disabled"
							content="Song is already in queue"
							v-tippy
							>queue</i
						>
						<i
							v-else
							class="material-icons add-to-queue-icon"
							@click="
								addSongToQueue(
									historyItem.payload.song.youtubeId
								)
							"
							content="Add Song to Queue"
							v-tippy
							>queue</i
						>
					</transition>
				</template>
			</SongItem>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.station-history {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

.station-history {
	background-color: var(--white);
	margin-bottom: 20px;
	border-radius: 0 0 @border-radius @border-radius;
	max-height: 100%;
	padding: 12px;

	overflow: auto;

	row-gap: 8px;
	display: flex;
	flex-direction: column;

	h1 {
		margin: 0;
	}

	.disabled {
		cursor: not-allowed;
	}

	:deep(.song-item) {
		height: 90px;

		.thumbnail {
			min-width: 90px;
			width: 90px;
			height: 90px;
		}

		.song-info {
			margin-left: 90px;
		}
	}
}
</style>
