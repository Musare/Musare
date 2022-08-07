<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onUpdated } from "vue";
import { Sortable } from "sortablejs-vue3";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";
import { useManageStationStore } from "@/stores/manageStation";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" },
	sector: { type: String, default: "station" }
});

const { socket } = useWebsocketsStore();
const stationStore = useStationStore();
const userAuthStore = useUserAuthStore();
const manageStationStore = useManageStationStore(props);

const { loggedIn, userId, role: userRole } = storeToRefs(userAuthStore);

const repositionSongInList = payload => {
	if (props.sector === "manageStation")
		return manageStationStore.repositionSongInList(payload);
	return stationStore.repositionSongInList(payload);
};

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

const isOwnerOnly = () =>
	loggedIn.value && userId.value === station.value.owner;

const isAdminOnly = () => loggedIn.value && userRole.value === "admin";

const dragOptions = computed(() => ({
	animation: 200,
	group: "queue",
	disabled: !(isAdminOnly() || isOwnerOnly()),
	ghostClass: "draggable-list-ghost"
}));

const removeFromQueue = youtubeId => {
	socket.dispatch(
		"stations.removeFromQueue",
		station.value._id,
		youtubeId,
		res => {
			if (res.status === "success")
				new Toast("Successfully removed song from the queue.");
			else new Toast(res.message);
		}
	);
};

const repositionSongInQueue = ({ oldIndex, newIndex }) => {
	if (oldIndex === newIndex) return; // we only need to update when song is moved
	const song = queue.value[oldIndex];
	socket.dispatch(
		"stations.repositionSongInQueue",
		station.value._id,
		{
			...song,
			oldIndex,
			newIndex
		},
		res => {
			new Toast({ content: res.message, timeout: 4000 });
			if (res.status !== "success")
				repositionSongInList({
					...song,
					oldIndex,
					newIndex
				});
		}
	);
};

const moveSongToTop = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();

	repositionSongInQueue({
		oldIndex: index,
		newIndex: 0
	});
};

const moveSongToBottom = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();

	repositionSongInQueue({
		oldIndex: index,
		newIndex: queue.value.length
	});
};

onUpdated(() => {
	// check if actionable button is visible, if not: set max-height of queue items to 100%
	actionableButtonVisible.value =
		document
			.getElementById("queue")
			.querySelectorAll(".tab-actionable-button").length > 0;
});
</script>

<template>
	<div id="queue">
		<div
			v-if="queue.length > 0"
			:class="{
				'actionable-button-hidden': !actionableButtonVisible,
				'scrollable-list': true
			}"
		>
			<Sortable
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
				:list="queue"
				item-key="_id"
				:options="dragOptions"
				@start="drag = true"
				@end="drag = false"
				@update="repositionSongInQueue"
			>
				<template #item="{ element, index }">
					<song-item
						:song="element"
						:requested-by="true"
						:class="{
							'item-draggable': isAdminOnly() || isOwnerOnly()
						}"
						:disabled-actions="[]"
						:ref="el => (songItems[`song-item-${index}`] = el)"
					>
						<template
							v-if="isAdminOnly() || isOwnerOnly()"
							#tippyActions
						>
							<quick-confirm
								v-if="isOwnerOnly() || isAdminOnly()"
								placement="left"
								@confirm="removeFromQueue(element.youtubeId)"
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
					</song-item>
				</template>
			</Sortable>
		</div>
		<p class="nothing-here-text has-text-centered" v-else>
			There are no songs currently queued
		</p>
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

	.actionable-button-hidden {
		max-height: 100%;
	}

	.song-item:not(:last-of-type) {
		margin-bottom: 10px;
	}

	#queue-locked {
		display: flex;
		justify-content: center;
	}

	button.disabled {
		filter: grayscale(0.4);
	}
}
</style>
