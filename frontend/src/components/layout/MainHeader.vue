<template>
	<nav
		class="nav is-info"
		:class="{ transparent, 'hide-logged-out': !loggedIn && hideLoggedOut }"
	>
		<div class="nav-left">
			<router-link v-if="!hideLogo" class="nav-item is-brand" to="/">
				<img
					:src="siteSettings.logo_white"
					:alt="siteSettings.sitename || `Musare`"
				/>
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
				@click="toggleNightmode()"
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
					v-if="role === 'admin'"
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

<script>
import Toast from "toasters";
import { mapState, mapGetters, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";

export default {
	components: {
		ChristmasLights: defineAsyncComponent(() =>
			import("@/components/ChristmasLights.vue")
		)
	},
	props: {
		hideLogo: { type: Boolean, default: false },
		transparent: { type: Boolean, default: false },
		hideLoggedOut: { type: Boolean, default: false }
	},
	data() {
		return {
			localNightmode: false,
			isMobile: false,
			frontendDomain: "",
			siteSettings: {
				logo: "",
				sitename: "",
				christmas: false,
				registrationDisabled: false
			},
			windowWidth: 0
		};
	},
	computed: {
		...mapState({
			modals: state => state.modalVisibility.modals.header,
			role: state => state.user.auth.role,
			loggedIn: state => state.user.auth.loggedIn,
			username: state => state.user.auth.username,
			nightmode: state => state.user.preferences.nightmode
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		nightmode(nightmode) {
			if (this.localNightmode !== nightmode)
				this.toggleNightmode(nightmode);
		}
	},
	async mounted() {
		this.localNightmode = JSON.parse(localStorage.getItem("nightmode"));
		if (this.localNightmode === null) this.localNightmode = false;

		this.frontendDomain = await lofig.get("frontendDomain");
		this.siteSettings = await lofig.get("siteSettings");

		this.$nextTick(() => {
			this.onResize();
			window.addEventListener("resize", this.onResize);
		});
	},
	methods: {
		toggleNightmode(toggle) {
			this.localNightmode = toggle || !this.localNightmode;

			localStorage.setItem("nightmode", this.localNightmode);

			if (this.loggedIn) {
				this.socket.dispatch(
					"users.updatePreferences",
					{ nightmode: this.localNightmode },
					res => {
						if (res.status !== "success") new Toast(res.message);
					}
				);
			}

			this.changeNightmode(this.localNightmode);
		},
		onResize() {
			this.windowWidth = window.innerWidth;
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/auth", ["logout"]),
		...mapActions("user/preferences", ["changeNightmode"])
	}
};
</script>

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
	z-index: 2;

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
			background-color: var(--white);
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
