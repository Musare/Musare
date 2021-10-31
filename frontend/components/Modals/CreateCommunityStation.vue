<template>
	<modal title="Create Community Station">
		<template v-slot:body>
			<!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
			<label class="label">Name (unique lowercase station id)</label>
			<p class="control">
				<input
					v-model="newCommunity.name"
					class="input"
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
		<template v-slot:footer>
			<a class="button is-primary" v-on:click="submitModal()">Create</a>
		</template>
	</modal>
</template>

<script>
import { mapActions } from "vuex";

import Toast from "toasters";
import Modal from "./Modal.vue";
import io from "../../io";
import validation from "../../validation";

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
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	},
	methods: {
		submitModal() {
			const { name, displayName, description } = this.newCommunity;

			if (!name || !displayName || !description)
				return new Toast({
					content: "Please fill in all fields",
					timeout: 8000
				});

			if (!validation.isLength(name, 2, 16))
				return new Toast({
					content: "Name must have between 2 and 16 characters.",
					timeout: 8000
				});

			if (!validation.regex.az09_.test(name))
				return new Toast({
					content:
						"Invalid name format. Allowed characters: a-z, 0-9 and _.",
					timeout: 8000
				});

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

			if (!validation.isLength(description, 2, 200))
				return new Toast({
					content:
						"Description must have between 2 and 200 characters.",
					timeout: 8000
				});

			let characters = description.split("");

			characters = characters.filter(character => {
				return character.charCodeAt(0) === 21328;
			});

			if (characters.length !== 0)
				return new Toast({
					content: "Invalid description format.",
					timeout: 8000
				});

			return this.socket.emit(
				"stations.create",
				{
					name,
					type: "community",
					displayName,
					description
				},
				res => {
					if (res.status === "success") {
						new Toast({
							content: `You have added the station successfully`,
							timeout: 4000
						});
						this.closeModal({
							sector: "home",
							modal: "createCommunityStation"
						});
					} else new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		...mapActions("modals", ["closeModal"])
	}
};
</script>
