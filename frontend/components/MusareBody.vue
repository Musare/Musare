<template>
	<div class="body">
		{{ title }}
	</div>
</template>

<script>
	export default {
		data() {
			return {
				title: "This is thee body"
			}
		}
	}
</script>

<style lang="sass" scoped>
	.body {
		width: 100%;
		height: 256px;
		line-height: 256px;
		text-align: center;
		background-color: green;
	}
</style>
