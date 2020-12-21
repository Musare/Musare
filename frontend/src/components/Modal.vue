<template>
	<div class="modal is-active">
		<div class="modal-background" @click="closeCurrentModal()" />
		<div class="modal-card">
			<header class="modal-card-head">
				<h2 class="modal-card-title is-marginless">
					{{ title }}
				</h2>
				<button class="delete" @click="closeCurrentModal()" />
			</header>
			<section class="modal-card-body">
				<slot name="body" />
			</section>
			<footer class="modal-card-foot" v-if="$slots['footer'] != null">
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
				.replace(/ (.)/g, $1 => $1.toUpperCase())
				.replace(/ /g, "");
		},
		...mapActions("modals", ["closeCurrentModal"])
	},
	mounted() {
		this.type = this.toCamelCase(this.title);
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.modal-card-head,
	.modal-card-foot {
		background-color: #222;
		border-color: #333;
	}

	.modal-card-body {
		background-color: #111 !important;
	}

	.modal-card-title {
		color: #fff;
	}

	p,
	label,
	td,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: #ddd !important;
	}
}

.modal-card {
	width: 800px;
	font-size: 16px;
}

p {
	font-size: 17px;
}

.modal-card-title {
	font-size: 27px;
}
</style>