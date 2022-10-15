<script setup lang="ts">
import { defineAsyncComponent, ref, onBeforeUnmount } from "vue";
import Toast from "toasters";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const props = defineProps({
	modalUuid: { type: String, required: true },
	admin: { type: Boolean, default: false }
});

const playlist = ref({
	displayName: "",
	privacy: "public",
	songs: []
});

const { openModal, closeCurrentModal } = useModalsStore();

const { socket } = useWebsocketsStore();

const createPlaylist = () => {
	const { displayName } = playlist.value;

	if (!validation.isLength(displayName, 2, 32))
		return new Toast("Display name must have between 2 and 32 characters.");
	if (!validation.regex.ascii.test(displayName))
		return new Toast(
			"Invalid display name format. Only ASCII characters are allowed."
		);

	return socket.dispatch(
		"playlists.create",
		{ ...playlist.value, admin: props.admin },
		res => {
			new Toast(res.message);

			if (res.status === "success") {
				closeCurrentModal();

				if (!window.addToPlaylistDropdown) {
					openModal({
						modal: "editPlaylist",
						props: { playlistId: res.data.playlistId }
					});
				}
			}
		}
	);
};

onBeforeUnmount(() => {
	if (window.addToPlaylistDropdown)
		window.addToPlaylistDropdown.tippy.setProps({
			zIndex: 9999,
			hideOnClick: true
		});

	window.addToPlaylistDropdown = null;
});
</script>

<template>
	<modal
		:title="admin ? 'Create Admin Playlist' : 'Create Playlist'"
		:size="'slim'"
	>
		<template #body>
			<p class="control is-expanded">
				<label class="label">Display Name</label>
				<input
					v-model="playlist.displayName"
					class="input"
					type="text"
					placeholder="Enter display name..."
					autofocus
					@keyup.enter="createPlaylist()"
				/>
			</p>

			<div class="control" id="privacy-selection">
				<label class="label">Privacy</label>
				<p class="control is-expanded select">
					<select v-model="playlist.privacy">
						<option value="private">Private</option>
						<option value="public" selected>Public</option>
					</select>
				</p>
			</div>
		</template>
		<template #footer>
			<a class="button is-info" @click="createPlaylist()"
				><i class="material-icons icon-with-button">create</i>Create
				Playlist</a
			>
		</template>
	</modal>
</template>
