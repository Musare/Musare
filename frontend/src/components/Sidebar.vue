<template>
	<div class="sidebar" transition="slide">
		<div class="inner-wrapper">
			<div class="sidebar-title">{{ title }}</div>
			<slot name="content" />
		</div>
	</div>
</template>

<script>
export default {
	props: {
		title: { type: String }
	}
};
</script>

<style lang="scss" scoped>
@import "../styles/global.scss";

.inner-wrapper {
	overflow: auto;
	height: 100%;
}

.night-mode {
	.sidebar {
		background-color: $night-mode-secondary;

		.sidebar-title {
			color: #fff;
		}

		* {
			color: #ddd;
		}
	}
}

.sidebar-title {
	background-color: rgb(3, 169, 244);
	text-align: center;
	padding: 10px;
	color: $white;
	font-weight: 600;
	font-size: 20px;
}
</style>
