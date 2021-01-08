<template>
	<div>
		<metadata title="Settings" />
		<main-header />
		<div class="container">
			<h1 id="page-title">Settings</h1>
			<div id="sidebar-with-content">
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
				<profile-settings
					v-if="activeTab === 'profile'"
				></profile-settings>
				<account-settings
					v-if="activeTab === 'account'"
				></account-settings>
				<security-settings
					v-if="activeTab === 'security'"
				></security-settings>
				<preferences-settings
					v-if="activeTab === 'preferences'"
				></preferences-settings>
			</div>
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
					this.updateOriginalUser({
						property: "password",
						value: true
					})
				);

				this.socket.on("event:user.unlinkPassword", () =>
					this.updateOriginalUser({
						property: "password",
						value: false
					})
				);

				this.socket.on("event:user.linkGithub", () =>
					this.updateOriginalUser({
						property: "github",
						value: true
					})
				);

				this.socket.on("event:user.unlinkGithub", () =>
					this.updateOriginalUser({
						property: "github",
						value: false
					})
				);
			});
		}
	},
	methods: mapActions("settings", ["updateOriginalUser", "setUser"])
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.night-mode {
	.content {
		background-color: $night-mode-bg-secondary !important;
	}
}

/deep/ .character-counter {
	display: flex;
	justify-content: flex-end;
	height: 0;
}

.container {
	margin-top: 32px;
	padding: 24px;

	.content {
		background-color: #fff;
		padding: 30px 50px;
		border-radius: 3px;
	}

	#page-title {
		margin-top: 0;
		font-size: 35px;
	}

	#sidebar-with-content {
		display: flex;
		flex-direction: column;
	}

	@media only screen and (min-width: 900px) {
		#page-title {
			margin: 0;
			font-size: 40px;
		}

		#sidebar-with-content {
			width: 962px;
			margin: 0 auto;
			margin-top: 30px;
			flex-direction: row;

			.content {
				width: 600px;
				margin-top: 0px !important;
			}
		}
	}

	.nav-links {
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

	/deep/ .content {
		margin: 24px 0;
		height: fit-content;

		.save-changes {
			margin-top: 30px;

			&:disabled {
				background-color: $light-grey !important;
				color: #000;
			}
		}

		.control:not(:first-of-type) {
			margin: 10px 0;
		}

		label {
			font-size: 14px;
			color: $dark-grey-2;
		}

		textarea {
			height: 96px;
		}

		button {
			width: 100%;
		}
	}
}

/deep/ .saving-changes-transition-enter-active {
	transition: all 0.1s ease;
}

/deep/ .saving-changes-transition-enter {
	transform: translateX(20px);
	opacity: 0;
}
</style>
