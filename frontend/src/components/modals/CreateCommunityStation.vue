<template>
	<modal title="Create Community Station">
		<template #body>
			<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
			<label class="label">Name (unique lowercase station id)</label>
			<p class="control">
				<input
					v-model="newCommunity.name"
					class="input station-id"
					type="text"
					placeholder="Name..."
					autofocus
				/>
			</p>
			<label class="label">Display Name</label>
			<p class="control">
				<input
					v-model="newCommunity.displayName"
					class="input"
					type="text"
					placeholder="Display name..."
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="newCommunity.description"
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

<script>
import { mapGetters, mapActions } from "vuex";

import Toast from "toasters";
import validation from "@/validation";
import Modal from "../Modal.vue";

export default {
	components: { Modal },
	data() {
		return {
			newCommunity: {
				name: "",
				displayName: "",
				description: ""
			}
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	methods: {
		submitModal() {
			this.newCommunity.name = this.newCommunity.name.toLowerCase();
			const { name, displayName, description } = this.newCommunity;

			if (!name || !displayName || !description)
				return new Toast("Please fill in all fields");

			if (!validation.isLength(name, 2, 16))
				return new Toast("Name must have between 2 and 16 characters.");

			if (!validation.regex.az09_.test(name))
				return new Toast(
					"Invalid name format. Allowed characters: a-z, 0-9 and _."
				);

			if (!validation.isLength(displayName, 2, 32))
				return new Toast(
					"Display name must have between 2 and 32 characters."
				);
			if (!validation.regex.ascii.test(displayName))
				return new Toast(
					"Invalid display name format. Only ASCII characters are allowed."
				);

			if (!validation.isLength(description, 2, 200))
				return new Toast(
					"Description must have between 2 and 200 characters."
				);

			let characters = description.split("");

			characters = characters.filter(character => {
				return character.charCodeAt(0) === 21328;
			});

			if (characters.length !== 0)
				return new Toast("Invalid description format.");

			return this.socket.dispatch(
				"stations.create",
				{
					name,
					type: "community",
					displayName,
					description
				},
				res => {
					if (res.status === "success") {
						new Toast(`You have added the station successfully`);
						this.closeModal({
							sector: "home",
							modal: "createCommunityStation"
						});
					} else new Toast(res.message);
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
.station-id {
	text-transform: lowercase;

	&::placeholder {
		text-transform: none;
	}
}
</style>
