<template>
	<div>
		<page-metadata title="Settings" />
		<main-header />
		<div class="container">
			<h1 id="page-title">Settings</h1>
			<div id="sidebar-with-content">
				<div class="nav-links">
					<a
						:class="{ active: tab === 'profile' }"
						@click="showTab('profile')"
					>
						Profile
					</a>
					<a
						:class="{ active: tab === 'account' }"
						@click="showTab('account')"
					>
						Account
					</a>
					<a
						:class="{ active: tab === 'security' }"
						@click="showTab('security')"
					>
						Security
					</a>
					<a
						:class="{ active: tab === 'preferences' }"
						@click="showTab('preferences')"
					>
						Preferences
					</a>
				</div>
				<profile-settings v-if="tab === 'profile'"></profile-settings>
				<account-settings v-if="tab === 'account'"></account-settings>
				<security-settings
					v-if="tab === 'security'"
				></security-settings>
				<preferences-settings
					v-if="tab === 'preferences'"
				></preferences-settings>
			</div>
		</div>
		<main-footer />

		<remove-account v-if="modals.removeAccount" />
	</div>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { defineAsyncComponent } from "vue";
import Toast from "toasters";
import ws from "@/ws";

import TabQueryHandler from "@/mixins/TabQueryHandler.vue";

export default {
	components: {
		SecuritySettings: defineAsyncComponent(() =>
			import("./Tabs/Security.vue")
		),
		AccountSettings: defineAsyncComponent(() =>
			import("./Tabs/Account.vue")
		),
		ProfileSettings: defineAsyncComponent(() =>
			import("./Tabs/Profile.vue")
		),
		PreferencesSettings: defineAsyncComponent(() =>
			import("./Tabs/Preferences.vue")
		),
		RemoveAccount: defineAsyncComponent(() =>
			import("@/components/modals/RemoveAccount.vue")
		)
	},
	mixins: [TabQueryHandler],
	data() {
		return {
			tab: ""
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		...mapState("modalVisibility", {
			modals: state => state.modals
		})
	},
	mounted() {
		if (
			this.$route.query.tab === "profile" ||
			this.$route.query.tab === "security" ||
			this.$route.query.tab === "account" ||
			this.$route.query.tab === "preferences"
		)
			this.tab = this.$route.query.tab;
		else this.tab = "profile";

		this.localNightmode = this.nightmode;

		ws.onConnect(this.init);

		this.socket.on("event:user.password.linked", () =>
			this.updateOriginalUser({
				property: "password",
				value: true
			})
		);

		this.socket.on("event:user.password.unlinked", () =>
			this.updateOriginalUser({
				property: "password",
				value: false
			})
		);

		this.socket.on("event:user.github.linked", () =>
			this.updateOriginalUser({
				property: "github",
				value: true
			})
		);

		this.socket.on("event:user.github.unlinked", () =>
			this.updateOriginalUser({
				property: "github",
				value: false
			})
		);
	},
	methods: {
		init() {
			this.socket.dispatch("users.findBySession", res => {
				if (res.status === "success") this.setUser(res.data.user);
				else new Toast("You're not currently signed in.");
			});
		},
		...mapActions("settings", ["updateOriginalUser", "setUser"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.container .content {
		box-shadow: 0 !important;
	}
}

:deep(.character-counter) {
	display: flex;
	justify-content: flex-end;
	height: 0;
}

.container {
	margin-top: 32px;
	padding: 24px;

	:deep(.row) {
		*:not(:last-child) {
			margin-right: 5px;
		}
	}

	.content {
		background-color: var(--white);
		padding: 30px 50px;
		border-radius: @border-radius;
		box-shadow: @box-shadow;
	}

	#sidebar-with-content {
		display: flex;
		flex-direction: column;
	}

	@media only screen and (min-width: 700px) {
		#sidebar-with-content {
			width: 962px;
			max-width: 100%;
			margin: 0 auto;
			flex-direction: row;

			.nav-links {
				margin-left: 0;
				margin-right: 64px;
			}

			.content {
				width: 600px;
				margin-top: 0px !important;
			}
		}
	}

	.nav-links {
		width: 250px;
		margin-left: auto;
		margin-right: auto;

		a {
			outline: none;
			border: none;
			box-shadow: 0;
			color: var(--primary-color);
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: @border-radius;
			background-color: transparent;
			display: inline-block;

			&.active {
				color: var(--white);
				background-color: var(--primary-color);
			}
		}
	}

	:deep(.content) {
		margin: 24px 0;
		height: fit-content;

		.control:not(:first-of-type) {
			margin: 10px 0;
		}

		label {
			font-size: 14px;
			color: var(--dark-grey-2);
		}

		textarea {
			height: 96px;
		}

		button {
			width: 100%;
			margin-top: 30px;
		}
	}
}
</style>
