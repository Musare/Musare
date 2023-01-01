<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, watch, nextTick } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useUserPreferencesStore } from "@/stores/userPreferences";
import { useModalsStore } from "@/stores/modals";

const ChristmasLights = defineAsyncComponent(
	() => import("@/components/ChristmasLights.vue")
);

defineProps({
	hideLogo: { type: Boolean, default: false },
	transparent: { type: Boolean, default: false },
	hideLoggedOut: { type: Boolean, default: false }
});

const userAuthStore = useUserAuthStore();

const localNightmode = ref(false);
const isMobile = ref(false);
const frontendDomain = ref("");
const siteSettings = ref({
	logo_white: "/assets/white_wordmark.png",
	sitename: "Musare",
	christmas: false,
	registrationDisabled: false
});
const windowWidth = ref(0);
const sidName = ref();
const broadcastChannel = ref();

const { socket } = useWebsocketsStore();

const { loggedIn, username } = storeToRefs(userAuthStore);
const { logout, hasPermission } = userAuthStore;
const userPreferencesStore = useUserPreferencesStore();
const { nightmode } = storeToRefs(userPreferencesStore);

const { openModal } = useModalsStore();

const toggleNightmode = toggle => {
	localNightmode.value =
		toggle === undefined ? !localNightmode.value : toggle;

	if (loggedIn.value) {
		socket.dispatch(
			"users.updatePreferences",
			{ nightmode: localNightmode.value },
			res => {
				if (res.status !== "success") new Toast(res.message);
			}
		);
	} else {
		broadcastChannel.value.postMessage(localNightmode.value);
	}
};

const onResize = () => {
	windowWidth.value = window.innerWidth;
};

watch(nightmode, value => {
	localNightmode.value = value;
});

onMounted(async () => {
	localNightmode.value = nightmode.value;
	frontendDomain.value = await lofig.get("frontendDomain");
	siteSettings.value = await lofig.get("siteSettings");
	sidName.value = await lofig.get("cookie.SIDname");

	await nextTick();
	onResize();
	window.addEventListener("resize", onResize);

	broadcastChannel.value = new BroadcastChannel(`${sidName.value}.nightmode`);
});
</script>

<template>
	<nav
		class="nav is-info"
		:class="{ transparent, 'hide-logged-out': !loggedIn && hideLoggedOut }"
	>
		<div class="nav-left">
			<router-link v-if="!hideLogo" class="nav-item is-brand" to="/">
				<img
					v-if="siteSettings.sitename === 'Musare'"
					:src="siteSettings.logo_white"
					:alt="siteSettings.sitename || `Musare`"
				/>
				<span v-else>{{ siteSettings.sitename }}</span>
			</router-link>
		</div>

		<span
			v-if="loggedIn || !hideLoggedOut"
			class="nav-toggle"
			:class="{ 'is-active': isMobile }"
			tabindex="0"
			@click="isMobile = !isMobile"
			@keyup.enter="isMobile = !isMobile"
		>
			<span />
			<span />
			<span />
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<div
				class="nav-item"
				id="nightmode-toggle"
				@click="toggleNightmode(!localNightmode)"
			>
				<span
					:class="{
						'material-icons': true,
						'night-mode-toggle': true,
						'night-mode-on': localNightmode
					}"
					:content="`${
						localNightmode ? 'Disable' : 'Enable'
					} Nightmode`"
					v-tippy
				>
					{{ localNightmode ? "dark_mode" : "light_mode" }}
				</span>
				<span class="night-mode-label">Toggle Nightmode</span>
			</div>
			<span v-if="loggedIn" class="grouped">
				<router-link
					v-if="hasPermission('admin.view')"
					class="nav-item admin"
					to="/admin"
				>
					<strong>Admin</strong>
				</router-link>
				<router-link
					class="nav-item"
					:to="{
						name: 'profile',
						params: { username }
					}"
				>
					Profile
				</router-link>
				<router-link class="nav-item" to="/settings"
					>Settings</router-link
				>
				<a class="nav-item" @click="logout()">Logout</a>
			</span>
			<span v-if="!loggedIn && !hideLoggedOut" class="grouped">
				<a class="nav-item" @click="openModal('login')">Login</a>
				<a
					v-if="!siteSettings.registrationDisabled"
					class="nav-item"
					@click="openModal('register')"
					>Register</a
				>
			</span>
		</div>

		<christmas-lights
			v-if="siteSettings.christmas"
			:lights="Math.min(Math.max(Math.floor(windowWidth / 175), 5), 15)"
		/>
	</nav>
</template>

<style lang="less" scoped>
.night-mode {
	.nav {
		background-color: var(--dark-grey-3) !important;
	}

	@media screen and (max-width: 768px) {
		.nav:not(.hide-logged-out) .nav-menu {
			background-color: var(--dark-grey-3) !important;
		}
	}

	.nav-item {
		color: var(--light-grey-2) !important;
	}
}

.nav {
	flex-shrink: 0;
	display: flex;
	position: relative;
	background-color: var(--primary-color);
	height: 64px;
	z-index: 100;

	&.transparent {
		background-color: transparent !important;
	}

	.nav-left,
	.nav-right {
		flex: 1;
		display: flex;
	}

	.nav-right {
		justify-content: flex-end;
	}

	a.nav-item.is-tab:hover {
		border-bottom: none;
		border-top: solid 1px var(--white);
		padding-top: 9px;
	}

	.nav-toggle {
		height: 64px;
		width: 50px;
		position: relative;
		background-color: transparent;
		display: none;
		position: relative;
		cursor: pointer;

		&.is-active {
			span:nth-child(1) {
				margin-left: -5px;
				transform: rotate(45deg);
				transform-origin: left top;
			}

			span:nth-child(2) {
				opacity: 0;
			}

			span:nth-child(3) {
				margin-left: -5px;
				transform: rotate(-45deg);
				transform-origin: left bottom;
			}
		}

		span {
			background-color: var(--white) !important;
			display: block;
			height: 1px;
			left: 50%;
			margin-left: -7px;
			position: absolute;
			top: 50%;
			width: 15px;
			transition: none 86ms ease-out;
			transition-property: opacity, transform;

			&:nth-child(1) {
				margin-top: -6px;
			}

			&:nth-child(2) {
				margin-top: -1px;
			}

			&:nth-child(3) {
				margin-top: 4px;
			}
		}
	}

	.nav-item {
		font-size: 17px;
		color: var(--white);
		border-top: 0;
		display: flex;
		align-items: center;
		padding: 10px;
		cursor: pointer;

		&:hover,
		&:focus {
			color: var(--white);
		}

		&.is-brand {
			font-size: 2.1rem !important;
			line-height: 38px !important;
			padding: 0 20px;
			font-family: Pacifico, cursive;
			display: flex;
			align-items: center;

			img {
				max-height: 38px;
				color: var(--primary-color);
				user-select: none;
				-webkit-user-drag: none;
			}
		}

		.night-mode-label {
			display: none;
		}
	}
}

.grouped {
	margin: 0;
	display: flex;
	text-decoration: none;
	.nav-item {
		&:hover,
		&:focus {
			border-top: 1px solid var(--white);
			height: calc(100% - 1px);
		}
	}
}

@media screen and (max-width: 768px) {
	.nav:not(.hide-logged-out) {
		.nav-toggle {
			display: block !important;
		}

		.nav-menu {
			display: none !important;
			box-shadow: @box-shadow-dropdown;
			left: 0;
			right: 0;
			top: 100%;
			position: absolute;
			background: var(--white);
			z-index: 100;
		}

		.nav-menu.is-active {
			display: flex !important;
			flex-direction: column-reverse;

			.nav-item {
				color: var(--dark-grey-2);

				&:hover {
					color: var(--dark-grey-2);
				}

				.night-mode-label {
					display: inline;
					margin-left: 5px;
				}
			}
		}

		.nav-menu {
			.grouped {
				flex-direction: column;
			}
			.nav-item {
				padding: 10px 20px;
				&:hover,
				&:focus {
					border-top: 0;
					height: unset;
				}
			}
		}
	}
}
</style>
