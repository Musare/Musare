<template>
	<div class="content profile-tab">
		<p class="control is-expanded">
			<label for="name">Name</label>
			<input
				class="input"
				id="name"
				type="text"
				placeholder="Name"
				v-model="modifiedUser.name"
			/>
		</p>
		<p class="control is-expanded">
			<label for="location">Location</label>
			<input
				class="input"
				id="location"
				type="text"
				placeholder="Location"
				v-model="modifiedUser.location"
			/>
		</p>
		<p class="control is-expanded">
			<label for="bio">Bio</label>
			<textarea
				class="textarea"
				id="bio"
				placeholder="Bio"
				v-model="modifiedUser.bio"
			/>
		</p>
		<div class="control is-expanded avatar-select">
			<label>Avatar</label>
			<div class="select">
				<select
					v-if="modifiedUser.avatar"
					v-model="modifiedUser.avatar.type"
				>
					<option value="gravatar">Using Gravatar</option>
					<option value="initials">Based on initials</option>
				</select>
			</div>
		</div>
		<button class="button is-primary" @click="saveChangesToProfile()">
			Save changes
		</button>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import validation from "../../../validation";
import io from "../../../io";

export default {
	computed: mapState({
		userId: state => state.user.auth.userId,
		originalUser: state => state.settings.originalUser,
		modifiedUser: state => state.settings.modifiedUser
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
		});
	},
	methods: {
		saveChangesToProfile() {
			if (this.modifiedUser.name !== this.originalUser.name)
				this.changeName();
			if (this.modifiedUser.location !== this.originalUser.location)
				this.changeLocation();
			if (this.modifiedUser.bio !== this.originalUser.bio)
				this.changeBio();
			if (this.modifiedUser.avatar.type !== this.originalUser.avatar.type)
				this.changeAvatarType();
		},
		changeName() {
			const { name } = this.modifiedUser;

			if (!validation.isLength(name, 1, 64))
				return new Toast({
					content: "Name must have between 1 and 64 characters.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updateName",
				this.userId,
				name,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully changed name",
							timeout: 4000
						});

						this.updateOriginalUser("name", name);
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

			return this.socket.emit(
				"users.updateLocation",
				this.userId,
				location,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully changed location",
							timeout: 4000
						});

						this.updateOriginalUser("location", location);
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

			return this.socket.emit(
				"users.updateBio",
				this.userId,
				bio,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully changed bio",
							timeout: 4000
						});

						this.updateOriginalUser("bio", bio);
					}
				}
			);
		},
		changeAvatarType() {
			const { type } = this.modifiedUser.avatar;

			return this.socket.emit(
				"users.updateAvatarType",
				this.userId,
				type,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully updated avatar type",
							timeout: 4000
						});

						this.updateOriginalUser("avatar.type", type);
					}
				}
			);
		},
		...mapActions("settings", ["updateOriginalUser"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

.content .control {
	margin-bottom: 15px;
}

.avatar-select {
	display: flex;
	flex-direction: column;
	align-items: flex-start;

	.select:after {
		border-color: $musare-blue;
	}
}
</style>
