<template>
	<nav class="navbar navbar-default" role="navigation">
		<div class="container-fluid">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#station-navbar" aria-expanded="false">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
			</div>
			<div class="collapse navbar-collapse" id="station-navbar">
				<ul class="nav navbar-nav">
					<li class="pull-left"><a href="#" v-link="{ path: '/' }"><i class="material-icons left">home</i></a></li>
					<li class="pull-left"><a href="#" data-toggle="modal" data-target="#queue"><i class="material-icons left">playlist_add</i></a></li>
					<li class="pull-left"><a href="#"><i class="material-icons left">flag</i></a></li>
					<li class="pull-left"><a href="#"><i class="material-icons left">skip_next</i></a></li>
					<li class="pull-center"><a href="#">Station Name</a></li>
					<li class="pull-right"><a href="#"><i class="material-icons">queue_music</i></a></li>
					<li class="pull-right"><a href="#"><i class="material-icons">chat</i></a></li>
					<li class="pull-right"><a href="#"><i class="material-icons">people</i></a></li>
				</ul>
			</div>
		</div>
	</nav>
</template>

<style lang="sass" scoped>
	.navbar-default {
		background-color: #0091ea;
		border: 0;
		border-radius: 0;
		margin: 0;
		min-height: 64px;

		.navbar-nav {
			width: 100%;
			text-align: center;

			li a, li a:hover, li a:focus {
				padding: 0px 10px;
				margin: 0px;
				color: #fff;
			}

			li.pull-center a {
				line-height: 64px;
			}

			li.pull-right, li.pull-left {
				height: 64px;
				display: flex;
				align-items: center;
			}

			li {
				float: none;
				display: inline-block;

				i {
					font-size: 40px;
				}

				&:hover {
					background-color: rgba(0, 0, 0, 0.1);
					color: #fff;
				}
			}
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
