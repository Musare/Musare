<template>
	<div class="content profile-tab">
		<h4 class="section-title">
			Change Profile
		</h4>
		<p class="section-description">
			Edit your public profile so other users can find out more about you.
		</p>

		<hr class="section-horizontal-rule" />

		<div
			class="control is-expanded avatar-selection-outer-container"
			v-if="modifiedUser.avatar"
		>
			<label>Avatar</label>
			<div id="avatar-selection-inner-container">
				<div class="profile-picture">
					<img
						:src="
							modifiedUser.avatar.url &&
							modifiedUser.avatar.type === 'gravatar'
								? `${modifiedUser.avatar.url}?d=${notesUri}&s=250`
								: '/assets/notes.png'
						"
						onerror="this.src='/assets/notes.png'; this.onerror=''"
					/>
				</div>
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
			<span
				v-if="modifiedUser.bio"
				class="character-counter"
				style="height: initial"
				>{{ modifiedUser.bio.length }}/200</span
			>
		</p>
		<transition name="saved-changes-transition" mode="out-in">
			<button
				class="button is-primary save-changes"
				v-if="!savedChanges"
				@click="saveChanges()"
				key="save"
			>
				Save changes
			</button>
			<button class="button is-success save-changes" key="saved" v-else>
				<i class="material-icons icon-with-button">done</i>Saved Changes
			</button>
		</transition>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import validation from "../../../validation";
import io from "../../../io";

export default {
	data() {
		return {
			notesUri: "",
			savedChanges: false
		};
	},
	computed: mapState({
		userId: state => state.user.auth.userId,
		originalUser: state => state.settings.originalUser,
		modifiedUser: state => state.settings.modifiedUser
	}),
	mounted() {
		lofig.get("frontendDomain").then(frontendDomain => {
			this.frontendDomain = frontendDomain;
			this.notesUri = encodeURI(
				`${this.frontendDomain}/assets/notes.png`
			);
		});

		io.getSocket(socket => {
			this.socket = socket;
		});
	},
	methods: {
		saveChanges() {
			if (this.modifiedUser.name !== this.originalUser.name)
				this.changeName();
			if (this.modifiedUser.location !== this.originalUser.location)
				this.changeLocation();
			if (this.modifiedUser.bio !== this.originalUser.bio)
				this.changeBio();
			if (this.modifiedUser.avatar.type !== this.originalUser.avatar.type)
				this.changeAvatarType();
		},
		showSavedAnimation() {
			this.savedChanges = true;
			setTimeout(() => {
				this.savedChanges = false;
			}, 2000);
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

						this.updateOriginalUser({
							property: "name",
							value: name
						});

						if (!this.savedChanges) this.showSavedAnimation();
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

						this.updateOriginalUser({
							property: "location",
							value: location
						});

						if (!this.savedChanges) this.showSavedAnimation();
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

						this.updateOriginalUser({
							property: "bio",
							value: bio
						});

						if (!this.savedChanges) this.showSavedAnimation();
					}
				}
			);
		},
		changeAvatarType() {
			const { avatar } = this.modifiedUser;

			return this.socket.emit(
				"users.updateAvatarType",
				this.userId,
				avatar.type,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else {
						new Toast({
							content: "Successfully updated avatar type",
							timeout: 4000
						});

						this.updateOriginalUser({
							property: "avatar",
							value: avatar
						});

						if (!this.savedChanges) this.showSavedAnimation();
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

.avatar-selection-outer-container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;

	.select:after {
		border-color: $musare-blue;
	}

	#avatar-selection-inner-container {
		display: flex;
		align-items: center;
		margin-top: 5px;

		.profile-picture {
			line-height: 1;
			cursor: pointer;

			img {
				background-color: #fff;
				width: 50px;
				height: 50px;
				border-radius: 100%;
				border: 2px solid $light-grey;
				margin-right: 10px;
			}
		}
	}
}
</style>
