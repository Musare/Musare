<template>
	<modal title="Create Playlist">
		<template v-slot:body>
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
		<template v-slot:footer>
			<a class="button is-info" v-on:click="createPlaylist()"
				>Create Playlist</a
			>
		</template>
	</modal>
</template>

<script>
import { mapActions } from "vuex";

import { Toast } from "vue-roaster";
import Modal from "../Modal.vue";
import io from "../../../io";
import validation from "../../../validation";

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
				return Toast.methods.addToast(
					"Display name must have between 2 and 32 characters.",
					8000
				);
			if (!validation.regex.azAZ09_.test(displayName))
				return Toast.methods.addToast(
					"Invalid display name format. Allowed characters: a-z, A-Z, 0-9 and _.",
					8000
				);

			return this.socket.emit("playlists.create", this.playlist, res => {
				Toast.methods.addToast(res.message, 3000);

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
		...mapActions("modals", ["closeModal", "openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

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
