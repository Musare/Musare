<template>
	<div class="winter-is-coming">
		<div class="snow snow--near"></div>
		<div class="snow snow--near snow--alt"></div>
		<div class="snow snow--mid"></div>
		<div class="snow snow--mid snow--alt"></div>
		<div class="snow snow--far"></div>
		<div class="snow snow--far snow--alt"></div>
	</div>
</template>

<style lang="scss" scoped>
/*Snow courtesy of iamjamie on codepen.io (https://codepen.io/iamjamie/pen/wzbEXG)*/
.winter-is-coming,
.snow {
	z-index: 0;
	pointer-events: none;
}

.winter-is-coming {
	overflow: hidden;
	position: absolute;
	top: 0;
	height: 100%;
	width: 100%;
	max-width: 100%;
	background: transparent;
}

.snow {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	animation: falling linear infinite both;
	transform: translate3D(0, -100%, 0);
}
.snow--near {
	animation-duration: 10s;
	background-image: url("https://dl6rt3mwcjzxg.cloudfront.net/assets/snow/snow-large-075d267ecbc42e3564c8ed43516dd557.png");
	background-size: contain;
}
.snow--near + .snow--alt {
	animation-delay: 5s;
}
.snow--mid {
	animation-duration: 20s;
	background-image: url(https://dl6rt3mwcjzxg.cloudfront.net/assets/snow/snow-medium-0b8a5e0732315b68e1f54185be7a1ad9.png);
	background-size: contain;
}
.snow--mid + .snow--alt {
	animation-delay: 10s;
}
.snow--far {
	animation-duration: 30s;
	background-image: url(https://dl6rt3mwcjzxg.cloudfront.net/assets/snow/snow-small-1ecd03b1fce08c24e064ff8c0a72c519.png);
	background-size: contain;
}
.snow--far + .snow--alt {
	animation-delay: 15s;
}

@keyframes falling {
	0% {
		transform: translate3D(-7.5%, -100%, 0);
	}
	100% {
		transform: translate3D(7.5%, 100%, 0);
	}
}
</style>
