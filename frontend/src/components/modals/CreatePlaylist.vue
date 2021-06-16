<template>
	<modal title="Create Playlist">
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
				<p class="control select">
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
import Modal from "../Modal.vue";

export default {
	components: { Modal },
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
						if (!window.addToPlaylistDropdown) {
							this.editPlaylist(res.data.playlistId);
							this.openModal("editPlaylist");
						}

						this.closeModal("createPlaylist");
					}
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
.menu {
	padding: 0 20px;
}

.menu-list li {
	display: flex;
	justify-content: space-between;
}

.menu-list a:hover {
	color: var(--black) !important;
}

li a {
	display: flex;
	align-items: center;
}

#privacy-selection {
	margin-top: 15px;
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.label {
	font-size: 1rem;
}
</style>
