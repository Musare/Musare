<template>
	<nav class="nav is-info">
		<div class="nav-left">
			<router-link class="nav-item is-brand" to="/">
				<img
					:src="`${this.siteSettings.logo}`"
					:alt="`${this.siteSettings.siteName}` || `Musare`"
				/>
			</router-link>
		</div>

		<span
			class="nav-toggle"
			:class="{ 'is-active': isMobile }"
			@click="isMobile = !isMobile"
		>
			<span />
			<span />
			<span />
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<router-link
				v-if="$parent.$parent.role === 'admin'"
				class="nav-item is-tab admin"
				to="/admin"
			>
				<strong>Admin</strong>
			</router-link>
			<span v-if="$parent.$parent.loggedIn" class="grouped">
				<router-link
					class="nav-item is-tab"
					:to="{
						name: 'profile',
						params: { username: $parent.$parent.username }
					}"
				>
					Profile
				</router-link>
				<router-link class="nav-item is-tab" to="/settings"
					>Settings</router-link
				>
				<a
					class="nav-item is-tab"
					href="#"
					@click="$parent.$parent.logout()"
					>Logout</a
				>
			</span>
			<span v-else class="grouped">
				<a
					class="nav-item"
					href="#"
					@click="
						openModal({
							sector: 'header',
							modal: 'login'
						})
					"
					>Login</a
				>
				<a
					class="nav-item"
					href="#"
					@click="
						openModal({
							sector: 'header',
							modal: 'register'
						})
					"
					>Register</a
				>
			</span>
		</div>
	</nav>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
	data() {
		return {
			isMobile: false,
			frontendDomain: "",
			siteSettings: {
				logo: "",
				siteName: ""
			}
		};
	},
	mounted() {
		lofig.get("frontendDomain", res => {
			this.frontendDomain = res;
			return res;
		});
		lofig.get("siteSettings", res => {
			this.siteSettings = res;
			return res;
		});
	},
	computed: mapState("modals", {
		modals: state => state.modals.header
	}),
	methods: {
		...mapActions("modals", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.nav {
	background-color: #03a9f4;
	height: 64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	.nav-menu.is-active {
		.nav-item {
			color: #333;

			&:hover {
				color: #333;
			}
		}
	}

	a.nav-item.is-tab:hover {
		border-bottom: none;
		border-top: solid 1px #ffffff;
	}

	.nav-toggle {
		height: 64px;

		&.is-active span {
			background-color: #333;
		}
	}

	.is-brand {
		font-size: 2.1rem !important;
		line-height: 64px !important;
		padding: 0 20px;
		color: #ffffff;
		font-family: Pacifico, cursive;
		filter: brightness(0) invert(1);

		img {
			max-height: 38px;
		}
	}

	.nav-item {
		font-size: 17px;
		color: #ffffff;

		&:hover {
			color: #ffffff;
		}
	}
	.admin strong {
		color: #9d42b1;
	}
}
.grouped {
	margin: 0;
	display: flex;
	text-decoration: none;
}
</style>
