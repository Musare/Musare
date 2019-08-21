<template>
	<div class="modal" :class="{ 'is-active': isModalActive }">
		<div class="modal-background" />
		<div class="modal-card">
			<header class="modal-card-head">
				<button class="delete" @click="toggleModal()" />
			</header>
			<section class="modal-card-body">
				<h5>
					Musare doesn't work very well on mobile right now, we are
					working on this!
				</h5>
			</section>
		</div>
	</div>
</template>

<script>
export default {
	data() {
		return {
			isModalActive: false
		};
	},
	mounted() {
		if (!localStorage.getItem("mobileOptimization")) {
			this.toggleModal();
			localStorage.setItem("mobileOptimization", true);
		}
	},
	methods: {
		toggleModal() {
			this.isModalActive = !this.isModalActive;
			if (this.isModalActive) {
				setTimeout(() => {
					this.isModalActive = false;
				}, 4000);
			}
		}
	},
	events: {
		closeModal() {
			this.isModalActive = false;
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

@media (min-width: 735px) {
	.modal {
		display: none;
	}
}

.modal-card {
	margin: 0 20px !important;
}

.modal-card-head {
	border-bottom: none;
	background-color: ghostwhite;
	padding: 15px;
}

.delete {
	background: transparent;
	right: 0;
	position: absolute;
	&:hover {
		background: transparent;
	}

	&:before,
	&:after {
		background-color: #bbb;
	}
}
</style>
