<script setup lang="ts">
// TODO
import { useStore } from "vuex";
import { defineAsyncComponent, ref, computed, onUpdated } from "vue";
import draggable from "vuedraggable";
import Toast from "toasters";

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" },
	sector: { type: String, default: "station" }
});

const store = useStore();

const loggedIn = computed(() => store.state.user.auth.loggedIn);
const userId = computed(() => store.state.user.auth.userId);
const userRole = computed(() => store.state.user.auth.role);

const { socket } = store.state.websockets;

const repositionSongInList = payload => {
	if (props.sector === "manageStation")
		return store.dispatch(
			"modals/manageStation/repositionSongInList",
			payload
		);

	return store.dispatch("station/repositionSongInList", payload);
};

const actionableButtonVisible = ref(false);
const drag = ref(false);

const station = computed({
	get: () => {
		if (props.sector === "manageStation")
			return store.state.modals.manageStation[props.modalUuid].station;
		return store.state.station.station;
	},
	set: station => {
		if (props.sector === "manageStation")
			store.commit(
				`modals/manageStation/${props.modalUuid}/updateStation`,
				station
			);
		else store.commit("station/updateStation", station);
	}
});

const queue = computed({
	get: () => {
		if (props.sector === "manageStation")
			return store.state.modals.manageStation[props.modalUuid].songsList;
		return store.state.station.songsList;
	},
	set: queue => {
		if (props.sector === "manageStation")
			store.commit(
				`modals/manageStation/${props.modalUuid}/updateSongsList`,
				queue
			);
		else store.commit("station/updateSongsList", queue);
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

const repositionSongInQueue = ({ moved }) => {
	if (!moved) return; // we only need to update when song is moved

	socket.dispatch(
		"stations.repositionSongInQueue",
		station.value._id,
		{
			...moved.element,
			oldIndex: moved.oldIndex,
			newIndex: moved.newIndex
		},
		res => {
			new Toast({ content: res.message, timeout: 4000 });
			if (res.status !== "success")
				repositionSongInList({
					...moved.element,
					newIndex: moved.oldIndex,
					oldIndex: moved.newIndex
				});
		}
	);
};

const moveSongToTop = (song, index) => {
	// this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

	repositionSongInQueue({
		moved: {
			element: song,
			oldIndex: index,
			newIndex: 0
		}
	});
};

const moveSongToBottom = (song, index) => {
	// this.$refs[`song-item-${index}`].$refs.songActions.tippy.hide();

	repositionSongInQueue({
		moved: {
			element: song,
			oldIndex: index,
			newIndex: queue.value.length
		}
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
			<draggable
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
				v-model="queue"
				item-key="_id"
				v-bind="dragOptions"
				@start="drag = true"
				@end="drag = false"
				@change="repositionSongInQueue"
			>
				<template #item="{ element, index }">
					<song-item
						:song="element"
						:requested-by="true"
						:class="{
							'item-draggable': isAdminOnly() || isOwnerOnly()
						}"
						:disabled-actions="[]"
						:ref="`song-item-${index}`"
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
								@click="moveSongToTop(element, index)"
								content="Move to top of Queue"
								v-tippy
								>vertical_align_top</i
							>
							<i
								v-if="queue.length - 1 !== index"
								@click="moveSongToBottom(element, index)"
								class="material-icons"
								content="Move to bottom of Queue"
								v-tippy
								>vertical_align_bottom</i
							>
						</template>
					</song-item>
				</template>
			</draggable>
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
