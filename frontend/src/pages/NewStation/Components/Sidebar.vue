<template>
	<nav class="sidebar">
		<slot />
	</nav>
</template>

<style lang="less" scoped>
.sidebar {
	display: flex;
	flex: 0 0 350px;
	flex-direction: column;
	min-height: 100%;
	max-height: calc(100vh - 64px);
	background-color: var(--white);
	padding: 20px;
	gap: 20px;
	box-shadow: 0px 0px 2px 1px rgba(10, 10, 10, 0.1);
	overflow: auto;

	:deep(&__divider) {
		background-color: var(--light-grey-2);
		border-radius: 10px;
		height: 5px;
		flex-shrink: 0;
	}
}
</style>
