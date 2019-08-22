<template>
	<footer class="footer">
		<div class="container">
			<div class="content has-text-centered">
				<p class="socialIcons">
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
				</p>
				<a href="/"
					><img
						class="musareFooterLogo"
						src="/assets/wordmark.png"
						alt="Musare"
				/></a>
				<p class="footerLinks">
					<router-link title="About Musare" to="/about">
						About
					</router-link>
					<router-link title="The Musare Team" to="/team">
						Team
					</router-link>
					<router-link title="News" to="/news">
						News
					</router-link>
				</p>
				<p>
					© Copyright Musare 2015 - 2019
				</p>
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
		lofig.get("siteSettings.socialLinks", res => {
			this.socialLinks = res;
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.content a:not(.button) {
	border: 0;
}

.content {
	display: flex;
	align-items: center;
	flex-direction: column;
}

.footer {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	height: 240px;
	padding: 40px 20px 40px;
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.65),
		0 6px 20px 0 rgba(3, 169, 244, 0.4);
	background-color: $white;
	width: 100%;

	.musareFooterLogo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 15px;
		width: 200px;
	}

	.socialIcons {
		.icon {
			height: 28px;
			line-height: 28px;
			width: 28px;
		}
	}

	.footerLinks {
		:not(:last-child) {
			border-right: solid 1px $primary-color;
		}
		a {
			padding: 0 5px;
			font-size: 18px;
			color: $primary-color;
		}
		a:hover {
			color: $primary-color;
			text-decoration: underline;
		}
	}
}

@media only screen and (min-width: 992px) {
	.footer {
		height: 180px;
		.socialIcons {
			left: 0;
			top: 35px;
			position: absolute;
		}
		.footerLinks {
			right: 0;
			top: 35px;
			position: absolute;
		}
	}
}
</style>
