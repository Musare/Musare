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
	</modal>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import Toast from "toasters";

import ws from "@/ws";
import { mapModalState, mapModalActions } from "@/vuex_helpers";

export default {
	components: {
		VueJsonPretty
	},
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			loaded: false
		};
	},
	computed: {
		...mapModalState("modals/viewApiRequest/MODAL_UUID", {
			requestId: state => state.requestId,
			request: state => state.request
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	beforeUnmount() {
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule([
			"modals",
			"viewApiRequest",
			this.modalUuid
		]);
	},
	methods: {
		init() {
			this.loaded = false;
			this.socket.dispatch(
				"youtube.getApiRequest",
				this.requestId,
				res => {
					if (res.status === "success") {
						const { apiRequest } = res.data;
						this.viewApiRequest(apiRequest);
						this.loaded = true;
					} else {
						new Toast("API request with that ID not found");
						this.closeCurrentModal();
					}
				}
			);
		},
		...mapModalActions("modals/viewApiRequest/MODAL_UUID", [
			"viewApiRequest"
		]),
		...mapActions("modalVisibility", ["closeCurrentModal"])
	}
};
</script>

<style lang="less" scoped>
ul {
	list-style-type: disc;
	padding-left: 20px;
}
</style>
