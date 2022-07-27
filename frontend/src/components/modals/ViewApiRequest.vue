<script setup lang="ts">
import { useStore } from "vuex";
import { ref, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import VueJsonPretty from "vue-json-pretty";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalState, useModalActions } from "@/vuex_helpers";
import ws from "@/ws";
import "vue-json-pretty/lib/styles.css";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = useWebsocketsStore();

const { requestId, request, removeAction } = useModalState(
	"modals/viewApiRequest/MODAL_UUID",
	{
		modalUuid: props.modalUuid
	}
);

const { viewApiRequest } = useModalActions(
	"modals/viewApiRequest/MODAL_UUID",
	["viewApiRequest"],
	{
		modalUuid: props.modalUuid
	}
);

const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const loaded = ref(false);

const init = () => {
	loaded.value = false;
	socket.dispatch("youtube.getApiRequest", requestId, res => {
		if (res.status === "success") {
			const { apiRequest } = res.data;
			viewApiRequest(apiRequest);
			loaded.value = true;

			socket.dispatch("apis.joinRoom", `view-api-request.${requestId}`);

			socket.on(
				"event:youtubeApiRequest.removed",
				() => {
					new Toast("This API request was removed.");
					closeCurrentModal();
				},
				{ modalUuid: props.modalUuid }
			);
		} else {
			new Toast("API request with that ID not found");
			closeCurrentModal();
		}
	});
};

const remove = () => {
	if (removeAction)
		socket.dispatch(removeAction, requestId, res => {
			if (res.status === "success") {
				new Toast("API request successfully removed.");
				closeCurrentModal();
			} else {
				new Toast("API request with that ID not found.");
			}
		});
};

onMounted(() => {
	ws.onConnect(init);
});

onBeforeUnmount(() => {
	socket.dispatch(
		"apis.leaveRoom",
		`view-api-request.${requestId}`,
		() => {}
	);
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "viewApiRequest", props.modalUuid]);
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
