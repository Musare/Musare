<script setup lang="ts">
import { defineAsyncComponent, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useUserAuthStore } from "@/stores/userAuth";
import validation from "@/validation";
import { useForm } from "@/composables/useForm";
import { useEvents } from "@/composables/useEvents";
import { useModels } from "@/composables/useModels";
import { useWebsocketStore } from "@/stores/websocket";

const ProfilePicture = defineAsyncComponent(
	() => import("@/components/ProfilePicture.vue")
);
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);

const { runJob } = useWebsocketStore();
const { onReady } = useEvents();
const { registerModel } = useModels();

const userAuthStore = useUserAuthStore();

const { currentUser } = storeToRefs(userAuthStore);

const { inputs, saveButton, save, setModelValues } = useForm(
	{
		name: {
			value: null,
			validate: (value: string) => {
				if (!validation.isLength(value, 1, 64))
					return "Name must have between 1 and 64 characters.";
				if (!validation.regex.name.test(value))
					return "Invalid name format. Only letters, numbers, spaces, apostrophes, underscores and hyphens are allowed.";
				if (value.replaceAll(/[ .'_-]/g, "").length === 0)
					return "Invalid name format. Only letters, numbers, spaces, apostrophes, underscores and hyphens are allowed, and there has to be at least one letter or number.";
				return true;
			}
		},
		location: {
			value: null,
			required: false,
			validate: (value?: string) => {
				if (value === null) return true;
				if (!validation.isLength(value, 0, 50))
					return "Location must be less than 50 characters.";
				return true;
			}
		},
		bio: {
			value: null,
			required: false,
			validate: (value?: string) => {
				if (value === null) return true;
				if (!validation.isLength(value, 0, 200))
					return "Bio must be less than 200 characters.";
				return true;
			}
		},
		avatarType: "initials",
		avatarColor: "blue"
	},
	({ status, messages, values }, resolve, reject) => {
		if (status === "success") {
			runJob(`data.users.updateById`, {
				_id: currentUser.value._id,
				query: values
			})
				.then(resolve)
				.catch(reject);
		} else {
			if (status === "unchanged") new Toast(messages.unchanged);
			else if (status === "error")
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
			resolve();
		}
	}
);

onMounted(async () => {
	await onReady(async () => {
		setModelValues(await registerModel(currentUser.value), [
			"name",
			"location",
			"bio",
			"avatarType",
			"avatarColor"
		]);
	});
});
</script>

<template>
	<div class="content profile-tab">
		<h4 class="section-title">Change Profile</h4>
		<p class="section-description">
			Edit your public profile so users can find out more about you
		</p>

		<hr class="section-horizontal-rule" />

		<div class="control is-expanded avatar-selection-outer-container">
			<label>Avatar</label>
			<div id="avatar-selection-inner-container">
				<profile-picture
					:type="inputs.avatarType.value"
					:color="inputs.avatarColor.value"
					:url="currentUser.avatarUrl"
					:name="
						currentUser.name
							? currentUser.name
							: currentUser.username
					"
				/>
				<div class="select">
					<select v-model="inputs.avatarType.value">
						<option value="gravatar">Using Gravatar</option>
						<option value="initials">Based on initials</option>
					</select>
				</div>
				<div
					class="select"
					v-if="inputs.avatarType.value === 'initials'"
				>
					<select v-model="inputs.avatarColor.value">
						<option value="blue">Blue</option>
						<option value="orange">Orange</option>
						<option value="green">Green</option>
						<option value="purple">Purple</option>
						<option value="teal">Teal</option>
					</select>
				</div>
			</div>
		</div>
		<p class="control is-expanded margin-top-zero">
			<label for="name">Name</label>
			<input
				class="input"
				id="name"
				type="text"
				placeholder="Enter name here..."
				maxlength="64"
				v-model="inputs.name.value"
			/>
			<span v-if="inputs.name.value" class="character-counter">
				{{ inputs.name.value.length }}/64
			</span>
		</p>
		<p class="control is-expanded">
			<label for="location">Location</label>
			<input
				class="input"
				id="location"
				type="text"
				placeholder="Enter location here..."
				maxlength="50"
				v-model="inputs.location.value"
			/>
			<span v-if="inputs.location.value" class="character-counter">
				{{ inputs.location.value.length }}/50
			</span>
		</p>
		<p class="control is-expanded">
			<label for="bio">Bio</label>
			<textarea
				class="textarea"
				id="bio"
				placeholder="Enter bio here..."
				maxlength="200"
				autocomplete="off"
				v-model="inputs.bio.value"
			/>
			<span v-if="inputs.bio.value" class="character-counter">
				{{ inputs.bio.value.length }}/200
			</span>
		</p>

		<SaveButton ref="saveButton" @clicked="save()" />
	</div>
</template>

<style lang="less" scoped>
.content .control {
	margin-bottom: 15px;
}

.character-counter {
	height: initial;
}

.avatar-selection-outer-container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;

	.select:after {
		border-color: var(--primary-color);
	}

	#avatar-selection-inner-container {
		display: flex;
		align-items: center;
		margin-top: 5px;

		.select {
			margin-right: 8px;

			&:last-child {
				margin-right: 0;
			}
		}

		.profile-picture {
			margin-right: 10px;
			width: 50px;
			height: 50px;
		}

		:deep(.profile-picture.using-initials span) {
			font-size: 20px; // 2/5th of .profile-picture height/width
		}
	}
}
</style>
