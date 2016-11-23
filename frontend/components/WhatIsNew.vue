<template>
	<div class="modal" :class="{ 'is-active': isModalActive }">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title"><strong>What's new</strong> (Nov 23, 2016)</p>
				<button class="delete" @click="toggleModal()"></button>
			</header>
			<section class="modal-card-body">
				<div class="sect">
					<div class="sect-head-success">Improvements</div>
					<ul class="sect-body">
						<li>Lorem ipsum dolor sit amet, consectetur adipisicing.</li>
						<li>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium cum molestias minima saepe, iure aperiam quo necessitatibus quod?</li>
						<li>Lorem ipsum dolor sit amet, consectetur.</li>
					</ul>
				</div>
				<div class="sect">
					<div class="sect-head-bugs">Bugs Smashed</div>
					<ul class="sect-body">
						<li>Lorem ipsum dolor sit amet, consectetur adipisicing.</li>
						<li>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium cum molestias minima saepe, iure aperiam quo necessitatibus quod?</li>
						<li>Lorem ipsum dolor sit amet, consectetur.</li>
					</ul>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				isModalActive: false
			}
		},
		ready: function () {
			// TODO: Setup so we can call this modal from anywhere and we can specify the values of everything when calling it. This should also get the improvements, bugs, date etc. to include in the modal.
			// In future we will receive a date, if that date is newer than the one stored in localStorage, we will show modal, and then save that date to localStorage (how we keep track of which modal has been showed)
			const data = {
				date: 1479935887670
			};

			if (localStorage.getItem("whatIsNew")) {
				if (localStorage.getItem("whatIsNew") < data.date) this.isModalActive = true;
			} else {
				localStorage.setItem("whatIsNew", data.date);
				this.isModalActive = true;
			}
		},
		methods: {
			toggleModal: function () {
				this.isModalActive = !this.isModalActive;
			}
		}
	}
</script>

<style lang="scss" scoped>
	.modal-card-head {
		border-bottom: none;
		background-color: ghostwhite;
		padding: 15px;
	}

	.modal-card-title {
		font-size: 14px;
	}

	.delete {
		background: transparent;
		&:hover { background: transparent; }

		&:before, &:after {
			background-color: #bbb;
		}
	}

	.sect {
		div[class^='sect-head'], div[class*=' sect-head']{
			padding: 15px;
			text-transform: uppercase;
			font-weight: bold;
			color: #fff;
		}

		.sect-head-success { background-color: seagreen; }
		.sect-head-bugs { background-color: brown; }

		.sect-body {
			padding: 25px;

			li {
				list-style-type: disc;
			}
		}
	}
</style>
