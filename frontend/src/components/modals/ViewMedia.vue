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
import { SoundcloudTrack } from "@/components/SoundcloudTrackInfo.vue";

const YoutubeVideoInfo = defineAsyncComponent(
	() => import("@/components/YoutubeVideoInfo.vue")
);
const YoutubePlayer = defineAsyncComponent(
	() => import("@/components/YoutubePlayer.vue")
);

const SoundcloudTrackInfo = defineAsyncComponent(
	() => import("@/components/SoundcloudTrackInfo.vue")
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

const soundcloudTrack = ref<SoundcloudTrack>({
	_id: null,
	trackId: null,
	userPermalink: null,
	permalink: null,
	title: null,
	username: null,
	duration: 0,
	soundcloudCreatedAt: null,
	artworkUrl: null
});

const currentSongMediaType = computed(() => props.mediaSource.split(":")[0]);
const currentSongMediaValue = computed(() => props.mediaSource.split(":")[1]);

const youtubeSongNormalized = computed(() => ({
	mediaSource: `youtube:${youtubeVideo.value.youtubeId}`,
	title: youtubeVideo.value.title,
	artists: [youtubeVideo.value.author],
	duration: youtubeVideo.value.duration
}));

const songNormalized = computed(() => {
	if (currentSongMediaType.value === "youtube")
		return youtubeSongNormalized.value;
	return {};
});

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

		if (currentSongMediaType.value === "youtube") {
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
							`view-media.${props.mediaSource}`
						);
					} else {
						new Toast("YouTube video with that ID not found");
						closeCurrentModal();
					}
				}
			);

			socket.on(
				"event:youtubeVideo.removed",
				() => {
					new Toast("This YouTube video was removed.");
					closeCurrentModal();
				},
				{ modalUuid: props.modalUuid }
			);
		} else if (currentSongMediaType.value === "soundcloud") {
			socket.dispatch(
				"soundcloud.getTrack",
				currentSongMediaValue.value,
				true,
				res => {
					if (res.status === "success") {
						soundcloudTrack.value = res.data;
						loaded.value = true;

						socket.dispatch(
							"apis.joinRoom",
							`view-media.${props.mediaSource}`
						);
					} else {
						new Toast("SoundCloud track with that ID not found");
						closeCurrentModal();
					}
				}
			);
		}
	});
});

onBeforeUnmount(() => {
	loaded.value = false;

	socket.dispatch(
		"apis.leaveRoom",
		`view-media.${props.mediaSource}`,
		() => {}
	);
});
</script>

<template>
	<modal title="View Song">
		<template #body>
			<template v-if="loaded">
				<template v-if="currentSongMediaType === 'youtube'">
					<youtube-video-info :video="youtubeVideo" />
					<youtube-player :song="youtubeSongNormalized" />
				</template>
				<template v-else-if="currentSongMediaType === 'soundcloud'">
					<soundcloud-track-info :track="soundcloudTrack" />
					<!-- <youtube-player :song="youtubeSongNormalized" /> -->
				</template>
			</template>
			<div v-else class="vertical-padding">
				<p>Media hasn't loaded yet</p>
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
								mediaSource,
								...songNormalized
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
					v-if="
						currentSongMediaType === 'youtube' &&
						hasPermission('youtube.removeVideos')
					"
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
