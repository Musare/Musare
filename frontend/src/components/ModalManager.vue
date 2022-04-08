<template>
	<div>
		<div v-for="activeModalUuid in activeModals" :key="activeModalUuid">
			<component
				:is="this[modalMap[activeModalUuid]]"
				:modal-uuid="activeModalUuid"
			/>
		</div>
	</div>
</template>

<script>
import { mapState } from "vuex";

import { mapModalComponents } from "@/vuex_helpers";

export default {
	computed: {
		...mapModalComponents("./components/modals", {
			editUser: "EditUser.vue"
		}),
		...mapState("modalVisibility", {
			activeModals: state => state.new.activeModals,
			modalMap: state => state.new.modalMap
		})
	}
};
</script>
