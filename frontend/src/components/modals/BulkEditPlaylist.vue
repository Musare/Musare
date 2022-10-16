<script setup lang="ts">
import {
	reactive,
	computed,
	defineAsyncComponent,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useLongJobsStore } from "@/stores/longJobs";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const PlaylistItem = defineAsyncComponent(
	() => import("@/components/PlaylistItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	youtubeIds: { type: Array, required: true }
});

const { closeCurrentModal } = useModalsStore();

const { setJob } = useLongJobsStore();

const { socket } = useWebsocketsStore();

const { openModal } = useModalsStore();

const search = reactive({
	query: "",
	searchedQuery: "",
	page: 0,
	count: 0,
	resultsLeft: 0,
	pageSize: 0,
	results: []
});

const resultsLeftCount = computed(() => search.count - search.results.length);

const nextPageResultsCount = computed(() =>
	Math.min(search.pageSize, resultsLeftCount.value)
);

const searchForPlaylists = page => {
	if (search.page >= page || search.searchedQuery !== search.query) {
		search.results = [];
		search.page = 0;
		search.count = 0;
		search.resultsLeft = 0;
		search.pageSize = 0;
	}

	const { query } = search;
	const action = "playlists.searchAdmin";

	search.searchedQuery = search.query;
	socket.dispatch(action, query, page, res => {
		const { data } = res;
		if (res.status === "success") {
			const { count, pageSize, playlists } = data;
			search.results = [...search.results, ...playlists];
			search.page = page;
			search.count = count;
			search.resultsLeft = count - search.results.length;
			search.pageSize = pageSize;
		} else if (res.status === "error") {
			search.results = [];
			search.page = 0;
			search.count = 0;
			search.resultsLeft = 0;
			search.pageSize = 0;
			new Toast(res.message);
		}
	});
};

const addSongsToPlaylist = playlistId => {
	let id;
	let title;

	socket.dispatch(
		"playlists.addSongsToPlaylist",
		playlistId,
		props.youtubeIds,
		{
			cb: () => {},
			onProgress: res => {
				if (res.status === "started") {
					id = res.id;
					title = res.title;
					closeCurrentModal();
				}

				if (id)
					setJob({
						id,
						name: title,
						...res
					});
			}
		}
	);
};

const removeSongsFromPlaylist = playlistId => {
	let id;
	let title;

	socket.dispatch(
		"playlists.removeSongsFromPlaylist",
		playlistId,
		props.youtubeIds,
		{
			cb: data => {
				console.log("FINISHED", data);
			},
			onProgress: res => {
				if (res.status === "started") {
					id = res.id;
					title = res.title;
					closeCurrentModal();
				}

				if (id)
					setJob({
						id,
						name: title,
						...res
					});
			}
		}
	);
};
</script>

<template>
	<div>
		<modal
			title="Bulk Edit Playlist"
			class="bulk-edit-playlist-modal"
			size="slim"
		>
			<template #body>
				<div>
					<label class="label">Search for a playlist</label>
					<div class="control is-grouped input-with-button">
						<p class="control is-expanded">
							<input
								class="input"
								type="text"
								placeholder="Enter your playlist query here..."
								v-model="search.query"
								@keyup.enter="searchForPlaylists(1)"
							/>
						</p>
						<p class="control">
							<a
								class="button is-info"
								@click="searchForPlaylists(1)"
								><i class="material-icons icon-with-button"
									>search</i
								>Search</a
							>
						</p>
					</div>
					<div v-if="search.results.length > 0">
						<playlist-item
							v-for="playlist in search.results"
							:key="`searchKey-${playlist._id}`"
							:playlist="playlist"
							:show-owner="true"
						>
							<template #actions>
								<quick-confirm
									@confirm="addSongsToPlaylist(playlist._id)"
								>
									<i
										class="material-icons add-to-playlist-icon"
										:content="`Add songs to playlist`"
										v-tippy
									>
										playlist_add
									</i>
								</quick-confirm>
								<quick-confirm
									@confirm="
										removeSongsFromPlaylist(playlist._id)
									"
								>
									<i
										class="material-icons remove-from-playlist-icon"
										:content="`Remove songs from playlist`"
										v-tippy
									>
										playlist_remove
									</i>
								</quick-confirm>
								<i
									@click="
										openModal({
											modal: 'editPlaylist',
											props: { playlistId: playlist._id }
										})
									"
									class="material-icons edit-icon"
									content="Edit Playlist"
									v-tippy
									>edit</i
								>
							</template>
						</playlist-item>
						<button
							v-if="resultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForPlaylists(search.page + 1)"
						>
							Load {{ nextPageResultsCount }} more results
						</button>
					</div>
				</div>
			</template>
		</modal>
	</div>
</template>

<style lang="less" scoped>
.label {
	text-transform: capitalize;
}

.playlist-item:not(:last-of-type) {
	margin-bottom: 10px;
}
.load-more-button {
	width: 100%;
	margin-top: 10px;
}
</style>
