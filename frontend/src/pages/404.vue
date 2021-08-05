<template>
	<div>
		<div class="wrapper">
			<page-metadata title="404" />

			<h3><strong>404</strong>&nbsp;Not Found</h3>
			<router-link class="button is-dark" to="/">
				<i class="material-icons icon-with-button">undo</i>
				Back to Home
			</router-link>
		</div>
		<main-footer />
	</div>
</template>

<script>
import MainFooter from "@/components/layout/MainFooter.vue";

export default {
	components: { MainFooter }
};
</script>

<style lang="scss" scoped>
.wrapper {
	min-height: calc(100vh - 100px);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

a {
	margin-top: 15px;
}
</style>
