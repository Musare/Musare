<script setup lang="ts">
defineProps({
	tooltip: { type: String, required: true }
});
</script>

<template>
	<span class="material-icons info-icon" :content="tooltip" v-tippy>
		info
	</span>
</template>

<style lang="less" scoped>
.material-icons.info-icon {
	font-size: 14px;
	margin: auto 5px;
	cursor: help;
}
</style>
