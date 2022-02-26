<template>
	<footer class="footer">
		<div class="container">
			<div class="footer-content">
				<div id="footer-copyright">
					<p>© Copyright Musare 2015 - 2022</p>
				</div>
				<router-link id="footer-logo" to="/"
					><img src="/assets/blue_wordmark.png" alt="Musare"
				/></router-link>
				<div id="footer-links">
					<a
						v-for="(url, title, index) in filteredFooterLinks"
						:key="`footer-link-${index}`"
						:href="url"
						target="_blank"
						:title="title"
					>
						{{ title }}
					</a>
					<router-link
						v-if="getLink('about') === true"
						title="About Musare"
						to="/about"
						>About</router-link
					>
					<router-link
						v-if="getLink('team') === true"
						title="Musare Team"
						to="/team"
						>Team</router-link
					>
					<router-link
						v-if="getLink('news') === true"
						title="News"
						to="/news"
						>News</router-link
					>
				</div>
			</div>
		</div>
	</footer>
</template>

<script>
export default {
	data() {
		return {
			footerLinks: {}
		};
	},
	computed: {
		filteredFooterLinks() {
			return Object.fromEntries(
				Object.entries(this.footerLinks).filter(
					([title, url]) =>
						!(
							["about", "team", "news"].includes(
								title.toLowerCase()
							) && typeof url === "boolean"
						)
				)
			);
		}
	},
	async mounted() {
		lofig.get("siteSettings.footerLinks").then(footerLinks => {
			this.footerLinks = {
				about: true,
				team: true,
				news: true,
				...footerLinks
			};
		});
	},
	methods: {
		getLink(title) {
			return this.footerLinks[
				Object.keys(this.footerLinks).find(
					key => key.toLowerCase() === title
				)
			];
		}
	}
};
</script>

<style lang="less" scoped>
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
	box-shadow: @box-shadow;
	background-color: var(--white);
	width: 100%;
	height: 160px;
	font-size: 16px;

	.container {
		position: relative;
	}

	.footer-content {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;

		& > * {
			margin: 5px 0;
		}

		a:not(.button) {
			border: 0;
		}
	}

	#footer-logo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		width: 160px;
		order: 1;

		img {
			max-width: 100%;
			user-select: none;
			-webkit-user-drag: none;
		}
	}

	#footer-links {
		order: 2;

		:not(:last-child) {
			border-right: solid 1px var(--primary-color);
		}

		a {
			padding: 0 7px 0 4px;
			color: var(--primary-color);

			&:first-of-type {
				padding: 0 7px 0 0;
			}

			&:last-of-type {
				padding: 0 0 0 7px;
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
