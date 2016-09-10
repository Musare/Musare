<template>
	<div class="app">
		<component-header></component-header>
		<component-body></component-body>
		<component-footer></component-footer>
	</div>
</template>

<script>
	// TODO: Implement these files
	import ComponentHeader from './MusareHeader.vue'
	import ComponentBody from './MusareBody.vue'
	import ComponentFooter from './MusareFooter.vue'

	export default {
		data() {
			return {}
		},
		components: { ComponentHeader, ComponentBody, ComponentFooter }
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
