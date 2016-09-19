<template>
	<footer>
		<div class="footer-left">
			<div class="left-title">Stay Connected</div>
			<div class="left-message">Follow us on social media or send us an email!</div>
			<div class="left-icons">
				<div class="icon"><i class="fa fa-twitter" aria-hidden="true"></i></div>
				<div class="icon"><i class="fa fa-facebook" aria-hidden="true"></i></div>
				<div class="icon"><i class="fa fa-twitch" aria-hidden="true"></i></div>
			</div>
		</div>
		<div class="footer-right">
			<div class="right-links">
				<div class="links-title">Links</div>
				<a class="link">GitHub</a>
				<a class="link">Feedback</a>
				<a class="link">FAQ</a>
				<a class="link">Terms</a>
				<a class="link">Privacy</a>
			</div>
		</div>
		<div class="footer-message">© Copyright Musare: 2015 - {{ new Date().getFullYear() }}</div>
	</footer>
</template>

<style lang="sass" scoped>
	footer {
		width: 100%;
		height: 200px;
		background-color: #e0e0e0;
		padding-top: 26px;
		margin-top: 100px;

		.footer-left {
			float: left;
			width: 50%;
			height: 150px;
			padding-left: 64px;

			.left-title {
				font-size: 25px;
				color: #616161;
				margin-bottom: 16px;
			}

			.left-message {
				font-size: 15px;
				color: #757575;
				margin-bottom: 16px;
			}

			.left-icons {
				.icon {
					float: left;
					font-size: 32px;
					padding-right: 16px;
					color: #757575;

					&:hover {
						cursor: pointer;
						color: #222222;
					}
				}
			}
		}

		.footer-right {
			float: right;
			width: 50%;
			height: 150px;
			padding-left: 64px;

			.right-links {
				float: right;
				width: 200px;
			}

			.links-title {
				float: right;
				width: 200px;
				font-size: 25px;
				color: #616161;
				margin-bottom: 8px;
			}

			.link {
				float: right;
				width: 200px;
				clear: both;
				font-size: 15px;
				color: #757575;
				margin-bottom: 2px;

				&:hover {
					cursor: pointer;
					color: #222222;
				}
			}
		}

		.footer-message {
			float: left;
			width: 100%;
			height: 50px;
			line-height: 50px;
			padding-left: 128px;
			background-color: #d3d3d3;
			color: #757575;
		}
	}
</style>
