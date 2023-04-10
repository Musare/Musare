<script setup lang="ts">
import {
	defineAsyncComponent,
	onMounted,
	onBeforeUnmount,
	ref,
	computed
} from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";

import Modal from "@/components/Modal.vue";
import { YoutubeVideo } from "@/components/YoutubeVideoInfo.vue";

const YoutubeVideoInfo = defineAsyncComponent(
	() => import("@/components/YoutubeVideoInfo.vue")
);

const YoutubePlayer = defineAsyncComponent(
	() => import("@/components/YoutubePlayer.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	mediaSource: { type: String, default: null }
});

const youtubeVideo = ref<YoutubeVideo>({
	_id: null,
	youtubeId: null,
	title: null,
	author: null,
	duration: 0
});

const currentSongMediaType = computed(() => props.mediaSource.split(":")[0]);
const currentSongMediaValue = computed(() => props.mediaSource.split(":")[1]);

const loaded = ref(false);

const { openModal, closeCurrentModal } = useModalsStore();

const { socket } = useWebsocketsStore();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;

const youtubeRemove = () => {
	socket.dispatch("youtube.removeVideos", youtubeVideo.value._id, res => {
		if (res.status === "success") {
			new Toast("YouTube video successfully removed.");
			closeCurrentModal();
		} else {
			new Toast("Youtube video with that ID not found.");
		}
	});
};

const remove = () => {
	if (currentSongMediaType.value === "youtube") youtubeRemove();
	else throw new Error("Not implemented.");
};

onMounted(() => {
	socket.onConnect(() => {
		loaded.value = false;
		socket.dispatch(
			"youtube.getVideo",
			currentSongMediaValue.value,
			true,
			res => {
				if (res.status === "success") {
					youtubeVideo.value = res.data;
					loaded.value = true;

					socket.dispatch(
						"apis.joinRoom",
						`view-youtube-video.${youtubeVideo.value._id}`
					);
				} else {
					new Toast("YouTube video with that ID not found");
					closeCurrentModal();
				}
			}
		);
	});

	socket.on(
		"event:youtubeVideo.removed",
		() => {
			new Toast("This YouTube video was removed.");
			closeCurrentModal();
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	loaded.value = false;

	socket.dispatch(
		"apis.leaveRoom",
		`view-song.${youtubeVideo.value._id}`,
		() => {}
	);
});
</script>

<template>
	<modal title="View Song">
		<template #body>
			<youtube-video-info v-if="loaded" :video="youtubeVideo" />

			<youtube-player
				v-if="loaded"
				:song="{
					mediaSource: `youtube:${youtubeVideo.youtubeId}`,
					title: youtubeVideo.title,
					artists: [youtubeVideo.author],
					duration: youtubeVideo.duration
				}"
			/>

			<div v-if="!loaded" class="vertical-padding">
				<p>Video hasn't loaded yet</p>
			</div>
		</template>
		<template #footer>
			<button
				v-if="
					hasPermission('songs.create') ||
					hasPermission('songs.update')
				"
				class="button is-primary icon-with-button material-icons"
				@click.prevent="
					openModal({
						modal: 'editSong',
						props: {
							song: {
								mediaSource: `youtube:${youtubeVideo.youtubeId}`,
								...youtubeVideo
							}
						}
					})
				"
				content="Create/edit song from video"
				v-tippy
			>
				music_note
			</button>
			<div class="right">
				<button
					v-if="hasPermission('youtube.removeVideos')"
					class="button is-danger icon-with-button material-icons"
					@click.prevent="
						openModal({
							modal: 'confirm',
							props: {
								message:
									'Removing this video will remove it from all playlists and cause a ratings recalculation.',
								onCompleted: remove
							}
						})
					"
					content="Delete Video"
					v-tippy
				>
					delete_forever
				</button>
			</div>
		</template>
	</modal>
</template>

<style lang="less" scoped></style>
