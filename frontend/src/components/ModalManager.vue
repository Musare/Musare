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
			editUser: "EditUser.vue",
			login: "Login.vue",
			register: "Register.vue",
			whatIsNew: "WhatIsNew.vue",
			createStation: "CreateStation.vue",
			editNews: "EditNews.vue",
			manageStation: "ManageStation/index.vue",
			importPlaylist: "ImportPlaylist.vue",
			editPlaylist: "EditPlaylist/index.vue",
			createPlaylist: "CreatePlaylist.vue",
			report: "Report.vue",
			viewReport: "ViewReport.vue",
			bulkActions: "BulkActions.vue",
			viewPunishment: "ViewPunishment.vue",
			removeAccount: "RemoveAccount.vue",
			importAlbum: "ImportAlbum.vue"
		}),
		...mapState("modalVisibility", {
			activeModals: state => state.new.activeModals,
			modalMap: state => state.new.modalMap
		})
	}
};
</script>
