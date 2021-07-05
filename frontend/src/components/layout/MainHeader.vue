<template>
	<nav class="nav is-info" :class="{ transparent }">
		<div class="nav-left">
			<router-link v-if="!hideLogo" class="nav-item is-brand" to="/">
				<img
					:src="siteSettings.logo_white"
					:alt="siteSettings.sitename || `Musare`"
				/>
			</router-link>
		</div>

		<span
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
			<router-link
				v-if="role === 'admin'"
				class="nav-item admin"
				to="/admin"
			>
				<strong>Admin</strong>
			</router-link>
			<span v-if="loggedIn" class="grouped">
				<router-link
					class="nav-item "
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
				<a class="nav-item" href="#" @click="logout()">Logout</a>
			</span>
			<span v-if="!loggedIn && !hideLoggedOut" class="grouped">
				<a class="nav-item" href="#" @click="openModal('login')"
					>Login</a
				>
				<a class="nav-item" href="#" @click="openModal('register')"
					>Register</a
				>
			</span>
		</div>
	</nav>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

export default {
	props: {
		hideLogo: { type: Boolean, default: false },
		transparent: { type: Boolean, default: false },
		hideLoggedOut: { type: Boolean, default: false }
	},
	data() {
		return {
			isMobile: false,
			frontendDomain: "",
			siteSettings: {
				logo: "",
				sitename: ""
			}
		};
	},
	computed: {
		...mapState({
			modals: state => state.modalVisibility.modals.header,
			role: state => state.user.auth.role,
			loggedIn: state => state.user.auth.loggedIn,
			username: state => state.user.auth.username
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	async mounted() {
		this.frontendDomain = await lofig.get("frontendDomain");
		this.siteSettings = await lofig.get("siteSettings");
	},

	methods: {
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/auth", ["logout"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.nav {
		background-color: var(--dark-grey-3) !important;
	}

	.nav-item {
		color: var(--light-grey-2) !important;
	}
}

.nav {
	flex-shrink: 0;
	background-color: var(--primary-color);
	height: 64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	&.transparent {
		background-color: transparent !important;
	}

	@media (max-width: 650px) {
		border-radius: 0;
	}

	.nav-menu.is-active {
		.nav-item {
			color: var(--dark-grey-2);

			&:hover {
				color: var(--dark-grey-2);
			}
		}
	}

	a.nav-item.is-tab:hover {
		border-bottom: none;
		border-top: solid 1px var(--white);
		padding-top: 9px;
	}

	.nav-toggle {
		height: 64px;

		&:hover,
		&:active {
			filter: brightness(95%);
		}

		span {
			background-color: var(--white);
		}
	}

	.is-brand {
		font-size: 2.1rem !important;
		line-height: 38px !important;
		padding: 0 20px;
		font-family: Pacifico, cursive;

		img {
			max-height: 38px;
			color: var(--primary-color);
			user-select: none;
		}
	}

	.nav-item {
		font-size: 17px;
		color: var(--white);

		&:hover {
			color: var(--white);
		}
	}
}
.grouped {
	margin: 0;
	display: flex;
	text-decoration: none;
}
</style>
