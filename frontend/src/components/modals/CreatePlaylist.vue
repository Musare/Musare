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
import Modal from "../Modal.vue";
import validation from "../../validation";

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
	methods: {
		createPlaylist() {
			const { displayName } = this.playlist;

			if (!validation.isLength(displayName, 2, 32))
				return new Toast({
					content:
						"Display name must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.ascii.test(displayName))
				return new Toast({
					content:
						"Invalid display name format. Only ASCII characters are allowed.",
					timeout: 8000
				});

			return this.socket.dispatch(
				"playlists.create",
				this.playlist,
				res => {
					new Toast({ content: res.message, timeout: 3000 });

					if (res.status === "success") {
						this.closeModal({
							sector: "station",
							modal: "createPlaylist"
						});
						this.editPlaylist(res.data._id);
						this.openModal({
							sector: "station",
							modal: "editPlaylist"
						});
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
