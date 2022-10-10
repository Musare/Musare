<script setup lang="ts">
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, watch } from "vue";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useEditPlaylistStore } from "@/stores/editPlaylist";
import { useModalsStore } from "@/stores/modals";
import { useForm } from "@/composables/useForm";

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const userAuthStore = useUserAuthStore();
const { loggedIn, userId } = storeToRefs(userAuthStore);
const { hasPermission } = userAuthStore;

const { socket } = useWebsocketsStore();

const editPlaylistStore = useEditPlaylistStore({ modalUuid: props.modalUuid });
const { playlist } = storeToRefs(editPlaylistStore);

const { preventCloseUnsaved } = useModalsStore();

const isOwner = () =>
	loggedIn.value && userId.value === playlist.value.createdBy;

const isEditable = permission =>
	((playlist.value.type === "user" ||
		playlist.value.type === "user-liked" ||
		playlist.value.type === "user-disliked") &&
		(isOwner() || hasPermission(permission))) ||
	(playlist.value.type === "genre" &&
		permission === "playlists.update.privacy" &&
		hasPermission(permission));

const {
	inputs: displayNameInputs,
	unsavedChanges: displayNameUnsaved,
	save: saveDisplayName,
	setOriginalValue: setDisplayName
} = useForm(
	{
		displayName: {
			value: playlist.value.displayName,
			validate: value => {
				if (!validation.isLength(value, 2, 32))
					return "Display name must have between 2 and 32 characters.";
				if (!validation.regex.ascii.test(value))
					return "Invalid display name format. Only ASCII characters are allowed.";
				return true;
			}
		}
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				"playlists.updateDisplayName",
				playlist.value._id,
				values.displayName,
				res => {
					playlist.value.displayName = values.displayName;
					if (res.status === "success") {
						resolve();
						new Toast(res.message);
					} else reject(new Error(res.message));
				}
			);
		else {
			Object.values(messages).forEach(message => {
				new Toast({ content: message, timeout: 8000 });
			});
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid,
		preventCloseUnsaved: false
	}
);

const {
	inputs: privacyInputs,
	unsavedChanges: privacyUnsaved,
	save: savePrivacy,
	setOriginalValue: setPrivacy
} = useForm(
	{ privacy: playlist.value.privacy },
	({ status, messages, values }, resolve, reject) => {
		if (status === "success")
			socket.dispatch(
				playlist.value.type === "genre"
					? "playlists.updatePrivacyAdmin"
					: "playlists.updatePrivacy",
				playlist.value._id,
				values.privacy,
				res => {
					playlist.value.privacy = values.privacy;
					if (res.status === "success") {
						resolve();
						new Toast(res.message);
					} else reject(new Error(res.message));
				}
			);
		else {
			if (messages[status]) new Toast(messages[status]);
			resolve();
		}
	},
	{
		modalUuid: props.modalUuid,
		preventCloseUnsaved: false
	}
);

watch(playlist, (value, oldValue) => {
	if (value.displayName !== oldValue.displayName)
		setDisplayName({ displayName: value.displayName });
	if (value.privacy !== oldValue.privacy)
		setPrivacy({ privacy: value.privacy });
});

onMounted(() => {
	preventCloseUnsaved[props.modalUuid] = () =>
		displayNameUnsaved.value.length + privacyUnsaved.value.length > 0;
});

onBeforeUnmount(() => {
	delete preventCloseUnsaved[props.modalUuid];
});
</script>

<template>
	<div class="settings-tab section">
		<div
			v-if="
				isEditable('playlists.update.displayName') &&
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
						v-model="displayNameInputs['displayName'].value"
						class="input"
						type="text"
						placeholder="Playlist Display Name"
						@keyup.enter="saveDisplayName()"
					/>
				</p>
				<p class="control">
					<button
						class="button is-info"
						@click.prevent="saveDisplayName()"
					>
						Rename
					</button>
				</p>
			</div>
		</div>

		<div v-if="isEditable('playlists.update.privacy')">
			<label class="label"> Change privacy </label>
			<div class="control is-grouped input-with-button">
				<div class="control is-expanded select">
					<select v-model="privacyInputs['privacy'].value">
						<option value="private">Private</option>
						<option value="public">Public</option>
					</select>
				</div>
				<p class="control">
					<button
						class="button is-info"
						@click.prevent="savePrivacy()"
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
