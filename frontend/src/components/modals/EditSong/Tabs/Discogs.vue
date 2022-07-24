<script setup lang="ts">
import { useStore } from "vuex";
import { ref, computed, onMounted } from "vue";
import Toast from "toasters";
import { useModalState, useModalActions } from "@/vuex_helpers";
import keyboardShortcuts from "@/keyboardShortcuts";

const props = defineProps({
	modalUuid: { type: String, default: "" },
	modalModulePath: {
		type: String,
		default: "modals/editSong/MODAL_UUID"
	},
	bulk: { type: Boolean, default: false }
});

const store = useStore();

const { socket } = store.state.websockets;

const modalState = useModalState(props.modalModulePath, {
	modalUuid: props.modalUuid
});
const song = computed(() => modalState.song);

const { selectDiscogsInfo } = useModalActions(
	props.modalModulePath,
	["selectDiscogsInfo"],
	{
		modalUuid: props.modalUuid
	}
);

const discogs = ref({
	apiResults: [],
	page: 1,
	pages: 1,
	disableLoadMore: false
});
const discogsQuery = ref("");
const discogsInput = ref();

const toggleAPIResult = index => {
	const apiResult = discogs.value.apiResults[index];
	if (apiResult.expanded === true) apiResult.expanded = false;
	else if (apiResult.gotMoreInfo === true) apiResult.expanded = true;
	else {
		fetch(apiResult.album.resourceUrl)
			.then(response => response.json())
			.then(data => {
				apiResult.album.artists = [];
				apiResult.album.artistIds = [];
				const artistRegex = /\\([0-9]+\\)$/;

				apiResult.dataQuality = data.data_quality;
				data.artists.forEach(artist => {
					apiResult.album.artists.push(
						artist.name.replace(artistRegex, "")
					);
					apiResult.album.artistIds.push(artist.id);
				});
				apiResult.tracks = data.tracklist.map(track => ({
					position: track.position,
					title: track.title
				}));
				apiResult.expanded = true;
				apiResult.gotMoreInfo = true;
			});
	}
};

const searchDiscogsForPage = page => {
	const query = discogsQuery.value;

	socket.dispatch("apis.searchDiscogs", query, page, res => {
		if (res.status === "success") {
			if (page === 1)
				new Toast(
					`Successfully searched. Got ${res.data.results.length} results.`
				);
			else
				new Toast(
					`Successfully got ${res.data.results.length} more results.`
				);

			if (page === 1) {
				discogs.value.apiResults = [];
			}

			discogs.value.pages = res.data.pages;

			discogs.value.apiResults = discogs.value.apiResults.concat(
				res.data.results.map(result => {
					const type =
						result.type.charAt(0).toUpperCase() +
						result.type.slice(1);

					return {
						expanded: false,
						gotMoreInfo: false,
						album: {
							id: result.id,
							title: result.title,
							type,
							year: result.year,
							genres: result.genre,
							albumArt: result.cover_image,
							resourceUrl: result.resource_url
						}
					};
				})
			);

			discogs.value.page = page;
			discogs.value.disableLoadMore = false;
		} else new Toast(res.message);
	});
};

const loadNextDiscogsPage = () => {
	discogs.value.disableLoadMore = true;
	searchDiscogsForPage(discogs.value.page + 1);
};

const onDiscogsQueryChange = () => {
	discogs.value.page = 1;
	discogs.value.pages = 1;
	discogs.value.apiResults = [];
	discogs.value.disableLoadMore = false;
};

const selectTrack = (apiResultIndex, trackIndex) => {
	const apiResult = JSON.parse(
		JSON.stringify(discogs.value.apiResults[apiResultIndex])
	);
	apiResult.track = apiResult.tracks[trackIndex];
	delete apiResult.tracks;
	delete apiResult.expanded;
	delete apiResult.gotMoreInfo;

	selectDiscogsInfo(apiResult);
};

onMounted(() => {
	discogsQuery.value = song.value.title;

	keyboardShortcuts.registerShortcut("editSong.focusDiscogs", {
		keyCode: 35,
		preventDefault: true,
		handler: () => {
			discogsInput.value.focus();
		}
	});
});
</script>

<template>
	<div class="discogs-tab">
		<div class="selected-discogs-info" v-if="!song.discogs">
			<p class="selected-discogs-info-none">None</p>
		</div>
		<div class="selected-discogs-info" v-if="song.discogs">
			<div class="top-container">
				<img :src="song.discogs.album.albumArt" />
				<div class="right-container">
					<p class="album-title">
						{{ song.discogs.album.title }}
					</p>
					<div class="bottom-row">
						<p class="type-year">
							<span>{{ song.discogs.album.type }}</span>
							•
							<span>{{ song.discogs.album.year }}</span>
						</p>
					</div>
				</div>
			</div>
			<div class="bottom-container">
				<p class="bottom-container-field">
					Artists:
					<span>{{ song.discogs.album.artists.join(", ") }}</span>
				</p>
				<p class="bottom-container-field">
					Genres:
					<span>{{ song.discogs.album.genres.join(", ") }}</span>
				</p>
				<p class="bottom-container-field">
					Data quality:
					<span>{{ song.discogs.dataQuality }}</span>
				</p>
				<p class="bottom-container-field">
					Track:
					<span
						>{{ song.discogs.track.position }}.
						{{ song.discogs.track.title }}</span
					>
				</p>
			</div>
		</div>

		<label class="label"> Search for a song from Discogs </label>
		<div class="control is-grouped input-with-button">
			<p class="control is-expanded">
				<input
					class="input"
					type="text"
					placeholder="Enter your Discogs query here..."
					ref="discogsInput"
					v-model="discogsQuery"
					@keyup.enter="searchDiscogsForPage(1)"
					@change="onDiscogsQueryChange"
					v-focus
				/>
			</p>
			<p class="control">
				<button class="button is-info" @click="searchDiscogsForPage(1)">
					<i class="material-icons icon-with-button">search</i>Search
				</button>
			</p>
		</div>

		<label class="label" v-if="discogs.apiResults.length > 0"
			>API results</label
		>
		<div class="api-results-container" v-if="discogs.apiResults.length > 0">
			<div
				class="api-result"
				v-for="(result, index) in discogs.apiResults"
				:key="result.album.id"
				tabindex="0"
				@keydown.space.prevent
				@keyup.enter="toggleAPIResult(index)"
			>
				<div class="top-container">
					<img :src="result.album.albumArt" />
					<div class="right-container">
						<p class="album-title">
							{{ result.album.title }}
						</p>
						<div class="bottom-row">
							<img
								src="/assets/arrow_up.svg"
								v-if="result.expanded"
								@click="toggleAPIResult(index)"
							/>
							<img
								src="/assets/arrow_down.svg"
								v-if="!result.expanded"
								@click="toggleAPIResult(index)"
							/>
							<p class="type-year">
								<span>{{ result.album.type }}</span>
								•
								<span>{{ result.album.year }}</span>
							</p>
						</div>
					</div>
				</div>
				<div class="bottom-container" v-if="result.expanded">
					<p class="bottom-container-field">
						Artists:
						<span>{{ result.album.artists.join(", ") }}</span>
					</p>
					<p class="bottom-container-field">
						Genres:
						<span>{{ result.album.genres.join(", ") }}</span>
					</p>
					<p class="bottom-container-field">
						Data quality:
						<span>{{ result.dataQuality }}</span>
					</p>
					<div class="tracks">
						<div
							class="track"
							tabindex="0"
							v-for="(track, trackIndex) in result.tracks"
							:key="`${track.position}-${track.title}`"
							@click="selectTrack(index, trackIndex)"
							@keyup.enter="selectTrack(index, trackIndex)"
						>
							<span>{{ track.position }}.</span>
							<p>{{ track.title }}</p>
						</div>
					</div>
				</div>
			</div>
			<button
				v-if="
					discogs.apiResults.length > 0 &&
					!discogs.disableLoadMore &&
					discogs.page < discogs.pages
				"
				class="button is-fullwidth is-info discogs-load-more"
				@click="loadNextDiscogsPage()"
			>
				Load more...
			</button>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.api-section,
	.api-result {
		background-color: var(--dark-grey-3) !important;
	}

	.api-result .tracks .track:hover,
	.api-result .tracks .track:focus,
	.selected-discogs-info {
		background-color: var(--dark-grey-2) !important;
	}

	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}

	.discogs-tab .top-container .right-container .bottom-row img {
		filter: invert(100%);
	}
}

.discogs-tab {
	> label {
		margin-top: 12px;
	}

	.top-container {
		display: flex;

		img {
			height: 85px;
			width: 85px;
		}

		.right-container {
			padding: 8px;
			display: flex;
			flex-direction: column;
			flex: 1;

			.album-title {
				flex: 1;
				font-weight: 600;
			}

			.bottom-row {
				display: flex;
				flex-flow: row;
				line-height: 15px;

				img {
					height: 15px;
					align-self: end;
					flex: 1;
					user-select: none;
					-moz-user-select: none;
					-ms-user-select: none;
					-webkit-user-select: none;
					cursor: pointer;
				}

				p {
					text-align: right;
				}

				.type-year {
					font-size: 13px;
					align-self: end;
				}
			}
		}
	}

	.bottom-container {
		padding: 12px;

		.bottom-container-field {
			line-height: 16px;
			margin-bottom: 8px;
			font-weight: 600;

			span {
				font-weight: 400;
			}
		}

		.bottom-container-field:last-of-type {
			margin-bottom: 8px;
		}
	}

	.selected-discogs-info {
		background-color: var(--white);
		border: 1px solid var(--light-grey-3);
		border-radius: @border-radius;
		margin-bottom: 16px;

		.selected-discogs-info-none {
			font-size: 18px;
			text-align: center;
		}

		.bottom-row > p {
			flex: 1;
		}
	}

	.api-results-container {
		.api-result {
			background-color: var(--white);
			border: 0.5px solid var(--light-grey-3);
			border-radius: @border-radius;
			margin-bottom: 16px;
		}
	}

	button {
		background-color: var(--primary-color) !important;

		&:focus,
		&:hover {
			filter: contrast(0.75);
		}
	}

	.tracks {
		margin-top: 12px;

		.track:first-child {
			margin-top: 0;
			border-radius: @border-radius @border-radius 0 0;
		}

		.track:last-child {
			border-radius: 0 0 @border-radius @border-radius;
		}

		.track {
			border: 0.5px solid var(--black);
			margin-top: -1px;
			line-height: 16px;
			display: flex;
			cursor: pointer;

			span {
				font-weight: 600;
				display: inline-block;
				margin-top: 7px;
				margin-bottom: 7px;
				margin-left: 7px;
			}

			p {
				display: inline-block;
				margin: 7px;
				flex: 1;
			}
		}

		.track:hover,
		.track:focus {
			background-color: var(--light-grey);
		}
	}

	.discogs-load-more {
		margin-bottom: 8px;
	}
}
</style>
