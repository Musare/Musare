<script setup lang="ts">
import { useStore } from "vuex";
import { computed } from "vue";
import Toast from "toasters";
import { useModalState } from "@/vuex_helpers";
import validation from "@/validation";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const userId = computed(() => store.state.user.auth.userId);
const userRole = computed(() => store.state.user.auth.role);

const { socket } = store.state.websockets;

const modalState = useModalState("modals/editPlaylist/MODAL_UUID", {
	modalUuid: props.modalUuid
});
const playlist = computed(() => modalState.playlist);

const isEditable = () =>
	(playlist.value.type === "user" ||
		playlist.value.type === "user-liked" ||
		playlist.value.type === "user-disliked") &&
	(userId.value === playlist.value.createdBy || userRole.value === "admin");

const isAdmin = () => userRole.value === "admin";

const renamePlaylist = () => {
	const { displayName } = playlist.value;
	if (!validation.isLength(displayName, 2, 32))
		return new Toast("Display name must have between 2 and 32 characters.");
	if (!validation.regex.ascii.test(displayName))
		return new Toast(
			"Invalid display name format. Only ASCII characters are allowed."
		);

	return socket.dispatch(
		"playlists.updateDisplayName",
		playlist.value._id,
		playlist.value.displayName,
		res => {
			new Toast(res.message);
		}
	);
};

const updatePrivacy = () => {
	const { privacy } = playlist.value;
	if (privacy === "public" || privacy === "private") {
		socket.dispatch(
			playlist.value.type === "genre"
				? "playlists.updatePrivacyAdmin"
				: "playlists.updatePrivacy",
			playlist.value._id,
			privacy,
			res => {
				new Toast(res.message);
			}
		);
	}
};
</script>

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

<style lang="less" scoped>
@media screen and (max-width: 1300px) {
	.section {
		max-width: 100% !important;
	}
}
</style>
