<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onUpdated } from "vue";
import Toast from "toasters";
import { DraggableList } from "vue-draggable-list";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";
import { useManageStationStore } from "@/stores/manageStation";
import { useUserAuthStore } from "@/stores/userAuth";

const MediaItem = defineAsyncComponent(
	() => import("@/components/MediaItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: null },
	sector: { type: String, default: "station" }
});

const userAuthStore = useUserAuthStore();
const { loggedIn } = storeToRefs(userAuthStore);

const { socket } = useWebsocketsStore();
const stationStore = useStationStore();
const manageStationStore = useManageStationStore({
	modalUuid: props.modalUuid
});

const actionableButtonVisible = ref(false);
const drag = ref(false);
const songItems = ref([]);

const station = computed({
	get: () => {
		if (props.sector === "manageStation") return manageStationStore.station;
		return stationStore.station;
	},
	set: value => {
		if (props.sector === "manageStation")
			manageStationStore.updateStation(value);
		else stationStore.updateStation(value);
	}
});

const queue = computed({
	get: () => {
		if (props.sector === "manageStation")
			return manageStationStore.songsList;
		return stationStore.songsList;
	},
	set: value => {
		if (props.sector === "manageStation")
			manageStationStore.updateSongsList(value);
		else stationStore.updateSongsList(value);
	}
});

const hasPermission = permission =>
	props.sector === "manageStation"
		? manageStationStore.hasPermission(permission)
		: stationStore.hasPermission(permission);

const canRequest = () =>
	station.value &&
	loggedIn.value &&
	station.value.requests &&
	station.value.requests.enabled &&
	(station.value.requests.access === "user" ||
		(station.value.requests.access === "owner" &&
			hasPermission("stations.request")));

const removeFromQueue = mediaSource => {
	socket.dispatch(
		"stations.removeFromQueue",
		station.value._id,
		mediaSource,
		res => {
			if (res.status === "success")
				new Toast("Successfully removed song from the queue.");
			else new Toast(res.message);
		}
	);
};

const repositionSongInQueue = ({ moved, song }) => {
	const { oldIndex, newIndex } = moved;
	if (oldIndex === newIndex) return; // we only need to update when song is moved
	const _song = song ?? queue.value[newIndex];
	socket.dispatch(
		"stations.repositionSongInQueue",
		station.value._id,
		{
			..._song,
			oldIndex,
			newIndex
		},
		res => {
			new Toast({ content: res.message, timeout: 4000 });
			if (res.status !== "success")
				queue.value.splice(
					oldIndex,
					0,
					queue.value.splice(newIndex, 1)[0]
				);
		}
	);
};

const moveSongToTop = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();
	repositionSongInQueue({
		moved: {
			oldIndex: index,
			newIndex: 0
		},
		song: queue.value[index]
	});
};

const moveSongToBottom = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();
	repositionSongInQueue({
		moved: {
			oldIndex: index,
			newIndex: queue.value.length - 1
		},
		song: queue.value[index]
	});
};

onUpdated(() => {
	// check if actionable button is visible, if not: set max-height of queue items to 100%
	actionableButtonVisible.value =
		document
			.getElementById("queue")
			.querySelectorAll(".tab-actionable-button").length > 0;
});

defineEmits(["onChangeTab"]);
</script>

<template>
	<div id="queue">
		<div class="inner-queue">
			<div
				v-if="queue.length > 0"
				:class="{
					'actionable-button-hidden': !actionableButtonVisible,
					'scrollable-list': true
				}"
			>
				<draggable-list
					v-model:list="queue"
					item-key="mediaSource"
					@start="drag = true"
					@end="drag = false"
					@update="repositionSongInQueue"
					:disabled="!hasPermission('stations.queue.reposition')"
				>
					<template #item="{ element, index }">
						<media-item
							:song="element"
							:requested-by="true"
							:requested-type="true"
							:disabled-actions="[]"
							:ref="el => (songItems[`song-item-${index}`] = el)"
							:key="`queue-song-item-${element.mediaSource}`"
						>
							<template
								v-if="
									hasPermission('stations.queue.reposition')
								"
								#tippyActions
							>
								<quick-confirm
									v-if="
										hasPermission('stations.queue.remove')
									"
									placement="left"
									@confirm="
										removeFromQueue(element.mediaSource)
									"
								>
									<i
										class="material-icons delete-icon"
										content="Remove Song from Queue"
										v-tippy
										>delete_forever</i
									>
								</quick-confirm>
								<i
									class="material-icons"
									v-if="index > 0"
									@click="moveSongToTop(index)"
									content="Move to top of Queue"
									v-tippy
									>vertical_align_top</i
								>
								<i
									v-if="queue.length - 1 !== index"
									@click="moveSongToBottom(index)"
									class="material-icons"
									content="Move to bottom of Queue"
									v-tippy
									>vertical_align_bottom</i
								>
							</template>
						</media-item>
					</template>
				</draggable-list>
			</div>
			<p class="nothing-here-text has-text-centered" v-else>
				There are no songs currently queued
			</p>
			<button
				v-if="canRequest() && sector === 'station'"
				class="floating button is-primary"
				@click="$emit('onChangeTab', 'request')"
			>
				<i class="material-icons icon-with-button">playlist_play</i>
				<span>Add song to queue</span>
			</button>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	#queue {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

#queue {
	background-color: var(--white);
	border-radius: 0 0 @border-radius @border-radius;
	user-select: none;

	.inner-queue {
		position: relative;
		height: 100%;
		width: 100%;

		.actionable-button-hidden {
			max-height: 100%;
		}

		#queue-locked {
			display: flex;
			justify-content: center;
		}

		button.disabled {
			filter: grayscale(0.4);
		}

		> .scrollable-list:last-of-type:not(:last-child) {
			height: calc(100% - 56px);
		}

		.button.floating {
			position: sticky;
			z-index: 10;

			bottom: 10px;
			right: 10px;
			left: 10px;

			width: calc(100% - 20px);

			margin-top: 50px;
		}
	}
}
</style>
