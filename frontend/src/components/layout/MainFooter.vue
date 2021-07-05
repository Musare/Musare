<template>
	<footer class="footer">
		<div class="container">
			<div class="footer-content has-text-centered">
				<div id="footer-copyright">
					<p>© Copyright {{ siteSettings.sitename }} 2015 - 2021</p>
				</div>
				<a id="footer-logo" href="/">
					<img
						v-if="siteSettings.sitename === 'Musare'"
						:src="siteSettings.logo_blue"
						:alt="siteSettings.sitename || `Musare`"
					/>
					<span v-else>{{ siteSettings.sitename }}</span>
				</a>
				<div id="footer-links">
					<a
						:href="siteSettings.github"
						target="_blank"
						title="GitHub Repository"
						>GitHub</a
					>
					<router-link title="About Musare" to="/about"
						>About</router-link
					>
					<router-link title="Musare Team" to="/team"
						>Team</router-link
					>
					<router-link title="News" to="/news">News</router-link>
				</div>
				<div id="footer-nightmode-toggle">
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
		</div>
	</footer>
</template>

<script>
import Toast from "toasters";
import { mapState, mapGetters, mapActions } from "vuex";

export default {
	data() {
		return {
			siteSettings: {
				logo: "",
				sitename: "Musare",
				github: "#"
			},
			localNightmode: null
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		localNightmode() {
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
		}
	},
	async mounted() {
		this.localNightmode = JSON.parse(localStorage.getItem("nightmode"));

		this.socket.dispatch("users.getPreferences", res => {
			if (res.status === "success")
				this.localNightmode = res.data.preferences.nightmode;
		});

		this.socket.on("keep.event:user.preferences.updated", res => {
			if (res.data.preferences.nightmode !== undefined)
				this.localNightmode = res.data.preferences.nightmode;
		});

		this.frontendDomain = await lofig.get("frontendDomain");
		this.siteSettings = await lofig.get("siteSettings");
	},
	methods: {
		...mapActions("user/preferences", ["changeNightmode"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	footer.footer,
	footer.footer .container,
	footer.footer .container .footer-content {
		background-color: var(--dark-grey-3);
	}
}

.footer {
	position: relative;
	bottom: 0;
	flex-shrink: 0;
	padding: 20px;
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.4),
		0 6px 20px 0 rgba(3, 169, 244, 0.2);
	background-color: var(--white);
	width: 100%;
	height: 200px;
	font-size: 16px;

	.footer-content {
		display: flex;
		align-items: center;
		flex-direction: column;

		& > * {
			margin: 5px 0;
		}

		a:not(.button) {
			border: 0;
		}
	}

	@media (max-width: 650px) {
		border-radius: 0;
	}

	#footer-logo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		width: 160px;
		order: 1;
		user-select: none;
		font-size: 2.5rem !important;
		line-height: 50px !important;
		font-family: Pacifico, cursive;
		color: var(--primary-color);
		white-space: nowrap;

		img {
			max-height: 38px;
			color: var(--primary-color);
			user-select: none;
		}
	}

	#footer-links {
		order: 3;

		:not(:last-child) {
			border-right: solid 1px var(--primary-color);
		}

		a {
			padding: 0 5px;
			color: var(--primary-color);

			&:first-of-type {
				padding: 0 5px 0 0;
			}

			&:last-of-type {
				padding: 0 0 0 5px;
			}

			&:hover {
				color: var(--primary-color);
				text-decoration: underline;
			}
		}
	}

	#footer-copyright {
		order: 4;
	}

	#footer-nightmode-toggle {
		order: 2;
	}
}

@media only screen and (min-width: 990px) {
	.footer {
		height: 140px;

		#footer-copyright {
			order: 3;
			left: 0;
			top: 0;
			position: absolute;
			line-height: 50px;
		}

		#footer-links {
			order: 2;
			right: 0;
			top: 0;
			position: absolute;
			line-height: 50px;
		}

		#footer-nightmode-toggle {
			order: 4;
		}
	}
}
</style>
