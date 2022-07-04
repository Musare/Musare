<script setup lang="ts">
import {
	defineAsyncComponent,
	computed,
	onMounted,
	onBeforeUnmount
} from "vue";
import { useStore } from "vuex";
import { useSortablePlaylists } from "@/composables/useSortablePlaylists";
import ws from "@/ws";

const PlaylistItem = defineAsyncComponent(
	() => import("@/components/PlaylistItem.vue")
);

const props = defineProps({
	userId: { type: String, default: "" },
	username: { type: String, default: "" }
});

const store = useStore();

const myUserId = computed(() => store.state.user.auth.userId);

const { socket } = store.state.websockets;

const {
	Sortable,
	drag,
	orderOfPlaylists,
	disabled,
	playlists,
	dragOptions,
	setPlaylists,
	calculatePlaylistOrder,
	savePlaylistOrder
} = useSortablePlaylists();

const openModal = modal => store.dispatch("modalVisibility/openModal", modal);

onMounted(() => {
	ws.onConnect(() => {
		if (myUserId.value !== props.userId)
			socket.dispatch(
				"apis.joinRoom",
				`profile.${props.userId}.playlists`,
				() => {}
			);

		socket.dispatch("playlists.indexForUser", props.userId, res => {
			if (res.status === "success") setPlaylists(res.data.playlists);
			orderOfPlaylists.value = calculatePlaylistOrder(); // order in regards to the database
			disabled.value = myUserId.value !== props.userId;
		});
	});
});

onBeforeUnmount(() => {
	if (myUserId.value !== props.userId)
		socket.dispatch(
			"apis.leaveRoom",
			`profile.${props.userId}.playlists`,
			() => {}
		);
});
</script>

<template>
	<div class="content playlists-tab">
		<div v-if="playlists.length > 0">
			<h4 class="section-title">
				{{ myUserId === userId ? "My" : null }}
				Playlists
			</h4>

			<p class="section-description">
				View
				{{
					userId === myUserId
						? "and manage your personal"
						: `${username}'s`
				}}
				playlists
			</p>

			<hr class="section-horizontal-rule" />

			<Sortable
				:component-data="{
					name: !drag ? 'draggable-list-transition' : null
				}"
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
							'item-draggable': myUserId === userId
						}"
					>
						<template #actions>
							<i
								v-if="myUserId === userId"
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
			</Sortable>

			<button
				v-if="myUserId === userId"
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
