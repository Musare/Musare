<template>
	<div class="wrapper">
		<h3><strong>404</strong>&nbsp;Not Found</h3>
		<button class="button is-black" @click="$router.go('/')">Back to Home</button>
	</div>
</template>

<style type="scss" scoped>
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

	button {
		margin-top: 15px;
	}
</style>