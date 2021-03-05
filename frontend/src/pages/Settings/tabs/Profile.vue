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
					:name="modifiedUser.name"
				/>
				<div class="select">
					<select v-model="modifiedUser.avatar.type">
						<option value="gravatar">Using Gravatar</option>
						<option value="initials">Based on initials</option>
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

import validation from "../../../validation";

import ProfilePicture from "../../../components/ui/ProfilePicture.vue";
import SaveButton from "../../../components/ui/SaveButton.vue";

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
	watch: {
		"modifiedUser.avatar.type": function watchAvatarType(newType, oldType) {
			if (
				oldType &&
				this.modifiedUser.avatar.type !==
					this.originalUser.avatar.type &&
				newType === "initials"
			) {
				const colors = ["blue", "orange", "green", "purple", "teal"];
				const color = colors[Math.floor(Math.random() * colors.length)];

				this.modifiedUser.avatar.color = color;
			}
		}
	},
	methods: {
		saveChanges() {
			const nameChanged =
				this.modifiedUser.name !== this.originalUser.name;
			const locationChanged =
				this.modifiedUser.location !== this.originalUser.location;
			const bioChanged = this.modifiedUser.bio !== this.originalUser.bio;
			const avatarChanged =
				this.modifiedUser.avatar.type !== this.originalUser.avatar.type;

			if (nameChanged) this.changeName();
			if (locationChanged) this.changeLocation();
			if (bioChanged) this.changeBio();
			if (avatarChanged) this.changeAvatarType();

			if (
				!avatarChanged &&
				!bioChanged &&
				!locationChanged &&
				!nameChanged
			) {
				this.$refs.saveButton.handleFailedSave();

				new Toast({
					content: "Please make a change before saving.",
					timeout: 8000
				});
			}
		},
		changeName() {
			const { name } = this.modifiedUser;

			if (!validation.isLength(name, 1, 64))
				return new Toast({
					content: "Name must have between 1 and 64 characters.",
					timeout: 8000
				});

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateName",
				this.userId,
				name,
				res => {
					if (res.status !== "success") {
						new Toast({ content: res.message, timeout: 8000 });
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast({
							content: "Successfully changed name",
							timeout: 4000
						});

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
				return new Toast({
					content: "Location must have between 0 and 50 characters.",
					timeout: 8000
				});

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateLocation",
				this.userId,
				location,
				res => {
					if (res.status !== "success") {
						new Toast({ content: res.message, timeout: 8000 });
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast({
							content: "Successfully changed location",
							timeout: 4000
						});

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
				return new Toast({
					content: "Bio must have between 0 and 200 characters.",
					timeout: 8000
				});

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateBio",
				this.userId,
				bio,
				res => {
					if (res.status !== "success") {
						new Toast({ content: res.message, timeout: 8000 });
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast({
							content: "Successfully changed bio",
							timeout: 4000
						});

						this.updateOriginalUser({
							property: "bio",
							value: bio
						});

						this.$refs.saveButton.handleSuccessfulSave();
					}
				}
			);
		},
		changeAvatarType() {
			const { avatar } = this.modifiedUser;

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"users.updateAvatarType",
				this.userId,
				avatar,
				res => {
					if (res.status !== "success") {
						new Toast({ content: res.message, timeout: 8000 });
						this.$refs.saveButton.handleFailedSave();
					} else {
						new Toast({
							content: "Successfully updated avatar type",
							timeout: 4000
						});

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

		.profile-picture {
			margin-right: 10px;
			width: 50px;
			height: 50px;
			font-size: 25px;
		}
	}
}
</style>
