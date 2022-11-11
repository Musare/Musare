<script setup lang="ts">
import { storeToRefs } from "pinia";
import { formatDistance } from "date-fns";
import { useUserAuthStore } from "@/stores/userAuth";

const userAuthStore = useUserAuthStore();
const { ban } = storeToRefs(userAuthStore);
</script>

<template>
	<div class="container">
		<page-metadata title="Banned" />
		<i class="material-icons">not_interested</i>
		<h4>
			You are banned for
			<strong>{{
				formatDistance(new Date(Number(ban.expiresAt)), Date.now())
			}}</strong>
		</h4>
		<h5 class="reason">
			<strong>Reason: </strong>
			{{ ban.reason }}
		</h5>
	</div>
</template>

<style lang="less" scoped>
.container {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	height: 100vh;
	max-width: 1000px;
	padding: 0 20px;
}

.reason {
	text-align: justify;
}

i.material-icons {
	cursor: default;
	font-size: 65px;
	color: tomato;
}
</style>
