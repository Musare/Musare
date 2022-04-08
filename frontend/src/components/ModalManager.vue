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
import { defineAsyncComponent } from "vue";

const mapModalComponents = (baseDirectory, map) => {
	const modalComponents = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalComponents[mapKey] = function() {
			return defineAsyncComponent(() => import(`${baseDirectory}/${mapValue}`));
		}
	});
	return modalComponents;
}

export default {
	computed: {
		...mapModalComponents("./modals", {
			"editUser": "EditUser.vue"
		}),
		...mapState("modalVisibility", {
			activeModals: state => state.new.activeModals,
			modalMap: state => state.new.modalMap
		})
	}
};
</script>
