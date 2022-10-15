<script setup lang="ts">
import { useRoute } from "vue-router";
import { onMounted, defineAsyncComponent } from "vue";
import Toast from "toasters";
import { useSettingsStore } from "@/stores/settings";
import { useWebsocketsStore } from "@/stores/websockets";
import { useTabQueryHandler } from "@/composables/useTabQueryHandler";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const SecuritySettings = defineAsyncComponent(
	() => import("./Tabs/Security.vue")
);
const AccountSettings = defineAsyncComponent(
	() => import("./Tabs/Account.vue")
);
const ProfileSettings = defineAsyncComponent(
	() => import("./Tabs/Profile.vue")
);
const PreferencesSettings = defineAsyncComponent(
	() => import("./Tabs/Preferences.vue")
);

const settingsStore = useSettingsStore();
const route = useRoute();
const { tab, showTab } = useTabQueryHandler("");

const { socket } = useWebsocketsStore();

const { setUser, updateOriginalUser } = settingsStore;

onMounted(() => {
	if (
		route.query.tab === "profile" ||
		route.query.tab === "security" ||
		route.query.tab === "account" ||
		route.query.tab === "preferences"
	)
		tab.value = route.query.tab;
	else tab.value = "profile";

	// this.localNightmode = this.nightmode;

	socket.onConnect(() => {
		socket.dispatch("users.findBySession", res => {
			if (res.status === "success") setUser(res.data.user);
			else new Toast("You're not currently signed in.");
		});
	});

	socket.on("event:user.password.linked", () =>
		updateOriginalUser({
			property: "password",
			value: true
		})
	);

	socket.on("event:user.password.unlinked", () =>
		updateOriginalUser({
			property: "password",
			value: false
		})
	);

	socket.on("event:user.github.linked", () =>
		updateOriginalUser({
			property: "github",
			value: true
		})
	);

	socket.on("event:user.github.unlinked", () =>
		updateOriginalUser({
			property: "github",
			value: false
		})
	);
});
</script>

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
	</div>
</template>

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
