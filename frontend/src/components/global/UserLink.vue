<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useUserAuthStore } from "@/stores/userAuth";

const props = defineProps({
	userId: { type: String, default: "" },
	link: { type: Boolean, default: true }
});

const user = ref({
	name: "Unknown",
	username: null
});

const { getBasicUser } = useUserAuthStore();

onMounted(() => {
	getBasicUser(props.userId).then(basicUser => {
		if (basicUser) {
			const { name, username } = basicUser;
			user.value = {
				name,
				username
			};
		}
	});
});
</script>

<template>
	<router-link
		v-if="$props.link && user.username"
		:to="{ path: `/u/${user.username}` }"
		:title="userId"
	>
		{{ user.name }}
	</router-link>
	<span v-else :title="userId">
		{{ user.name }}
	</span>
</template>

<style lang="less" scoped>
a {
	color: var(--primary-color);
	&:hover,
	&:focus {
		filter: brightness(90%);
	}
}
</style>
