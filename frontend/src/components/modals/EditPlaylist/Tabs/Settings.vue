<template>
	<div class="settings-tab section">
		<div v-if="isEditable()">
			<label class="label"> Change display name </label>
			<div class="control is-grouped input-with-button">
				<p class="control is-expanded">
					<input
						v-model="playlist.displayName"
						class="input"
						type="text"
						placeholder="Playlist Display Name"
						@keyup.enter="renamePlaylist()"
					/>
				</p>
				<p class="control">
					<a
						class="button is-info"
						@click.prevent="renamePlaylist()"
						href="#"
						>Rename</a
					>
				</p>
			</div>
		</div>

		<div
			v-if="
				userId === playlist.createdBy ||
					(playlist.type === 'genre' && isAdmin())
			"
		>
			<label class="label"> Change privacy </label>
			<div class="control is-grouped input-with-button">
				<div class="control is-expanded select">
					<select v-model="playlist.privacy">
						<option value="private">Private</option>
						<option value="public">Public</option>
					</select>
				</div>
				<p class="control">
					<a
						class="button is-info"
						@click.prevent="updatePrivacy()"
						href="#"
						>Update Privacy</a
					>
				</p>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters /* , mapActions */ } from "vuex";
import Toast from "toasters";

import validation from "@/validation";

export default {
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editPlaylist", {
			playlist: state => state.playlist
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		...mapState({
			userId: state => state.user.auth.userId,
			userRole: state => state.user.auth.role
		})
	},
	mounted() {},
	methods: {
		isEditable() {
			return (
				this.playlist.isUserModifiable &&
				(this.userId === this.playlist.createdBy ||
					this.userRole === "admin")
			);
		},
		isAdmin() {
			return this.userRole === "admin";
		},
		renamePlaylist() {
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
				"playlists.updateDisplayName",
				this.playlist._id,
				this.playlist.displayName,
				res => {
					new Toast(res.message);
				}
			);
		},
		updatePrivacy() {
			const { privacy } = this.playlist;
			if (privacy === "public" || privacy === "private") {
				this.socket.dispatch(
					"playlists.updatePrivacy",
					this.playlist._id,
					privacy,
					res => {
						new Toast(res.message);
					}
				);
			}
		}
		// 	...mapActions("modals/editSong", ["selectDiscogsInfo"])
	}
};
</script>

<style lang="scss" scoped>
@media screen and (max-width: 1300px) {
	.section {
		max-width: 100% !important;
	}
}
</style>
