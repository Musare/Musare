<template>
	<div class="footer">
		{{ title }}	
	</div>
</template>

<script>
	export default {
		data() {
			return {
				title: "MusareNode is using the newest of technologies (;"
			}
		}
	}
</script>

<style lang="sass" scoped>
	.footer	{
		width: 100%;
		height: 64px;
		line-height: 64px;
		text-align: center;
		background-color: blue;
	}
</style>
