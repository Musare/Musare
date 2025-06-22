<script lang="ts" setup>
import { defineAsyncComponent, ref } from "vue";
import { storeToRefs } from "pinia";
import dayjs from "@/dayjs";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import DropdownListItem from "@/pages/NewStation/Components/DropdownListItem.vue";

const AddToPlaylistDropdown = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/AddToPlaylistDropdown.vue")
);
const Button = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Button.vue")
);
const DropdownList = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/DropdownList.vue")
);
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

// TODO: Experimental: soundcloud

const props = withDefaults(
	defineProps<{
		media: any;
		showRequested?: boolean;
	}>(),
	{
		showRequested: false
	}
);

const { openModal } = useModalsStore();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;
const { loggedIn } = storeToRefs(userAuthStore);

const actions = ref();

const expandActions = () => {
	actions.value.expand();
};

const collapseActions = () => {
	actions.value.collapse();
};

const edit = () => {
	collapseActions();

	openModal({
		modal: "editSong",
		props: { song: props.media }
	});
};

const report = () => {
	collapseActions();

	openModal({
		modal: "report",
		props: { song: props.media }
	});
};

const view = () => {
	collapseActions();

	openModal({
		modal: "viewMedia",
		props: { mediaSource: props.media.mediaSource }
	});
};

defineExpose({
	expandActions,
	collapseActions
});
</script>

<template>
	<div class="media-item">
		<SongThumbnail :song="media" />
		<div class="media-item__content">
			<p class="media-item__title" :title="media.title">
				{{ media.title }}
				<i
					v-if="media.verified"
					class="material-icons media-item__verified"
					title="Verified media"
				>
					check_circle
				</i>
			</p>
			<p class="media-item__artists" :title="media.artists?.join(', ')">
				{{ media.artists?.join(", ") }}
			</p>
			<p class="media-item__details">
				<strong>
					{{ dayjs.duration(media.duration, "s").formatDuration() }}
				</strong>
				<template
					v-if="
						showRequested &&
						(media.requestedBy || media.requestedType)
					"
				>
					<span class="media-item__divider">&middot;</span>
					<UserLink
						v-if="media.requestedBy"
						:key="media.mediaSource"
						:user-id="media.requestedBy"
					/>
					<span v-else>Station</span>
					<span>
						<template v-if="media.requestedType === 'autofill'">
							requested automatically
						</template>
						<template
							v-else-if="media.requestedType === 'autorequest'"
						>
							autorequested
						</template>
						<template v-else>requested</template>
					</span>
					<span :title="dayjs(media.requestedAt).format()">{{
						dayjs(media.requestedAt).fromNow()
					}}</span>
				</template>
			</p>
		</div>
		<slot name="featuredAction" />
		<DropdownList ref="actions">
			<Button icon="more_horiz" square inverse title="Actions" />

			<template #options>
				<slot name="actions" />

				<template v-if="loggedIn">
					<DropdownListItem>
						<AddToPlaylistDropdown
							:media-source="media.mediaSource"
						>
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
					<DropdownListItem
						icon="flag"
						label="Report song"
						@click="report"
					/>
					<DropdownListItem
						v-if="media._id && hasPermission('songs.update')"
						icon="edit"
						label="Edit song"
						@click="edit"
					/>
				</template>
				<DropdownListItem
					v-else
					icon="play_arrow"
					label="View on YouTube"
					:href="`https://www.youtube.com/watch?v=${media.mediaSource.split(':')[1]}`"
					target="_blank"
				/>
			</template>
		</DropdownList>
	</div>
</template>

<style lang="less" scoped>
.media-item {
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
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 12px !important;
		line-height: 16px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__verified {
		color: var(--primary-color);
		font-size: 12px !important;
	}

	&__artists {
		display: inline-flex;
		align-items: center;
		font-size: 11px !important;
		font-weight: 500 !important;
		line-height: 12px;
		color: var(--dark-grey-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__details {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		font-size: 10px !important;
		font-weight: 500 !important;
		line-height: 12px;
		color: var(--dark-grey-1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	&__divider {
		font-size: 25px;
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
