<template>
	<div class="header">
		{{ title }}	
	</div>
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
	.header {
		width: 100%;
		height: 64px;
		line-height: 64px;
		text-align: center;
		background-color: red;
	}
</style>
