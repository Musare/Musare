<script setup lang="ts">
defineProps({
	title: { type: String, default: "Sidebar" }
});
</script>

<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div class="sidebar-title">{{ title }}</div>
			<slot name="content" />
		</div>
	</div>
</template>

<style lang="less" scoped>
.inner-wrapper {
	overflow: auto;
	height: 100%;
}

.night-mode {
	.sidebar {
		background-color: var(--dark-grey-3);

		.sidebar-title {
			color: var(--white);
		}

		* {
			color: var(--light-grey-2);
		}
	}
}

.sidebar-title {
	font-family: "Inter", Helvetica, Arial, sans-serif; // Like h1-h6
	background-color: var(--primary-color);
	text-align: center;
	padding: 10px;
	color: var(--white);
	font-weight: 600;
	font-size: 20px;
}
</style>
