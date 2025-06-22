<script lang="ts" setup>
import { defineAsyncComponent, onMounted, ref } from "vue";
import { DraggableList } from "vue-draggable-list";
import Toast from "toasters";
import { Station } from "@/types/station";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import DropdownListItem from "@/pages/NewStation/Components/DropdownListItem.vue";

const MediaItem = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/MediaItem.vue")
);

const props = defineProps<{
	station: Station;
}>();

const { hasPermissionForStation } = useUserAuthStore();
const { socket } = useWebsocketsStore();

const mediaItems = ref({});
const queue = ref([]);

const applyQueueOrder = queueOrder => {
	queue.value.sort((previous, current) => {
		const currentIndex = queueOrder.findIndex(
			mediaSource => mediaSource === previous.mediaSource
		);
		const previousIndex = queueOrder.findIndex(
			mediaSource => mediaSource === current.mediaSource
		);
		if (currentIndex > previousIndex) return 1;
		if (currentIndex < previousIndex) return -1;
		return 0;
	});
};

const getQueue = () => {
	socket.dispatch("stations.getQueue", props.station._id, res => {
		if (res.status === "success") {
			queue.value = res.data.queue;
		}
	});
};

const removeFromQueue = (media, index) => {
	mediaItems.value[`media-item-${index}`].collapseActions();

	socket.dispatch(
		"stations.removeFromQueue",
		props.station._id,
		media.mediaSource,
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
		props.station._id,
		{
			..._song,
			oldIndex,
			newIndex
		},
		res => {
			new Toast({ content: res.message, timeout: 4000 });

			if (res.status === "success") return;

			queue.value.splice(oldIndex, 0, queue.value.splice(newIndex, 1)[0]);
		}
	);
};

const moveToQueueTop = (media, oldIndex) => {
	mediaItems.value[`media-item-${oldIndex}`].collapseActions();

	repositionSongInQueue({
		moved: {
			oldIndex,
			newIndex: 0
		},
		song: media
	});
};

const moveToQueueBottom = (media, oldIndex) => {
	mediaItems.value[`media-item-${oldIndex}`].collapseActions();

	repositionSongInQueue({
		moved: {
			oldIndex,
			newIndex: queue.value.length - 1
		},
		song: media
	});
};

onMounted(() => {
	socket.onConnect(() => {
		getQueue();

		socket.on("event:station.queue.updated", res => {
			queue.value = res.data.queue;
		});

		socket.on("event:station.queue.order.changed", res => {
			applyQueueOrder(res.data.queueOrder);
		});
	});
});
</script>

<template>
	<ul>
		<DraggableList
			v-model:list="queue"
			tag="li"
			item-key="mediaSource"
			:disabled="
				!hasPermissionForStation(
					station._id,
					'stations.queue.reposition'
				)
			"
			@update="repositionSongInQueue"
		>
			<template #item="{ element: media, index }">
				<MediaItem
					:media="media"
					:ref="el => (mediaItems[`media-item-${index}`] = el)"
					show-requested
				>
					<template
						v-if="
							hasPermissionForStation(
								station._id,
								'stations.queue.reposition'
							)
						"
						#actions
					>
						<DropdownListItem
							v-if="index > 0"
							icon="vertical_align_top"
							label="Move to top of queue"
							@click="moveToQueueTop(media, index)"
						/>
						<DropdownListItem
							v-if="queue.length - 1 !== index"
							icon="vertical_align_bottom"
							label="Move to bottom of queue"
							@click="moveToQueueBottom(media, index)"
						/>
						<!-- TODO: Quick confirm -->
						<DropdownListItem
							v-if="
								hasPermissionForStation(
									station._id,
									'stations.queue.remove'
								)
							"
							icon="delete"
							label="Remove from queue"
							@click="removeFromQueue(media, index)"
						/>
					</template>
				</MediaItem>
			</template>
		</DraggableList>
	</ul>
</template>

<style lang="less" scoped>
ul {
	display: flex;
	flex-direction: column;
	gap: 10px;
	list-style: none;
	padding: 0;
	overflow: auto;

	:deep(li) {
		margin: 0 !important;
	}
}
</style>
