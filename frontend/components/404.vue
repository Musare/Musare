<template>
	<div class="wrapper">
		<metadata title="404" />

		<h3><strong>404</strong>&nbsp;Not Found</h3>
		<router-link class="button is-black" to="/">
			Back to Home
		</router-link>
	</div>
</template>

<style lang="scss" scoped>
@import "styles/global.scss";

* {
	margin: 0;
	padding: 0;
}

.wrapper {
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

a {
	margin-top: 15px;
}
</style>
