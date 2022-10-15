<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import VueJsonPretty from "vue-json-pretty";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import "vue-json-pretty/lib/styles.css";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	requestId: { type: String, required: true },
	removeAction: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const { closeCurrentModal } = useModalsStore();

const loaded = ref(false);
const request = ref({
	_id: null,
	url: null,
	params: {},
	results: [],
	date: null,
	quotaCost: null
});

const remove = () => {
	socket.dispatch(props.removeAction, props.requestId, res => {
		if (res.status === "success") {
			new Toast("API request successfully removed.");
			closeCurrentModal();
		} else {
			new Toast("API request with that ID not found.");
		}
	});
};

onMounted(() => {
	socket.onConnect(() => {
		loaded.value = false;
		socket.dispatch("youtube.getApiRequest", props.requestId, res => {
			if (res.status === "success") {
				request.value = res.data.apiRequest;
				loaded.value = true;

				socket.dispatch(
					"apis.joinRoom",
					`view-api-request.${props.requestId}`
				);
			} else {
				new Toast("API request with that ID not found");
				closeCurrentModal();
			}
		});
	});

	socket.on(
		"event:youtubeApiRequest.removed",
		() => {
			new Toast("This API request was removed.");
			closeCurrentModal();
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	socket.dispatch(
		"apis.leaveRoom",
		`view-api-request.${props.requestId}`,
		() => {}
	);
});
</script>

<template>
	<modal title="View API Request">
		<template #body>
			<div v-if="!loaded" class="vertical-padding">
				<p>Request hasn't loaded yet</p>
			</div>
			<div v-else class="vertical-padding">
				<p><b>ID:</b> {{ request._id }}</p>
				<p><b>URL:</b> {{ request.url }}</p>
				<div>
					<b>Params:</b>
					<ul v-if="request.params">
						<li
							v-for="[paramKey, paramValue] in Object.entries(
								request.params
							)"
							:key="paramKey"
						>
							<b>{{ paramKey }}</b
							>: {{ paramValue }}
						</li>
					</ul>
					<span v-else>None/Not found</span>
				</div>
				<div>
					<b>Results:</b>
					<vue-json-pretty
						:data="request.results"
						:show-length="true"
					></vue-json-pretty>
				</div>
				<p><b>Date:</b> {{ request.date }}</p>
				<p><b>Quota cost:</b> {{ request.quotaCost }}</p>
			</div>
		</template>
		<template #footer>
			<quick-confirm v-if="removeAction" @confirm="remove()">
				<a class="button is-danger"> Remove API request</a>
			</quick-confirm>
		</template>
	</modal>
</template>

<style lang="less" scoped>
ul {
	list-style-type: disc;
	padding-left: 20px;
}
</style>
