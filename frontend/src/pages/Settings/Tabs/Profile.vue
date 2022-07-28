<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settings";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import validation from "@/validation";

const ProfilePicture = defineAsyncComponent(
	() => import("@/components/ProfilePicture.vue")
);
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);

const settingsStore = useSettingsStore();
const userAuthStore = useUserAuthStore();

const { socket } = useWebsocketsStore();

const saveButton = ref();

const { userId } = storeToRefs(userAuthStore);
const { originalUser, modifiedUser } = settingsStore;

const { updateOriginalUser } = settingsStore;

const changeName = () => {
	modifiedUser.name = modifiedUser.name.replaceAll(/ +/g, " ").trim();
	const { name } = modifiedUser;

	if (!validation.isLength(name, 1, 64))
		return new Toast("Name must have between 1 and 64 characters.");

	if (!validation.regex.name.test(name))
		return new Toast(
			"Invalid name format. Only letters, numbers, spaces, apostrophes, underscores and hyphens are allowed."
		);
	if (name.replaceAll(/[ .'_-]/g, "").length === 0)
		return new Toast(
			"Invalid name format. Only letters, numbers, spaces, apostrophes, underscores and hyphens are allowed, and there has to be at least one letter or number."
		);

	saveButton.value.status = "disabled";

	return socket.dispatch("users.updateName", userId.value, name, res => {
		if (res.status !== "success") {
			new Toast(res.message);
			saveButton.value.handleFailedSave();
		} else {
			new Toast("Successfully changed name");

			updateOriginalUser({
				property: "name",
				value: name
			});

			saveButton.value.handleSuccessfulSave();
		}
	});
};

const changeLocation = () => {
	const { location } = modifiedUser;

	if (!validation.isLength(location, 0, 50))
		return new Toast("Location must have between 0 and 50 characters.");

	saveButton.value.status = "disabled";

	return socket.dispatch(
		"users.updateLocation",
		userId.value,
		location,
		res => {
			if (res.status !== "success") {
				new Toast(res.message);
				saveButton.value.handleFailedSave();
			} else {
				new Toast("Successfully changed location");

				updateOriginalUser({
					property: "location",
					value: location
				});

				saveButton.value.handleSuccessfulSave();
			}
		}
	);
};

const changeBio = () => {
	const { bio } = modifiedUser;

	if (!validation.isLength(bio, 0, 200))
		return new Toast("Bio must have between 0 and 200 characters.");

	saveButton.value.status = "disabled";

	return socket.dispatch("users.updateBio", userId.value, bio, res => {
		if (res.status !== "success") {
			new Toast(res.message);
			saveButton.value.handleFailedSave();
		} else {
			new Toast("Successfully changed bio");

			updateOriginalUser({
				property: "bio",
				value: bio
			});

			saveButton.value.handleSuccessfulSave();
		}
	});
};

const changeAvatar = () => {
	const { avatar } = modifiedUser;

	saveButton.value.status = "disabled";

	return socket.dispatch("users.updateAvatar", userId.value, avatar, res => {
		if (res.status !== "success") {
			new Toast(res.message);
			saveButton.value.handleFailedSave();
		} else {
			new Toast("Successfully updated avatar");

			updateOriginalUser({
				property: "avatar",
				value: avatar
			});

			saveButton.value.handleSuccessfulSave();
		}
	});
};

const saveChanges = () => {
	const nameChanged = modifiedUser.name !== originalUser.name;
	const locationChanged = modifiedUser.location !== originalUser.location;
	const bioChanged = modifiedUser.bio !== originalUser.bio;
	const avatarChanged =
		modifiedUser.avatar.type !== originalUser.avatar.type ||
		modifiedUser.avatar.color !== originalUser.avatar.color;

	if (nameChanged) changeName();
	if (locationChanged) changeLocation();
	if (bioChanged) changeBio();
	if (avatarChanged) changeAvatar();

	if (!avatarChanged && !bioChanged && !locationChanged && !nameChanged) {
		saveButton.value.handleFailedSave();

		new Toast("Please make a change before saving.");
	}
};
</script>

<template>
	<div class="content profile-tab">
		<h4 class="section-title">Change Profile</h4>
		<p class="section-description">
			Edit your public profile so users can find out more about you
		</p>

		<hr class="section-horizontal-rule" />

		<div
			class="control is-expanded avatar-selection-outer-container"
			v-if="modifiedUser.avatar"
		>
			<label>Avatar</label>
			<div id="avatar-selection-inner-container">
				<profile-picture
					:avatar="modifiedUser.avatar"
					:name="
						modifiedUser.name
							? modifiedUser.name
							: modifiedUser.username
					"
				/>
				<div class="select">
					<select v-model="modifiedUser.avatar.type">
						<option value="gravatar">Using Gravatar</option>
						<option value="initials">Based on initials</option>
					</select>
				</div>
				<div
					class="select"
					v-if="modifiedUser.avatar.type === 'initials'"
				>
					<select v-model="modifiedUser.avatar.color">
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
				v-model="modifiedUser.name"
			/>
			<span v-if="modifiedUser.name" class="character-counter"
				>{{ modifiedUser.name.length }}/64</span
			>
		</p>
		<p class="control is-expanded">
			<label for="location">Location</label>
			<input
				class="input"
				id="location"
				type="text"
				placeholder="Enter location here..."
				maxlength="50"
				v-model="modifiedUser.location"
			/>
			<span v-if="modifiedUser.location" class="character-counter"
				>{{ modifiedUser.location.length }}/50</span
			>
		</p>
		<p class="control is-expanded">
			<label for="bio">Bio</label>
			<textarea
				class="textarea"
				id="bio"
				placeholder="Enter bio here..."
				maxlength="200"
				autocomplete="off"
				v-model="modifiedUser.bio"
			/>
			<span v-if="modifiedUser.bio" class="character-counter"
				>{{ modifiedUser.bio.length }}/200</span
			>
		</p>

		<SaveButton ref="saveButton" @clicked="saveChanges()" />
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
