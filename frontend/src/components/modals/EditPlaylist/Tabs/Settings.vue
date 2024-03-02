<script setup lang="ts">
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { ref, onBeforeUnmount, onMounted, watch } from "vue";
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
const { loggedIn, currentUser } = storeToRefs(userAuthStore);
const { hasPermission } = userAuthStore;

const { socket } = useWebsocketsStore();

const editPlaylistStore = useEditPlaylistStore({ modalUuid: props.modalUuid });
const { playlist } = storeToRefs(editPlaylistStore);

const { preventCloseUnsaved } = useModalsStore();

const featured = ref(playlist.value.featured);

const isOwner = () =>
	loggedIn.value && currentUser.value._id === playlist.value.createdBy;

const isEditable = permission => {
	if (permission === "playlists.update.featured")
		return playlist.value.type !== "station" && hasPermission(permission);
	if (
		["user", "user-liked", "user-disliked", "admin"].includes(
			playlist.value.type
		)
	)
		return isOwner() || hasPermission(permission);
	if (
		playlist.value.type === "genre" &&
		permission === "playlists.update.privacy"
	)
		return hasPermission(permission);
	return false;
};

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
				if (!validation.isLength(value, 1, 64))
					return "Display name must have between 1 and 64 characters.";
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
				playlist.value.type === "genre" ||
					playlist.value.type === "admin"
					? "playlists.updatePrivacyAdmin"
					: "playlists.updatePrivacy",
				playlist.value._id,
				values.privacy,
				res => {
					playlist.value.privacy = values.privacy;
					if (values.privacy !== "public") featured.value = false;
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

const toggleFeatured = () => {
	if (playlist.value.privacy !== "public") return;
	featured.value = !featured.value;
	socket.dispatch(
		"playlists.updateFeatured",
		playlist.value._id,
		featured.value,
		res => {
			playlist.value.featured = featured.value;
			new Toast(res.message);
		}
	);
};

watch(playlist, (value, oldValue) => {
	if (value.displayName !== oldValue.displayName)
		setDisplayName({ displayName: value.displayName });
	if (value.privacy !== oldValue.privacy) {
		setPrivacy({ privacy: value.privacy });
		if (value.privacy !== "public") featured.value = false;
	}
	if (value.featured !== oldValue.featured) featured.value = value.featured;
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

		<div
			v-if="isEditable('playlists.update.featured')"
			class="control is-expanded checkbox-control"
		>
			<label class="switch">
				<input
					type="checkbox"
					id="featured"
					:checked="featured"
					@click="toggleFeatured"
					:disabled="playlist.privacy !== 'public'"
				/>
				<span
					v-if="playlist.privacy === 'public'"
					class="slider round"
				></span>
				<span
					v-else
					class="slider round disabled"
					content="Only public playlists can be featured"
					v-tippy
				></span>
			</label>

			<label class="label" for="featured">Featured Playlist</label>
		</div>
	</div>
</template>

<style lang="less" scoped>
.checkbox-control label.label {
	margin-left: 10px;
}

@media screen and (max-width: 1300px) {
	.section {
		max-width: 100% !important;
	}
}
</style>
