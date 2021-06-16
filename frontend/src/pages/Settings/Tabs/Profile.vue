<template>
	<div class="content profile-tab">
		<h4 class="section-title">Change Profile</h4>
		<p class="section-description">
			Edit your public profile so users can find out more about you.
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

		<save-button ref="saveButton" @clicked="saveChanges()" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";

import ProfilePicture from "@/components/ProfilePicture.vue";
import SaveButton from "@/components/SaveButton.vue";
import validation from "@/validation";

export default {
	components: { ProfilePicture, SaveButton },
	computed: {
		...mapState({
			userId: state => state.user.auth.userId,
			originalUser: state => state.settings.originalUser,
			modifiedUser: state => state.settings.modifiedUser
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	methods: {
		saveChanges() {
			const nameChanged =
				this.modifiedUser.name !== this.originalUser.name;
			const locationChanged =
				this.modifiedUser.location !== this.originalUser.location;
			const bioChanged = this.modifiedUser.bio !== this.originalUser.bio;
			const avatarChanged =
				this.modifiedUser.avatar.type !==
					this.originalUser.avatar.type ||
				this.modifiedUser.avatar.color !==
					this.originalUser.avatar.color;

			if (nameChanged) this.changeName();
			if (locationChanged) this.changeLocation();
			if (bioChanged) this.changeBio();
			if (avatarChanged) this.changeAvatar();

			if (
				!avatarChanged &&
				!bioChanged &&
				!locationChanged &&
				!nameChanged
			) {
				this.$refs.saveButton.handleFailedSave();

				new Toast("Please make a change before saving.");
			}
		},
		changeName() {
			this.modifiedUser.name = this.modifiedUser.name
				.replaceAll(/ +/g, " ")
				.trim();
			const { name } = this.modifiedUser;

			if (!validation.isLength(name, 1, 64))
				return new Toast("Name must have between 1 and 64 characters.");

			if (!validation.regex.name.test(name))
				return new Toast(
					"Invalid name format. Only letters, spaces, apostrophes and hyphens are allowed."
				);
			if (name.replaceAll(/[ .'-]/g, "").length === 0)
				return new Toast(
					"Invalid name format. Only letters, spaces, apostrophes and hyphens are allowed, and there has to be at least one letter."
				);

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateName",
				this.userId,
				name,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully changed name");

						this.updateOriginalUser({
							property: "name",
							value: name
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		changeLocation() {
			const { location } = this.modifiedUser;

			if (!validation.isLength(location, 0, 50))
				return new Toast(
					"Location must have between 0 and 50 characters."
				);

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateLocation",
				this.userId,
				location,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully changed location");

						this.updateOriginalUser({
							property: "location",
							value: location
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		changeBio() {
			const { bio } = this.modifiedUser;

			if (!validation.isLength(bio, 0, 200))
				return new Toast("Bio must have between 0 and 200 characters.");

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateBio",
				this.userId,
				bio,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully changed bio");

						this.updateOriginalUser({
							property: "bio",
							value: bio
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		changeAvatar() {
			const { avatar } = this.modifiedUser;

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateAvatar",
				this.userId,
				avatar,
				res => {
					if (res.status !== "success") {
						new Toast(res.message);
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast("Successfully updated avatar");

						this.updateOriginalUser({
							property: "avatar",
							value: avatar
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		...mapActions("settings", ["updateOriginalUser"])
	}
};
</script>

<style lang="scss" scoped>
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

		/deep/ .profile-picture.using-initials span {
			font-size: 20px; // 2/5th of .profile-picture height/width
		}
	}
}
</style>
