<template>
	<div class="modal is-active">
		<div class="modal-background" />
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">
					{{ title }}
				</p>
				<button class="delete" @click="closeCurrentModal()" />
			</header>
			<section class="modal-card-body">
				<slot name="body" />
			</section>
			<!-- v-if="_slotContents['footer'] != null" -->
			<footer class="modal-card-foot">
				<slot name="footer" />
			</footer>
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";

export default {
	props: {
		title: { type: String }
	},
	methods: {
		toCamelCase: str => {
			return str
				.toLowerCase()
				.replace(/[-_]+/g, " ")
				.replace(/[^\w\s]/g, "")
				.replace(/ (.)/g, function($1) {
					return $1.toUpperCase();
				})
				.replace(/ /g, "");
		},
		...mapActions("modals", ["closeCurrentModal"])
	},
	mounted: function() {
		this.type = this.toCamelCase(this.title);
	}
};
</script>
