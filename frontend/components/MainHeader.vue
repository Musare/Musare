<template>
	<nav class="navbar navbar-default">
		<div class="container-fluid">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
				<a class="navbar-brand" href="#" @click="$parent.goHome()">Musare</a>
			</div>
			<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
				<ul class="nav navbar-nav navbar-right">
					<li><a href="#">The Project</a></li>
					<li><a href="#">Donate</a></li>
					<li><a href="#" data-toggle="modal" data-target="#register">Register</a></li>
				</ul>
			</div>
		</div>
	</nav>
</template>

<style lang="sass" scoped>
	.navbar-default {
		background-color: #424242;
		border: 0;
		border-radius: 0;
		margin: 0;

		.navbar-brand, li a, li a:hover, li a:focus {
			color: #fff;
		}

		li:hover {
			background-color: #393939;
			color: #fff;
		}

		.navbar-toggle, .navbar-toggle:hover, .navbar-toggle:focus {
			border: 0;
			background: 0;

			.icon-bar {
				background-color: #fff;
			}
		}

		.navbar-collapse {
			border: 0;
		}
	}
</style>
