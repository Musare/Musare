<script lang="ts" setup>
import { defineAsyncComponent, ref } from "vue";
import { useModalsStore } from "@/stores/modals";

const AddToPlaylistDropdown = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/AddToPlaylistDropdown.vue")
);
const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);
const DropdownList = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/DropdownList.vue")
);
const DropdownListItem = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/DropdownListItem.vue")
);
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

const props = defineProps<{
	item: {
		id: string;
		url: string;
		title: string;
		thumbnail: string;
		channelId: string;
		channelTitle: string;
		isAddedToQueue: boolean;
	};
}>();

const { openModal } = useModalsStore();

const actions = ref();

const expandActions = () => {
	actions.value.expand();
};

const collapseActions = () => {
	actions.value.collapse();
};

const view = () => {
	collapseActions();

	openModal({
		modal: "viewMedia",
		props: { mediaSource: `youtube:${props.item.id}` }
	});
};

defineExpose({
	expandActions,
	collapseActions
});
</script>

<template>
	<div class="youtube-search-item">
		<SongThumbnail
			:song="{
				thumbnail: item.thumbnail,
				youtubeId: item.id
			}"
		/>
		<div class="youtube-search-item__content">
			<p class="youtube-search-item__title" :title="item.title">
				{{ item.title }}
			</p>
			<a
				v-if="item.channelTitle && item.channelId"
				class="youtube-search-item__channel"
				:title="item.channelTitle"
				:href="'https://youtube.com/channel/' + item.channelId"
				target="_blank"
			>
				{{ item.channelTitle }}
			</a>
		</div>
		<slot name="featuredAction" />
		<DropdownList ref="actions">
			<Button icon="more_horiz" square inverse title="Actions" />

			<template #options>
				<slot name="actions" />

				<DropdownListItem>
					<AddToPlaylistDropdown :media-source="`youtube:${item.id}`">
						<button class="dropdown-list-item__action">
							<span
								class="material-icons dropdown-list-item__icon"
								aria-hidden="true"
							>
								playlist_add
							</span>
							Add to playlist
						</button>
					</AddToPlaylistDropdown>
				</DropdownListItem>
				<DropdownListItem
					icon="play_arrow"
					label="View media"
					@click="view"
				/>
			</template>
		</DropdownList>
	</div>
</template>

<style lang="less" scoped>
.youtube-search-item {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	height: 48px;
	background-color: var(--white);
	border-radius: 5px;
	border: solid 1px var(--light-grey-1);
	gap: 5px;
	overflow: hidden;

	:deep(.thumbnail) {
		height: 48px;
		min-width: 48px;
		flex-shrink: 0;
		margin: 0;
	}

	&__content {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-width: 0;
		justify-content: center;
	}

	&__title {
		font-size: 11.75px !important;
		line-height: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		word-wrap: break-word;
	}

	&__channel {
		display: inline-flex;
		align-items: center;
		align-self: start;
		font-size: 10px !important;
		font-weight: 500 !important;
		line-height: 12px;
		color: var(--dark-grey-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& > :deep(.dropdown-list__reference) {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding-right: 5px;
	}

	:deep(.dropdown-list-item > .dropdown-list__reference) {
		display: flex;
		flex-grow: 1;
	}
}
</style>
