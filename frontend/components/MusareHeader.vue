<template>
	<header>
		<div class="header">
			<div class="title">Musare</div>
			<div class="link">Account&nbsp;&nbsp;&nbsp;&nbsp;<i class="fa fa-caret-down" aria-hidden="true"></i></div>
			<div class="link">Donate</div>
			<div class="link">The Project</div>
		</div>
	</header>
</template>

<script>
	export default {
		data() {
			return {
				title: "Musare ;)"
			}
		}
	}
</script>

<style lang="sass" scoped>
	header {
		width: 100%;
		height: 64px;
		line-height: 64px;
		text-align: center;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.header {
		width: 100%;
		height: 100%;
		background-color: #424242;

		.title {
			float: left;
			height: 100%;
			color: white;
			padding: 0 16px 0 16px;
			font-weight: 300;
			font-size: 32px;
			cursor: pointer;
		}

		.link {
			z-index: 101;
			position: relative;
			float: right;
			height: 100%;
			color: white;
			padding: 0 16px 0 16px;
			cursor: pointer;
		}

		.title:hover, .link:hover {
			cursor: pointer;
			background-color: #393939;
		}
	}
</style>
