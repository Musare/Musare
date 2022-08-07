<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onMounted } from "vue";
import utils from "@/utils";

const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const props = defineProps({
	playlist: { type: Object, default: () => {} },
	showOwner: { type: Boolean, default: false }
});

const sitename = ref("Musare");

const totalLength = playlist => {
	let length = 0;
	playlist.songs.forEach(song => {
		length += song.duration;
	});
	return utils.formatTimeLong(length);
};

const playlistLength = computed(
	() =>
		`${totalLength(props.playlist)} • ${props.playlist.songs.length} ${
			props.playlist.songs.length === 1 ? "song" : "songs"
		}`
);

onMounted(async () => {
	sitename.value = await lofig.get("siteSettings.sitename");
});
</script>

<template>
	<div class="playlist-item universal-item">
		<slot name="item-icon">
			<span></span>
		</slot>
		<div class="item-title-description">
			<p class="item-title">
				{{ playlist.displayName }}
				<i
					v-if="playlist.privacy === 'private'"
					class="private-playlist-icon material-icons"
					content="This playlist is not visible to other users."
					v-tippy="{ theme: 'info' }"
					>lock</i
				>
			</p>
			<p class="item-description">
				<span v-if="showOwner"
					><a
						v-if="playlist.createdBy === 'Musare'"
						:title="sitename"
						>{{ sitename }}</a
					><user-link v-else :user-id="playlist.createdBy" />
					•
				</span>
				<span :title="playlistLength">
					{{ playlistLength }}
				</span>
			</p>
		</div>
		<div class="universal-item-actions">
			<div class="icons-group">
				<slot name="actions" />
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.playlist-item {
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;

		p {
			color: var(--light-grey-2) !important;
		}
	}
}

.playlist-item {
	width: 100%;
	height: 72px;
	column-gap: 7.5px;

	.item-title-description {
		flex: 1;
		overflow: hidden;

		.item-title {
			color: var(--dark-grey-2);
			font-size: 20px;
			line-height: 23px;
			margin-bottom: 0;
			display: flex;
			align-items: center;

			.private-playlist-icon {
				color: var(--dark-pink);
				font-size: 18px;
				margin-left: 5px;
			}
		}
	}

	.universal-item-actions {
		margin-left: none;

		div {
			display: flex;
			align-items: center;
			line-height: 1;

			button,
			.button {
				width: 100%;
				font-size: 17px;
				height: 36px;
			}
		}
	}
}
</style>
