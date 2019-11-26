<template>
	<div>
		<metadata title="Settings" />
		<main-header />
		<div class="container">
			<div class="buttons">
				<button
					:class="{ active: activeTab === 'profile' }"
					@click="switchTab('profile')"
				>
					Profile
				</button>
				<button
					:class="{ active: activeTab === 'account' }"
					@click="switchTab('account')"
				>
					Account
				</button>
				<button
					:class="{ active: activeTab === 'security' }"
					@click="switchTab('security')"
				>
					Security
				</button>
				<button
					:class="{ active: activeTab === 'preferences' }"
					@click="switchTab('preferences')"
				>
					Preferences
				</button>
			</div>
			<div class="content profile-tab" v-if="activeTab === 'profile'">
				<p class="control is-expanded">
					<label for="name">Name</label>
					<input
						class="input"
						id="name"
						type="text"
						placeholder="Name"
						v-model="user.name"
					/>
				</p>
				<p class="control is-expanded">
					<label for="location">Location</label>
					<input
						class="input"
						id="location"
						type="text"
						placeholder="Location"
						v-model="user.location"
					/>
				</p>
				<p class="control is-expanded">
					<label for="bio">Bio</label>
					<textarea
						class="textarea"
						id="bio"
						placeholder="Bio"
						v-model="user.bio"
					/>
				</p>
				<div class="control is-expanded avatar-select">
					<label>Avatar</label>
					<div class="select">
						<select v-model="user.avatar.type">
							<option value="gravatar">Using Gravatar</option>
							<option value="initials">Based on initials</option>
						</select>
					</div>
				</div>
				<button
					class="button is-primary"
					@click="saveChangesToProfile()"
				>
					Save changes
				</button>
			</div>
			<div class="content account-tab" v-if="activeTab === 'account'">
				<p class="control is-expanded">
					<label for="name">Username</label>
					<input
						class="input"
						id="username"
						type="text"
						placeholder="Username"
						v-model="user.username"
					/>
				</p>
				<p class="control is-expanded">
					<label for="location">Email</label>
					<input
						class="input"
						id="email"
						type="text"
						placeholder="Email"
						v-model="user.email.address"
					/>
				</p>
				<button
					class="button is-primary"
					@click="saveChangesToAccount()"
				>
					Save changes
				</button>
			</div>
			<div class="content security-tab" v-if="activeTab === 'security'">
				<label v-if="!password" class="label">Add password</label>
				<div v-if="!password" class="control is-grouped">
					<button
						v-if="passwordStep === 1"
						class="button is-success"
						@click="requestPassword()"
					>
						Request password email
					</button>
					<br />

					<p
						v-if="passwordStep === 2"
						class="control is-expanded has-icon has-icon-right"
					>
						<input
							v-model="passwordCode"
							class="input"
							type="text"
							placeholder="Code"
						/>
					</p>
					<p v-if="passwordStep === 2" class="control is-expanded">
						<button
							class="button is-success"
							v-on:click="verifyCode()"
						>
							Verify code
						</button>
					</p>

					<p
						v-if="passwordStep === 3"
						class="control is-expanded has-icon has-icon-right"
					>
						<input
							v-model="setNewPassword"
							class="input"
							type="password"
							placeholder="New password"
						/>
					</p>
					<p v-if="passwordStep === 3" class="control is-expanded">
						<button
							class="button is-success"
							@click="setPassword()"
						>
							Set password
						</button>
					</p>
				</div>
				<a
					v-if="passwordStep === 1 && !password"
					href="#"
					@click="passwordStep = 2"
					>Skip this step</a
				>

				<a
					v-if="!github"
					class="button is-github"
					:href="`${serverDomain}/auth/github/link`"
				>
					<div class="icon">
						<img class="invert" src="/assets/social/github.svg" />
					</div>
					&nbsp; Link GitHub to account
				</a>
				<button
					v-if="password && github"
					class="button is-danger"
					@click="unlinkPassword()"
				>
					Remove logging in with password
				</button>
				<button
					v-if="password && github"
					class="button is-danger"
					@click="unlinkGitHub()"
				>
					Remove logging in with GitHub
				</button>
				<br />
				<button
					class="button is-warning"
					style="margin-top: 30px;"
					@click="removeSessions()"
				>
					Log out everywhere
				</button>
			</div>
			<div
				class="content preferences-tab"
				v-if="activeTab === 'preferences'"
			>
				<p class="control is-expanded checkbox-control">
					<input
						type="checkbox"
						id="nightmode"
						v-model="localNightmode"
					/>
					<label for="nightmode">
						<span></span>
						<p>Use nightmode</p>
					</label>
				</p>
				<button
					class="button is-primary"
					@click="saveChangesPreferences()"
				>
					Save changes
				</button>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import Toast from "toasters";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

import io from "../../io";
import validation from "../../validation";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			user: {},
			newPassword: "",
			password: false,
			github: false,
			setNewPassword: "",
			passwordStep: 1,
			passwordCode: "",
			serverDomain: "",
			activeTab: "profile",
			localNightmode: false
		};
	},
	computed: mapState({
		userId: state => state.user.auth.userId,
		nightmode: state => state.user.preferences.nightmode
	}),
	mounted() {
		this.localNightmode = this.nightmode;

		lofig.get("serverDomain").then(serverDomain => {
			this.serverDomain = serverDomain;
		});

		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("users.findBySession", res => {
				if (res.status === "success") {
					this.user = res.data;
					this.password = this.user.password;
					this.github = this.user.github;
				} else {
					new Toast({
						content: "Your are currently not signed in",
						timeout: 3000
					});
				}
			});
			this.socket.on("event:user.linkPassword", () => {
				this.password = true;
			});
			this.socket.on("event:user.linkGitHub", () => {
				this.github = true;
			});
			this.socket.on("event:user.unlinkPassword", () => {
				this.password = false;
			});
			this.socket.on("event:user.unlinkGitHub", () => {
				this.github = false;
			});
		});
	},
	methods: {
		switchTab(tabName) {
			this.activeTab = tabName;
		},
		saveChangesToProfile() {
			this.changeName();
			this.changeLocation();
			this.changeBio();
			this.changeAvatarType();
		},
		saveChangesToAccount() {
			this.changeUsername();
			this.changeEmail();
		},
		saveChangesPreferences() {
			this.changeNightmodeLocal();
		},
		changeEmail() {
			const email = this.user.email.address;
			if (!validation.isLength(email, 3, 254))
				return new Toast({
					content: "Email must have between 3 and 254 characters.",
					timeout: 8000
				});
			if (
				email.indexOf("@") !== email.lastIndexOf("@") ||
				!validation.regex.emailSimple.test(email)
			)
				return new Toast({
					content: "Invalid email format.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updateEmail",
				this.userId,
				email,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else
						new Toast({
							content: "Successfully changed email address",
							timeout: 4000
						});
				}
			);
		},
		changeUsername() {
			const { username } = this.user;
			if (!validation.isLength(username, 2, 32))
				return new Toast({
					content: "Username must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.azAZ09_.test(username))
				return new Toast({
					content:
						"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updateUsername",
				this.userId,
				username,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else
						new Toast({
							content: "Successfully changed username",
							timeout: 4000
						});
				}
			);
		},
		changeName() {
			const { name } = this.user;
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
					else
						new Toast({
							content: "Successfully changed name",
							timeout: 4000
						});
				}
			);
		},
		changeLocation() {
			const { location } = this.user;
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
					else
						new Toast({
							content: "Successfully changed location",
							timeout: 4000
						});
				}
			);
		},
		changeBio() {
			const { bio } = this.user;
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
					else
						new Toast({
							content: "Successfully changed bio",
							timeout: 4000
						});
				}
			);
		},
		changeAvatarType() {
			const { type } = this.user.avatar;

			return this.socket.emit(
				"users.updateAvatarType",
				this.userId,
				type,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		changePassword() {
			const { newPassword } = this;
			if (!validation.isLength(newPassword, 6, 200))
				return new Toast({
					content: "Password must have between 6 and 200 characters.",
					timeout: 8000
				});
			if (!validation.regex.password.test(newPassword))
				return new Toast({
					content:
						"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.updatePassword",
				newPassword,
				res => {
					if (res.status !== "success")
						new Toast({ content: res.message, timeout: 8000 });
					else
						new Toast({
							content: "Successfully changed password",
							timeout: 4000
						});
				}
			);
		},
		requestPassword() {
			return this.socket.emit("users.requestPassword", res => {
				new Toast({ content: res.message, timeout: 8000 });
				if (res.status === "success") {
					this.passwordStep = 2;
				}
			});
		},
		verifyCode() {
			if (!this.passwordCode)
				return new Toast({
					content: "Code cannot be empty",
					timeout: 8000
				});
			return this.socket.emit(
				"users.verifyPasswordCode",
				this.passwordCode,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
					if (res.status === "success") {
						this.passwordStep = 3;
					}
				}
			);
		},
		setPassword() {
			const newPassword = this.setNewPassword;
			if (!validation.isLength(newPassword, 6, 200))
				return new Toast({
					content: "Password must have between 6 and 200 characters.",
					timeout: 8000
				});
			if (!validation.regex.password.test(newPassword))
				return new Toast({
					content:
						"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.",
					timeout: 8000
				});

			return this.socket.emit(
				"users.changePasswordWithCode",
				this.passwordCode,
				newPassword,
				res => {
					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		unlinkPassword() {
			this.socket.emit("users.unlinkPassword", res => {
				new Toast({ content: res.message, timeout: 8000 });
			});
		},
		unlinkGitHub() {
			this.socket.emit("users.unlinkGitHub", res => {
				new Toast({ content: res.message, timeout: 8000 });
			});
		},
		removeSessions() {
			this.socket.emit(`users.removeSessions`, this.userId, res => {
				new Toast({ content: res.message, timeout: 4000 });
			});
		},
		changeNightmodeLocal() {
			localStorage.setItem("nightmode", this.localNightmode);
			this.changeNightmode(this.localNightmode);
		},
		...mapActions("user/preferences", ["changeNightmode"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.container {
	width: 962px;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;
	display: flex;

	.buttons {
		height: 100%;
		width: 250px;
		margin-right: 64px;

		button {
			outline: none;
			border: none;
			box-shadow: none;
			color: $musareBlue;
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: 5px;
			background-color: transparent;

			&.active {
				color: $white;
				background-color: $musareBlue;
			}
		}
	}

	.content {
		width: 600px;

		.control {
			margin-bottom: 24px;
		}

		label {
			font-size: 14px;
			color: $dark-grey-2;
			padding-bottom: 4px;
		}

		input {
			height: 32px;
		}

		textarea {
			height: 96px;
		}

		input,
		textarea {
			border-radius: 3px;
			border: 1px solid $light-grey-2;
		}

		button {
			width: 100%;
		}

		.checkbox-control {
			input[type="checkbox"] {
				opacity: 0;
				position: absolute;
			}

			label {
				display: flex;
				flex-direction: row;
				align-items: center;

				span {
					cursor: pointer;
					width: 24px;
					height: 24px;
					background-color: $white;
					display: inline-block;
					border: 1px solid $dark-grey-2;
					position: relative;
					border-radius: 3px;
				}

				p {
					margin-left: 10px;
				}
			}

			label input[type="checkbox"]:checked + label span::after {
				content: "";
				width: 18px;
				height: 18px;
				left: 2px;
				top: 2px;
				border-radius: 3px;
				background-color: $musareBlue;
				position: absolute;
			}
		}
	}
}

.avatar-select {
	display: flex;
	flex-direction: column;
	align-items: flex-start;

	.select:after {
		border-color: $musareBlue;
	}
}

.night-mode {
	label {
		color: #ddd !important;
	}
}
</style>
