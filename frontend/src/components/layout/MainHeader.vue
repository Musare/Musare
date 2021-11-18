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
				<a class="nav-item" @click="openModal('register')">Register</a>
			</span>
			<div class="nav-item" id="nightmode-toggle">
				<p class="is-expanded checkbox-control">
					<label class="switch">
						<input
							type="checkbox"
							id="instant-nightmode"
							v-model="localNightmode"
						/>
						<span class="slider round"></span>
					</label>

					<label for="instant-nightmode">
						<p>Nightmode</p>
					</label>
				</p>
			</div>
		</div>

		<div class="christmas-lights">
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
		</div>
	</nav>
</template>

<script>
import Toast from "toasters";
import { mapState, mapGetters, mapActions } from "vuex";

export default {
	props: {
		hideLogo: { type: Boolean, default: false },
		transparent: { type: Boolean, default: false },
		hideLoggedOut: { type: Boolean, default: false }
	},
	data() {
		return {
			localNightmode: null,
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
			username: state => state.user.auth.username,
			nightmode: state => state.user.preferences.nightmode
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		localNightmode(newValue, oldValue) {
			if (oldValue === null) return;

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
		nightmode(nightmode) {
			if (this.localNightmode !== nightmode)
				this.localNightmode = nightmode;
		}
	},
	async mounted() {
		this.localNightmode = JSON.parse(localStorage.getItem("nightmode"));
		if (this.localNightmode === null) this.localNightmode = false;

		this.frontendDomain = await lofig.get("frontendDomain");
		this.siteSettings = await lofig.get("siteSettings");
	},
	methods: {
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/auth", ["logout"]),
		...mapActions("user/preferences", ["changeNightmode"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.nav {
		background-color: var(--dark-grey-3) !important;
	}

	@media screen and (max-width: 768px) {
		.nav-menu {
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
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;
	z-index: 2;

	&.transparent {
		background-color: transparent !important;
	}

	@media (max-width: 650px) {
		border-radius: 0;
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
			}
		}
	}

	.nav-menu {
		// box-shadow: 0 4px 7px rgb(10 10 10 / 10%);
		// left: 0;
		// display: block;
		// right: 0;
		// top: 100%;
		// position: absolute;
		// background: var(--white);
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

.christmas-lights {
	position: absolute;
	width: 100%;
	height: 50px;
	left: 0;
	top: 64px;
	display: flex;
	justify-content: space-around;

	.christmas-light {
		height: 34px;
		width: 12px;
		border-top-left-radius: 50%;
		border-top-right-radius: 50%;
		border-bottom-left-radius: 50%;
		border-bottom-right-radius: 50%;
		z-index: 2;

		&::before {
			content: "";
			display: block;
			width: 12px;
			height: 12px;
			background-color: rgb(6, 49, 19);
			border-top-left-radius: 25%;
			border-top-right-radius: 25%;
			border-bottom-left-radius: 25%;
			border-bottom-right-radius: 25%;
		}

		&:nth-of-type(1) {
			transform: rotate(5deg);
			background-color: red;
		}

		&:nth-of-type(2) {
			transform: rotate(-7deg);
			background-color: cyan;
		}

		&:nth-of-type(3) {
			transform: rotate(3deg);
			background-color: yellow;
		}

		&:nth-of-type(4) {
			transform: rotate(10deg);
			background-color: magenta;
		}

		&:nth-of-type(5) {
			transform: rotate(-3deg);
			background-color: lime;
		}

		&:nth-of-type(6) {
			transform: rotate(8deg);
			background-color: orange;
		}

		&:nth-of-type(7) {
			transform: rotate(-1deg);
			background-color: cyan;
		}

		&:nth-of-type(8) {
			transform: rotate(-4deg);
			background-color: red;
		}

		&:nth-of-type(9) {
			transform: rotate(3deg);
			background-color: yellow;
		}

		&:nth-of-type(10) {
			transform: rotate(-10deg);
			background-color: magenta;
		}
	}

	.christmas-wire {
		flex: 1;
		margin-bottom: 15px;
		z-index: 1;

		// top: -15px;
		// border-color: blue transparent transparent transparent;
		border-top: 2px solid rgb(11, 88, 50);
		border-radius: 50%;
		margin-left: -7px;
		margin-right: -7px;
		transform: scaleY(-1);
		transform-origin: 0% 20%;
		// border-radius: 50%/100px 100px 0 0;

		// border-radius: 50%;
		// background-color: blue;
	}
}

@media screen and (max-width: 768px) {
	.nav-toggle {
		display: block !important;
	}

	.nav-menu {
		display: none !important;
		box-shadow: 0 4px 7px rgba(10, 10, 10, 0.1);
		left: 0;
		right: 0;
		top: 100%;
		position: absolute;
		background: var(--white);
	}

	.nav-menu.is-active {
		display: block !important;

		.nav-item {
			color: var(--dark-grey-2);

			&:hover {
				color: var(--dark-grey-2);
			}
		}
	}

	.nav .nav-menu .grouped {
		flex-direction: column;
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
</style>
