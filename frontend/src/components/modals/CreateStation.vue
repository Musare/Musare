<script setup lang="ts">
import { useStore } from "vuex";
import { ref, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalState } from "@/vuex_helpers";
import validation from "@/validation";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = useWebsocketsStore();

const { official } = useModalState("modals/createStation/MODAL_UUID", {
	modalUuid: props.modalUuid
});

const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const newStation = ref({
	name: "",
	displayName: "",
	description: ""
});

const submitModal = () => {
	newStation.value.name = newStation.value.name.toLowerCase();
	const { name, displayName, description } = newStation.value;

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
			type: official ? "official" : "community",
			displayName,
			description
		},
		res => {
			if (res.status === "success") {
				new Toast(`You have added the station successfully`);
				closeCurrentModal();
			} else new Toast(res.message);
		}
	);
};

onBeforeUnmount(() => {
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "createStation", props.modalUuid]);
});
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
					@keyup.enter="submitModal()"
				/>
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
