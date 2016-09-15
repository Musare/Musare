<template>
	<div class="app">
		<main-header></main-header>
		<home-body v-if="home.visible"></home-body>
		<station-body v-if="station.visible"></station-body>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from './MainHeader.vue'
	import HomeBody from './HomeBody.vue'
	import StationBody from './StationBody.vue'
	import MainFooter from './MainFooter.vue'

	export default {
		data() {
			return {
				home: {
					visible: true
				},
				station: {
					visible: false
				}
			}
		},
		methods: {
			goHome() {
				this.home.visible = true;
				for (let i = 0; i < this.length; i++) {
					this[i].visible = false;
				}
			}
		},
		components: { MainHeader, HomeBody, StationBody, MainFooter },
		events: {
			'switchView': function(hide, show) {
				this[hide].visible = false;
				this[show].visible = true;
			}
		}
	}
</script>

<style lang="sass">
	* { box-sizing: border-box; font-family: Roboto, sans-serif; }
	html {
		width: 100%;
		height: 100%;
		body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
		}
	}
</style>
