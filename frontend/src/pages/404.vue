<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
</script>

<template>
	<div>
		<main-header />
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

<style lang="less" scoped>
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
