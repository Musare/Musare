<template>
	<div class='sidebar' transition='slide' v-if='$parent.sidebars.playlist'>
		<h1>Hi</h1>
	</div>
</template>

<style type='scss' scoped>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 100vh;
		padding: 30px;
		background-color: #fff;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.slide-transition {
		transition: transform 0.6s ease-in-out;
		transform: translateX(0);
	}

	.slide-enter, .slide-leave {
		transform: translateX(100%);
	}
</style>