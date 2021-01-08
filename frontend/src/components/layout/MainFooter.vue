<template>
	<footer class="footer">
		<div class="container">
			<div class="footer-content has-text-centered">
				<div id="footer-social-icons">
					<a
						class="icon"
						:href="`${this.socialLinks.github}`"
						target="_blank"
						title="GitHub Repository"
					>
						<img src="/assets/social/github.svg" />
					</a>
					<a
						class="icon"
						:href="`${this.socialLinks.twitter}`"
						target="_blank"
						title="Twitter Account"
					>
						<img src="/assets/social/twitter.svg" />
					</a>
					<a
						class="icon"
						:href="`${this.socialLinks.facebook}`"
						target="_blank"
						title="Facebook Page"
					>
						<img src="/assets/social/facebook.svg" />
					</a>
					<a
						class="icon"
						:href="`${this.socialLinks.discord}`"
						target="_blank"
						title="Discord Server"
					>
						<img src="/assets/social/discord.svg" />
					</a>
				</div>
				<a href="/"
					><img
						id="footer-logo"
						src="/assets/blue_wordmark.png"
						alt="Musare"
				/></a>
				<div id="footer-links">
					<router-link title="About Musare" to="/about"
						>About</router-link
					>
					<router-link title="Musare Team" to="/team"
						>Team</router-link
					>
					<router-link title="News" to="/news">News</router-link>
				</div>
				<p>© Copyright Musare 2015 - 2021</p>
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

	footer.footer #footer-social-icons img {
		filter: invert(1);
	}
}

.footer-content a:not(.button) {
	border: 0;
}

.footer-content {
	display: flex;
	align-items: center;
	flex-direction: column;
}

.footer {
	flex-shrink: 0;
	height: 240px;
	padding: 40px 20px 40px;
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.65),
		0 6px 20px 0 rgba(3, 169, 244, 0.4);
	background-color: $white;
	width: 100%;

	#footer-logo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 15px;
		width: 200px;
	}

	#footer-social-icons {
		user-select: none;
		-webkit-user-select: none;

		.icon {
			height: 28px;
			line-height: 28px;
			width: 28px;
		}
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
		height: 180px;

		#footer-social-icons {
			left: 0;
			top: 35px;
			position: absolute;
		}

		#footer-links {
			right: 0;
			top: 35px;
			position: absolute;
		}
	}
}
</style>
