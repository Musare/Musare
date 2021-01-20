<template>
	<footer class="footer">
		<div class="container">
			<div class="footer-content has-text-centered">
				<div id="footer-copyright">
					<p>© Copyright Musare 2015 - 2021</p>
				</div>
				<a id="footer-logo" href="/"
					><img src="/assets/blue_wordmark.png" alt="Musare"
				/></a>
				<div id="footer-links">
					<a
						:href="`${this.github}`"
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
			github: "#"
		};
	},
	mounted() {
		lofig.get("siteSettings.github").then(github => {
			this.github = github;
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
	flex-direction: column;
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
	height: 160px;
	font-size: 16px;

	@media (max-width: 650px) {
		border-radius: 0;
	}

	#footer-logo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		width: 160px;
		order: 1;
	}

	#footer-links {
		order: 2;
		:not(:last-child) {
			border-right: solid 1px $primary-color;
		}

		a {
			padding: 0 7px;
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

	#footer-copyright {
		order: 3;
	}
}

@media only screen and (min-width: 992px) {
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
