<template>
	<nav class="navbar navbar-default">
		<div class="container-fluid">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#main-navbar" aria-expanded="false">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
				<a class="navbar-brand" href="#" v-link="{ path: '/' }">Musare</a>
			</div>
			<div class="collapse navbar-collapse" id="main-navbar">
				<ul class="nav navbar-nav navbar-right">
					<li><a v-link="{ path: '/admin/queue' }">Admin Queue</a></li>
					<li><a href="#">The Project</a></li>
					<li><a href="#">Donate</a></li>
					<li><a href="#" @click="$parent.logout()">Logout</a></li>
					<li><a href="#" data-toggle="modal" data-target="#register">Register</a></li>
					<li><a href="#" data-toggle="modal" data-target="#login">Login</a></li>
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
		min-height: 64px;

		.navbar-brand, li a, li a:hover, li a:focus {
			line-height: 64px;
			padding: 0px 10px;
			margin: 0px;
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
