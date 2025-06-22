<script lang="ts" setup>
import { computed, defineAsyncComponent, ref } from "vue";
import { storeToRefs } from "pinia";
import Toast from "toasters";
import { useSearchYoutube } from "@/composables/useSearchYoutube";
import { useSearchMusare } from "@/composables/useSearchMusare";
import { useYoutubeDirect } from "@/composables/useYoutubeDirect";
import { useSoundcloudDirect } from "@/composables/useSoundcloudDirect";
import { useConfigStore } from "@/stores/config";
import { Station } from "@/types/station";
import { useWebsocketsStore } from "@/stores/websockets";

const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);
const Input = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Input.vue")
);
const InputGroup = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/InputGroup.vue")
);
const MediaItem = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/MediaItem.vue")
);
const Select = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Select.vue")
);
const YoutubeSearchItem = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/YoutubeSearchItem.vue")
);

const props = defineProps<{
	station: Station;
}>();

const configStore = useConfigStore();
const { experimental, sitename } = storeToRefs(configStore);

const { socket } = useWebsocketsStore();
const { youtubeSearch, searchForSongs, loadMoreSongs } = useSearchYoutube();
const { musareSearch, searchForMusareSongs } = useSearchMusare();
const { youtubeDirect, addToQueue: addYoutubeToQueue } = useYoutubeDirect();
const { soundcloudDirect, addToQueue: addSoundcloudToQueue } =
	useSoundcloudDirect();

const addExternalQuery = ref("");
const searchSource = ref("local");
const originalSearchSource = ref("local");
const searchQuery = ref("");
const originalSearchQuery = ref("");

const searchResults = computed(() => {
	if (originalSearchQuery.value === "") return [];

	if (originalSearchSource.value === "youtube")
		return youtubeSearch.value.songs.results;

	return musareSearch.value.results;
});

const hasMoreResults = computed(() => {
	if (originalSearchQuery.value === "") return false;

	if (originalSearchSource.value === "youtube") return true;

	return musareSearch.value.count - musareSearch.value.results.length;
});

const addToQueue = (media: any) => {
	socket.dispatch(
		"stations.addToQueue",
		props.station._id,
		media.mediaSource,
		"manual",
		res => {
			if (res.status === "success") {
				media.isAddedToQueue = true;

				new Toast(res.message);
			} else new Toast(`Error: ${res.message}`);
		}
	);
};

const addYoutubeItemToQueue = (result: any) => {
	socket.dispatch(
		"stations.addToQueue",
		props.station._id,
		`youtube:${result.id}`,
		"manual",
		res => {
			if (res.status === "success") {
				result.isAddedToQueue = true;

				new Toast(res.message);
			} else new Toast(`Error: ${res.message}`);
		}
	);
};

const addExternal = () => {
	if (addExternalQuery.value === "") return;

	if (
		experimental.value.soundcloud &&
		(addExternalQuery.value.startsWith("soundcloud:") ||
			addExternalQuery.value.indexOf("soundcloud.com") !== -1)
	) {
		soundcloudDirect.value = addExternalQuery.value;
		addSoundcloudToQueue(props.station._id);

		addExternalQuery.value = "";

		return;
	}

	youtubeDirect.value = addExternalQuery.value;
	addYoutubeToQueue(props.station._id);

	addExternalQuery.value = "";
};

const search = () => {
	originalSearchSource.value = experimental.value.disable_youtube_search
		? "local"
		: searchSource.value;
	originalSearchQuery.value = searchQuery.value;

	if (originalSearchQuery.value === "") return;

	if (originalSearchSource.value === "youtube") {
		youtubeSearch.value.songs.query = originalSearchQuery.value;
		searchForSongs();

		return;
	}

	musareSearch.value.query = originalSearchQuery.value;
	searchForMusareSongs(1);
};

const loadMoreResults = () => {
	if (originalSearchSource.value === "youtube") {
		loadMoreSongs();

		return;
	}

	searchForMusareSongs(musareSearch.value.page + 1);
};

const resetSearch = () => {
	searchQuery.value = "";
	originalSearchQuery.value = "";
};
</script>

<template>
	<section class="search-section">
		<h2 class="search-section__title">Add external media</h2>
		<p v-if="experimental.soundcloud" class="search-section__description">
			Add media to station queue using a YouTube video ID,
			<br />
			or a direct link from YouTube or SoundCloud.
		</p>
		<p v-else class="search-section__description">
			Add media to station queue using a YouTube video ID or link.
		</p>
		<InputGroup
			class="search-section__form"
			is="form"
			@submit.prevent="addExternal"
		>
			<Input
				class="input_group__expanding"
				v-model="addExternalQuery"
				required
			>
				Direct link or YouTube video ID
			</Input>
			<Button type="submit" icon="add" square title="Add" />
		</InputGroup>
	</section>
	<hr class="search-section-divider" />
	<section class="search-section">
		<h2 class="search-section__title">Search for media</h2>
		<p class="search-section__description">
			Search for media on {{ sitename }}
			<template v-if="!experimental.disable_youtube_search">
				or YouTube
			</template>
			to add to the station queue.
		</p>
		<InputGroup
			class="search-section__form"
			is="form"
			@submit.prevent="search"
			@reset.prevent="resetSearch"
		>
			<Select
				v-if="!experimental.disable_youtube_search"
				v-model="searchSource"
				:options="{
					local: sitename,
					youtube: 'YouTube'
				}"
				required
			>
				Source
			</Select>
			<Input
				class="input_group__expanding"
				v-model="searchQuery"
				required
			>
				Query
			</Input>
			<Button
				type="reset"
				icon="restart_alt"
				square
				grey
				title="Reset search"
			/>
			<Button type="submit" icon="search" square title="Search" />
		</InputGroup>
		<ul class="search-results">
			<li
				v-for="(result, index) in searchResults"
				:key="index"
				class="search-results__result"
			>
				<YoutubeSearchItem
					v-if="originalSearchSource === 'youtube'"
					:item="result"
				>
					<template #featuredAction>
						<Button
							v-if="result.isAddedToQueue"
							icon="done"
							success
							square
							title="Added to queue"
						/>
						<Button
							v-else
							icon="queue"
							square
							title="Add to queue"
							@click.prevent="addYoutubeItemToQueue(result)"
						/>
					</template>
				</YoutubeSearchItem>
				<MediaItem v-else :media="result">
					<template #featuredAction>
						<Button
							v-if="result.isAddedToQueue"
							icon="done"
							success
							square
							title="Added to queue"
						/>
						<Button
							v-else
							icon="queue"
							square
							title="Add to queue"
							@click.prevent="addToQueue(result)"
						/>
					</template>
				</MediaItem>
			</li>
		</ul>
		<Button
			v-if="hasMoreResults"
			class="search-load-more"
			icon="search"
			inverse
			@click.prevent="loadMoreResults"
		>
			Load more results
		</Button>
	</section>
</template>

<style lang="less" scoped>
.search-section {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 10px;

	&__title {
		font-size: 20px !important;
		font-weight: 600 !important;
		margin: 0;
	}

	&__description {
		font-size: 14px !important;
	}

	&__form {
		max-width: 400px;
	}
}

.search-section-divider {
	background-color: var(--light-grey-2);
	border-radius: 10px;
	height: 5px;
	flex-shrink: 0;
}

.search-results {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;

	&__result {
		max-width: 100%;
		overflow: hidden;

		:deep(.media-item) {
			flex-grow: 1;
		}
	}
}

.search-load-more {
	align-self: center;
}
</style>
