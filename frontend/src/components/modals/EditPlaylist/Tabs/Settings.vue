<template>
	<div class="settings-tab section">
		<div
			v-if="
				isEditable() &&
				!(
					playlist.type === 'user-liked' ||
					playlist.type === 'user-disliked'
				)
			"
		>
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
					<button
						class="button is-info"
						@click.prevent="renamePlaylist()"
					>
						Rename
					</button>
				</p>
			</div>
		</div>

		<div v-if="isEditable() || (playlist.type === 'genre' && isAdmin())">
			<label class="label"> Change privacy </label>
			<div class="control is-grouped input-with-button">
				<div class="control is-expanded select">
					<select v-model="playlist.privacy">
						<option value="private">Private</option>
						<option value="public">Public</option>
					</select>
				</div>
				<p class="control">
					<button
						class="button is-info"
						@click.prevent="updatePrivacy()"
					>
						Update Privacy
					</button>
				</p>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters /* , mapActions */ } from "vuex";
import Toast from "toasters";

import { mapModalState } from "@/vuex_helpers";
import validation from "@/validation";

export default {
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {};
	},
	computed: {
		...mapModalState("modals/editPlaylist/MODAL_UUID", {
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
	methods: {
		isEditable() {
			return (
				(this.playlist.type === "user" ||
					this.playlist.type === "user-liked" ||
					this.playlist.type === "user-disliked") &&
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
					this.playlist.type === "genre"
						? "playlists.updatePrivacyAdmin"
						: "playlists.updatePrivacy",
					this.playlist._id,
					privacy,
					res => {
						new Toast(res.message);
					}
				);
			}
		}
	}
};
</script>

<style lang="less" scoped>
@media screen and (max-width: 1300px) {
	.section {
		max-width: 100% !important;
	}
}
</style>
