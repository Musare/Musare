<script setup lang="ts">
import { defineAsyncComponent, onMounted } from "vue";
import { useSortablePlaylists } from "@/composables/useSortablePlaylists";
import { useModalsStore } from "@/stores/modals";

const PlaylistItem = defineAsyncComponent(
	() => import("@/components/PlaylistItem.vue")
);

const props = defineProps({
	userId: { type: String, default: "" },
	username: { type: String, default: "" }
});

const {
	Draggable,
	drag,
	userId,
	isCurrentUser,
	playlists,
	dragOptions,
	savePlaylistOrder
} = useSortablePlaylists();

const { openModal } = useModalsStore();

onMounted(() => {
	userId.value = props.userId;
});
</script>

<template>
	<div class="content playlists-tab">
		<div v-if="playlists.length > 0">
			<h4 class="section-title">
				{{ isCurrentUser ? "My" : null }}
				Playlists
			</h4>

			<p class="section-description">
				View
				{{
					isCurrentUser ? "and manage your personal" : `${username}'s`
				}}
				playlists
			</p>

			<hr class="section-horizontal-rule" />

			<draggable
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
				name="profile-playlists"
				v-if="playlists.length > 0"
				:list="playlists"
				item-key="_id"
				:options="dragOptions"
				@start="drag = true"
				@end="drag = false"
				@update="savePlaylistOrder"
			>
				<template #item="{ element }">
					<playlist-item
						v-if="
							element.privacy === 'public' ||
							(element.privacy === 'private' &&
								element.createdBy === userId)
						"
						:playlist="element"
						:class="{
							item: true,
							'item-draggable': isCurrentUser
						}"
					>
						<template #actions>
							<i
								v-if="isCurrentUser"
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: element._id }
									})
								"
								class="material-icons edit-icon"
								content="Edit Playlist"
								v-tippy
								>edit</i
							>
							<i
								v-else
								@click="
									openModal({
										modal: 'editPlaylist',
										data: { playlistId: element._id }
									})
								"
								class="material-icons view-icon"
								content="View Playlist"
								v-tippy
								>visibility</i
							>
						</template>
					</playlist-item>
				</template>
			</draggable>

			<button
				v-if="isCurrentUser"
				class="button is-primary"
				id="create-new-playlist-button"
				@click="openModal('createPlaylist')"
			>
				Create new playlist
			</button>
		</div>
		<div v-else>
			<h5>No playlists here.</h5>
		</div>
	</div>
</template>
