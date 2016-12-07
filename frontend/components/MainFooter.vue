<template>
	<footer class="footer">
		<div class="container">
			<div class="content has-text-centered">
				<p>
					© Copyright Musare 2015 - {{ new Date().getFullYear() }}
				</p>
				<p>
					<a class="icon" href="https://github.com/musare/musarenode">
						<i class="fa fa-github"></i>
					</a>
				</p>
			</div>
		</div>
	</footer>
</template>

<style lang="scss" scoped>
	.content a:not(.button) {
		border: 0;
	}

	.icon:visited {
		color: #4a4a4a !important;
	}
</style>
