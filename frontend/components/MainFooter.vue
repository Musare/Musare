<template>
	<footer class="footer">
		<div class="container">
			<div class="content has-text-centered">
				<p>
					<a
						class="icon"
						href="https://github.com/Musare/MusareNode"
						target="_blank"
						title="GitHub Repository"
					>
						<img src="/assets/social/github.svg" />
					</a>
					<a
						class="icon"
						href="https://twitter.com/MusareApp"
						target="_blank"
						title="Twitter Account"
					>
						<img src="/assets/social/twitter.svg" />
					</a>
					<a
						class="icon"
						href="https://www.facebook.com/MusareMusic/"
						target="_blank"
						title="Facebook Page"
					>
						<img src="/assets/social/facebook.svg" />
					</a>
					<a
						class="icon"
						href="https://discord.gg/Y5NxYGP"
						target="_blank"
						title="Discord Server"
					>
						<img src="/assets/social/discord.svg" />
					</a>
				</p>
				<a href="https://musare.com" target="_blank"
					><img
						class="musareFooterLogo"
						src="/assets/wordmark.png"
						alt="Musare"
				/></a>
				<p>
					© Copyright Musare 2015 - 2019
				</p>
			</div>
		</div>
	</footer>
</template>

<style lang="scss" scoped>
.content a:not(.button) {
	border: 0;
}

.content {
	display: flex;
	align-items: center;
	flex-direction: column;
}

.footer {
	border-radius: 33% 33% 0% 0% / 7% 7% 0% 0%;
	box-shadow: 0 4px 8px 0 rgba(3, 169, 244, 0.65),
		0 6px 20px 0 rgba(3, 169, 244, 0.4);
	background-color: #ffffff;
	margin-top: 50px;
	padding-bottom: 25px;
	width: 100%;

	.musareFooterLogo {
		display: block;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 15px;
		width: 200px;
	}
}

.icon:hover {
	color: #90298c !important;
}

.nightMode {
	.footer {
		background-color: rgb(51, 51, 51);
		.content {
			color: #e6e6e6;
		}
	}
}
</style>
