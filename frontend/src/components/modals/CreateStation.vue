<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useUserPreferencesStore } from "@/stores/userPreferences";
import validation from "@/validation";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const props = defineProps({
	modalUuid: { type: String, required: true },
	official: { type: Boolean, default: false }
});

const { socket } = useWebsocketsStore();

const { closeCurrentModal } = useModalsStore();

const userPreferencesStore = useUserPreferencesStore();
const { defaultStationPrivacy } = storeToRefs(userPreferencesStore);

const newStation = ref({
	name: "",
	displayName: "",
	description: "",
	privacy: defaultStationPrivacy.value
});

const submitModal = () => {
	newStation.value.name = newStation.value.name.toLowerCase();
	const { name, displayName, description, privacy } = newStation.value;

	if (!name || !displayName || !description)
		return new Toast("Please fill in all fields");

	if (!validation.isLength(name, 2, 16))
		return new Toast("Name must have between 2 and 16 characters.");

	if (!validation.regex.az09_.test(name))
		return new Toast(
			"Invalid name format. Allowed characters: a-z, 0-9 and _."
		);

	if (!validation.isLength(displayName, 2, 32))
		return new Toast("Display name must have between 2 and 32 characters.");
	if (!validation.regex.ascii.test(displayName))
		return new Toast(
			"Invalid display name format. Only ASCII characters are allowed."
		);

	if (!validation.isLength(description, 2, 200))
		return new Toast("Description must have between 2 and 200 characters.");

	let characters = description.split("");

	characters = characters.filter(
		character => character.charCodeAt(0) === 21328
	);

	if (characters.length !== 0)
		return new Toast("Invalid description format.");

	return socket.dispatch(
		"stations.create",
		{
			name,
			type: props.official ? "official" : "community",
			displayName,
			description,
			privacy
		},
		res => {
			if (res.status === "success") {
				new Toast(`You have added the station successfully`);
				closeCurrentModal();
			} else new Toast(res.message);
		}
	);
};
</script>

<template>
	<modal
		:title="
			official ? 'Create Official Station' : 'Create Community Station'
		"
	>
		<template #body>
			<label class="label">Name (unique lowercase station id)</label>
			<p class="control">
				<input
					v-model="newStation.name"
					class="input station-id"
					type="text"
					placeholder="Name..."
					autofocus
				/>
			</p>
			<label class="label">Display Name</label>
			<p class="control">
				<input
					v-model="newStation.displayName"
					class="input"
					type="text"
					placeholder="Display name..."
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="newStation.description"
					class="input"
					type="text"
					placeholder="Description..."
				/>
			</p>
			<label class="label">Privacy</label>
			<p class="control select">
				<select v-model="newStation.privacy">
					<option value="public">Public</option>
					<option value="unlisted">Unlisted</option>
					<option value="private">Private</option>
				</select>
			</p>
		</template>
		<template #footer>
			<a class="button is-primary" @click="submitModal()">Create</a>
		</template>
	</modal>
</template>

<style lang="less" scoped>
.station-id {
	text-transform: lowercase;

	&::placeholder {
		text-transform: none;
	}
}
</style>
