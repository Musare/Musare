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
		title: { type: String, default: "Modal" }
	},
	mounted() {
		this.type = this.toCamelCase(this.title);
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
		...mapActions("modalVisibility", ["closeCurrentModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.modal-card-head,
	.modal-card-foot {
		background-color: var(--dark-grey-3);
		border-color: var(--dark-grey-2);
	}

	.modal-card-body {
		background-color: var(--dark-grey-4) !important;
	}

	.modal-card-title {
		color: var(--white);
	}

	p,
	label,
	td {
		color: var(--light-grey-2) !important;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--white) !important;
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

.modal-card-foot {
	*:not(:last-child) {
		margin-right: 10px;
	}

	& > div {
		display: flex;
		flex-grow: 1;
		div:not(:first-of-type) {
			margin-left: 10px;
		}
	}

	.right {
		margin-left: auto;
		justify-content: flex-end;

		*:not(:last-child) {
			margin-right: 5px;
		}
	}
}
</style>
