<template>
	<span class="material-icons info-icon" :content="tooltip" v-tippy>
		info
	</span>
</template>

<script>
export default {
	props: {
		tooltip: {
			type: String,
			required: true
		}
	}
};
</script>

<style lang="less" scoped>
.material-icons.info-icon {
	font-size: 14px;
	margin: auto 5px;
}
</style>
