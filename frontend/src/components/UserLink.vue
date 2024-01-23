<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModels } from "@/composables/useModels";

const props = defineProps({
	userId: { type: String, default: "" },
	link: { type: Boolean, default: true }
});

const user = ref();

const { socket } = useWebsocketsStore();
const { loadModels } = useModels();

onMounted(() => {
	socket.onConnect(async () => {
		const [model] = await loadModels("minifiedUsers", props.userId);

		if (model) user.value = model;
	});
});
</script>

<template>
	<router-link
		v-if="$props.link && user?.username"
		:to="{ path: `/u/${user.username}` }"
		:title="userId"
	>
		{{ user.name }}
	</router-link>
	<span v-else :title="userId">
		{{ user?.name ?? "Unknown" }}
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
