<template>
	<div>
		<metadata title="Settings" />
		<main-header />
		<div class="container">
			<div class="nav-links">
				<router-link
					:class="{ active: activeTab === 'profile' }"
					to="#profile"
				>
					Profile
				</router-link>
				<router-link
					:class="{ active: activeTab === 'account' }"
					to="#account"
				>
					Account
				</router-link>
				<router-link
					:class="{ active: activeTab === 'security' }"
					to="#security"
				>
					Security
				</router-link>
				<router-link
					:class="{ active: activeTab === 'preferences' }"
					to="#preferences"
				>
					Preferences
				</router-link>
			</div>
			<profile-settings v-if="activeTab === 'profile'"></profile-settings>
			<account-settings v-if="activeTab === 'account'"></account-settings>
			<security-settings
				v-if="activeTab === 'security'"
			></security-settings>
			<preferences-settings
				v-if="activeTab === 'preferences'"
			></preferences-settings>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapActions } from "vuex";
import Toast from "toasters";

import MainHeader from "../../components/layout/MainHeader.vue";
import MainFooter from "../../components/layout/MainFooter.vue";

import SecuritySettings from "./tabs/Security.vue";
import AccountSettings from "./tabs/Account.vue";
import ProfileSettings from "./tabs/Profile.vue";
import PreferencesSettings from "./tabs/Preferences.vue";

import io from "../../io";

export default {
	components: {
		MainHeader,
		MainFooter,
		SecuritySettings,
		AccountSettings,
		ProfileSettings,
		PreferencesSettings
	},
	data() {
		return {
			activeTab: ""
		};
	},
	mounted() {
		if (this.$route.hash === "") {
			this.$router.push("#profile");
		} else {
			this.activeTab = this.$route.hash.replace("#", "");
			this.localNightmode = this.nightmode;

			io.getSocket(socket => {
				this.socket = socket;

				this.socket.emit("users.findBySession", res => {
					if (res.status === "success") {
						this.setUser(res.data);
					} else {
						new Toast({
							content: "You're not currently signed in.",
							timeout: 3000
						});
					}
				});

				this.socket.on("event:user.linkPassword", () =>
					this.updateOriginalUser("password", true)
				);

				this.socket.on("event:user.unlinkPassword", () =>
					this.updateOriginalUser("github", false)
				);

				this.socket.on("event:user.linkGitHub", () =>
					this.updateOriginalUser("github", true)
				);

				this.socket.on("event:user.unlinkGitHub", () =>
					this.updateOriginalUser("github", false)
				);
			});
		}
	},
	methods: {
		// changePassword() {
		// 	const { newPassword } = this;
		// 	if (!validation.isLength(newPassword, 6, 200))
		// 		return new Toast({
		// 			content: "Password must have between 6 and 200 characters.",
		// 			timeout: 8000
		// 		});
		// 	if (!validation.regex.password.test(newPassword))
		// 		return new Toast({
		// 			content:
		// 				"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character.",
		// 			timeout: 8000
		// 		});

		// 	return this.socket.emit(
		// 		"users.updatePassword",
		// 		newPassword,
		// 		res => {
		// 			if (res.status !== "success")
		// 				new Toast({ content: res.message, timeout: 8000 });
		// 			else
		// 				new Toast({
		// 					content: "Successfully changed password",
		// 					timeout: 4000
		// 				});
		// 		}
		// 	);
		// },
		...mapActions("settings", ["updateOriginalUser", "setUser"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.container {
	@media only screen and (min-width: 900px) {
		width: 962px;
		margin: 0 auto;
		flex-direction: row;

		.content {
			width: 600px;
			margin-top: 0px;
		}
	}

	margin-top: 32px;
	padding: 24px;
	display: flex;
	flex-direction: column;

	.nav-links {
		height: 100%;
		width: 250px;
		margin-right: 64px;

		a {
			outline: none;
			border: none;
			box-shadow: none;
			color: $musare-blue;
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: 5px;
			background-color: transparent;
			display: inline-block;

			&.active {
				color: $white;
				background-color: $musare-blue;
			}
		}
	}

	.content {
		margin: 24px 0;

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
	}
}

.night-mode {
	label {
		color: #ddd !important;
	}
}
</style>
