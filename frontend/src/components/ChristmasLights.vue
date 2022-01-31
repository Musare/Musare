<template>
	<div
		:class="{
			'christmas-lights': true,
			loggedIn,
			'christmas-lights-small': small
		}"
	>
		<div class="christmas-wire"></div>
		<template v-for="n in lights" :key="n">
			<span class="christmas-light"></span>
			<div class="christmas-wire"></div>
		</template>
	</div>
</template>

<script>
import { mapState } from "vuex";

export default {
	props: {
		small: { type: Boolean, default: false },
		lights: { type: Number, default: 1 }
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn
		})
	},

	async mounted() {
		this.christmas = await lofig.get("siteSettings.christmas");
	}
};
</script>

<style lang="less" scoped>
.christmas-mode {
	.christmas-lights {
		position: absolute;
		width: 100%;
		height: 64px;
		left: 0;
		top: 64px;
		display: flex;
		justify-content: space-around;
		overflow: hidden;
		pointer-events: none;

		&.christmas-lights-small {
			.christmas-light {
				height: 28px;
				width: 10px;

				&::before {
					width: 10px;
					height: 10px;
				}
			}
		}

		.christmas-light {
			height: 34px;
			width: 12px;
			border-top-left-radius: 50%;
			border-top-right-radius: 50%;
			border-bottom-left-radius: 50%;
			border-bottom-right-radius: 50%;
			z-index: 2;
			animation: christmas-lights 30s ease infinite;

			&::before {
				content: "";
				display: block;
				width: 12px;
				height: 12px;
				background-color: rgb(6, 49, 19);
				border-top-left-radius: 25%;
				border-top-right-radius: 25%;
				border-bottom-left-radius: 25%;
				border-bottom-right-radius: 25%;
			}

			&:nth-of-type(1) {
				transform: rotate(5deg);
			}

			&:nth-of-type(2) {
				transform: rotate(-7deg);
				animation-delay: -5s;
			}

			&:nth-of-type(3) {
				transform: rotate(3deg);
				animation-delay: -15s;
			}

			&:nth-of-type(4) {
				transform: rotate(10deg);
				animation-delay: -10s;
			}

			&:nth-of-type(5) {
				transform: rotate(-3deg);
				animation-delay: -20s;
			}

			&:nth-of-type(6) {
				transform: rotate(8deg);
				animation-delay: -65s;
			}

			&:nth-of-type(7) {
				transform: rotate(-1deg);
				animation-delay: -30s;
			}

			&:nth-of-type(8) {
				transform: rotate(-4deg);
				animation-delay: -75s;
			}

			&:nth-of-type(9) {
				transform: rotate(3deg);
				animation-delay: -60s;
			}

			&:nth-of-type(10) {
				transform: rotate(-10deg);
				animation-delay: -50s;
			}

			&:nth-of-type(11) {
				transform: rotate(7deg);
				animation-delay: -35s;
			}

			&:nth-of-type(12) {
				transform: rotate(-3deg);
				animation-delay: -70s;
			}

			&:nth-of-type(13) {
				transform: rotate(2deg);
				animation-delay: -25s;
			}

			&:nth-of-type(14) {
				transform: rotate(9deg);
				animation-delay: -45s;
			}

			&:nth-of-type(15) {
				transform: rotate(-5deg);
				animation-delay: -40s;
			}
		}

		.christmas-wire {
			flex: 1;
			margin-bottom: 15px;
			z-index: 1;

			border-top: 2px solid var(--primary-color);
			border-radius: 50%;
			margin-left: -7px;
			margin-right: -7px;
			transform: scaleY(-1);
			transform-origin: 0% 20%;
		}
	}
}

@keyframes christmas-lights {
	0% {
		background-color: magenta;
		box-shadow: 0 5px 15px 3px rgba(255, 0, 255, 0.55);
	}
	17% {
		background-color: cyan;
		box-shadow: 0 5px 15px 3px rgba(0, 255, 255, 0.55);
	}
	34% {
		background-color: lime;
		box-shadow: 0 5px 15px 3px rgba(0, 255, 0, 0.55);
	}
	51% {
		background-color: yellow;
		box-shadow: 0 5px 15px 3px rgba(255, 255, 0, 0.55);
	}
	68% {
		background-color: orange;
		box-shadow: 0 5px 15px 3px rgba(255, 165, 0, 0.55);
	}
	85% {
		background-color: red;
		box-shadow: 0 5px 15px 3px rgba(255, 0, 0, 0.55);
	}
	100% {
		background-color: magenta;
		box-shadow: 0 5px 15px 3px rgba(255, 0, 255, 0.55);
	}
}
</style>
