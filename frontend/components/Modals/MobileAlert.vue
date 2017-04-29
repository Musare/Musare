<template>
	<div class='modal' :class='{ "is-active": isModalActive }'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<h5>Musare doesn't work very well on mobile right now, we are working on this!</h5>
			</section>
		</div>
	</div>
</template>

<script>
	import io from '../../io';

	export default {
		data() {
			return {
				isModalActive: false
			}
		},
		ready: function () {
			let _this = this;
			if (!localStorage.getItem('mobileOptimization')) {
				this.toggleModal();
				localStorage.setItem('mobileOptimization', true);
			}
		},
		methods: {
			toggleModal: function () {
				let _this = this;
				_this.isModalActive = !_this.isModalActive;
				if (_this.isModalActive) {
					setTimeout(() => {
						this.isModalActive = false;
					}, 4000);
				}
			}
		},
		events: {
			closeModal: function() {
				this.isModalActive = false;
			}
		}
	}
</script>

<style lang='scss' scoped>
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
		&:hover { background: transparent; }

		&:before, &:after { background-color: #bbb; }
	}
</style>
