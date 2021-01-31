<template>
	<modal title="Create Playlist">
		<template #body>
			<p class="control is-expanded">
				<input
					v-model="playlist.displayName"
					class="input"
					type="text"
					placeholder="Playlist Display Name"
					autofocus
					@keyup.enter="createPlaylist()"
				/>
			</p>
		</template>
		<template #footer>
			<a class="button is-info" @click="createPlaylist()"
				>Create Playlist</a
			>
		</template>
	</modal>
</template>

<script>
import { mapActions } from "vuex";

import Toast from "toasters";
import Modal from "../Modal.vue";
import io from "../../io";
import validation from "../../validation";

export default {
	components: { Modal },
	data() {
		return {
			playlist: {
				displayName: null,
				songs: []
			}
		};
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	},
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

			return this.socket.emit("playlists.create", this.playlist, res => {
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
			});
		},
		...mapActions("modalVisibility", ["closeModal", "openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.menu {
	padding: 0 20px;
}

.menu-list li {
	display: flex;
	justify-content: space-between;
}

.menu-list a:hover {
	color: $black !important;
}

li a {
	display: flex;
	align-items: center;
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.table {
	margin-bottom: 0;
}

h5 {
	padding: 20px 0;
}
</style>
