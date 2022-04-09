<template>
	<modal title="Create Playlist" :size="'slim'">
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

<script>
import { mapActions, mapGetters } from "vuex";

import Toast from "toasters";
import validation from "@/validation";

export default {
	data() {
		return {
			playlist: {
				displayName: "",
				privacy: "public",
				songs: []
			}
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	unmounted() {
		if (window.addToPlaylistDropdown)
			window.addToPlaylistDropdown.tippy.setProps({
				zIndex: 9999,
				hideOnClick: true
			});

		window.addToPlaylistDropdown = null;
	},
	methods: {
		createPlaylist() {
			const { displayName } = this.playlist;

			if (!validation.isLength(displayName, 2, 32))
				return new Toast(
					"Display name must have between 2 and 32 characters."
				);
			if (!validation.regex.ascii.test(displayName))
				return new Toast(
					"Invalid display name format. Only ASCII characters are allowed."
				);

			return this.socket.dispatch(
				"playlists.create",
				this.playlist,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.closeModal("createPlaylist");

						if (!window.addToPlaylistDropdown) {
							this.openModal({
								modal: "editPlaylist",
								data: { playlistId: res.data.playlistId }
							});
						}
					}
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>
