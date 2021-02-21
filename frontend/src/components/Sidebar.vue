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
		title: { type: String, default: "Sidebar" }
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
	background-color: var(--primary-color);
	text-align: center;
	padding: 10px;
	color: var(--white);
	font-weight: 600;
	font-size: 20px;
}
</style>
