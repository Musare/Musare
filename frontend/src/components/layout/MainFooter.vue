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
			</div>
		</div>
	</footer>
</template>

<script>
export default {
	data() {
		return {
			siteSettings: {
				logo: "",
				sitename: "Musare",
				github: "#"
			}
		};
	},
	async mounted() {
		this.siteSettings = await lofig.get("siteSettings");
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
	height: auto;
	padding: 20px;
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.4),
		0 6px 20px 0 rgba(3, 169, 244, 0.2);
	background-color: var(--white);
	width: 100%;
	height: 160px;
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
		order: 2;

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
		order: 3;
	}
}

@media only screen and (min-width: 990px) {
	.footer {
		height: 100px;

		#footer-copyright {
			left: 0;
			top: 0;
			position: absolute;
			line-height: 50px;
		}

		#footer-links {
			right: 0;
			top: 0;
			position: absolute;
			line-height: 50px;
		}
	}
}
</style>
