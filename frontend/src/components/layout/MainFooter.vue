<template>
	<footer class="footer">
		<div class="container">
			<div class="footer-content has-text-centered">
				<div id="footer-copyright">
					<p>© Copyright Musare 2015 - 2021</p>
				</div>
				<a href="/"
					><img
						id="footer-logo"
						src="/assets/blue_wordmark.png"
						alt="Musare"
				/></a>
				<div id="footer-links">
					<a
						:href="`${this.socialLinks.github}`"
						target="_blank"
						title="GitHub Repository"
					>
						GitHub
					</a>
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
			socialLinks: {
				github: "",
				twitter: "",
				facebook: "",
				discord: ""
			}
		};
	},
	mounted() {
		lofig.get("siteSettings.socialLinks").then(socialLinks => {
			this.socialLinks = socialLinks;
		});
	}
};
</script>

<style lang="scss" scoped>
@import "./../../styles/global.scss";

.night-mode {
	footer.footer,
	footer.footer .container,
	footer.footer .container .footer-content {
		background-color: $night-mode-bg-secondary;
	}
}

.footer-content a:not(.button) {
	border: 0;
}

.footer-content {
	display: flex;
	align-items: center;
	flex-direction: column-reverse;
	& > * {
		margin: 5px 0;
	}
}

.footer {
	flex-shrink: 0;
	height: auto;
	padding: 20px;
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.4),
		0 6px 20px 0 rgba(3, 169, 244, 0.2);
	background-color: $white;
	width: 100%;

	#footer-logo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		width: 200px;
	}

	#footer-links {
		:not(:last-child) {
			border-right: solid 1px $primary-color;
		}

		a {
			padding: 0 7px;
			font-size: 18px;
			color: $primary-color;

			&:first-of-type {
				padding: 0 7px 0 0;
			}

			&:last-of-type {
				padding: 0 0 0 7px;
			}

			&:hover {
				color: $primary-color;
				text-decoration: underline;
			}
		}
	}
}

@media only screen and (min-width: 992px) {
	.footer {
		#footer-copyright {
			left: 0;
			top: 20px;
			position: absolute;
			line-height: 25px;
		}

		#footer-links {
			right: 0;
			top: 20px;
			position: absolute;
			line-height: 25px;
		}
	}
}
</style>
