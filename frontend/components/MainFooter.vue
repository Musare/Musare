<template>
	<footer class='footer'>
		<div class='container'>
			<div class='content has-text-centered'>
				<p>
					© Copyright Musare 2015 - 2019
				</p>
				<p>
					<a class='icon' href='https://github.com/Musare/MusareNode' target='_blank' title='GitHub Repository'>
						<img src='/assets/social/github.svg'/>
					</a>
					<a class='icon' href='https://twitter.com/MusareApp' target='_blank' title='Twitter Account'>
						<img src='/assets/social/twitter.svg'/>
					</a>
					<a class='icon' href='https://www.facebook.com/MusareMusic/' target='_blank' title='Facebook Page'>
						<img src='/assets/social/facebook.svg'/>
					</a>
					<a class='icon' href='https://discord.gg/Y5NxYGP' target='_blank' title='Discord Server'>
						<img src='/assets/social/discord.svg'/>
					</a>
				</p>
			</div>
		</div>
	</footer>
</template>

<style lang='scss' scoped>
	.content a:not(.button) { border: 0; }

	.content {
		display: flex;
		align-items: center;
		flex-direction: column;
	}

	.icon:hover { color: #90298C !important; }

	.nightMode {
		.footer {
			background-color: rgb(51, 51, 51);
			.content {
				color: #e6e6e6;
			}
		}

	}
</style>
