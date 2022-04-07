<template>
	<div>
		<div v-for="activeModalUuid in activeModals" :key="activeModalUuid">
			<edit-user
				v-if="modalMap[activeModalUuid] === 'editUser'"
				:modal-uuid="activeModalUuid"
			/>
		</div>
	</div>
</template>

<script>
import { mapState } from "vuex";
import { defineAsyncComponent } from "vue";

export default {
	components: {
		EditUser: defineAsyncComponent(() =>
			import("@/components/modals/EditUser.vue")
		)
	},
	computed: {
		...mapState("modalVisibility", {
			activeModals: state => state.new.activeModals,
			modalMap: state => state.new.modalMap
		})
	}
};
</script>
