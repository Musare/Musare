<template>
	<div class='modal' :class='{ "is-active": isModalActive }' v-if="news !== null">
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'><strong>{{ news.title }}</strong> ({{ formatDate(news.createdAt) }})</p>
				<button class='delete' @click='toggleModal()'></button>
			</header>
			<section class='modal-card-body'>
				<div class='content'>
					<p>{{ news.description }}</p>
				</div>
				<div class='sect' v-show='news.features.length > 0'>
					<div class='sect-head-features'>The features are so great</div>
					<ul class='sect-body'>
						<li v-for='li in news.features'>{{ li }}</li>
					</ul>
				</div>
				<div class='sect' v-show='news.improvements.length > 0'>
					<div class='sect-head-improvements'>Improvements</div>
					<ul class='sect-body'>
						<li v-for='li in news.improvements'>{{ li }}</li>
					</ul>
				</div>
				<div class='sect' v-show='news.bugs.length > 0'>
					<div class='sect-head-bugs'>Bugs Smashed</div>
					<ul class='sect-body'>
						<li v-for='li in news.bugs'>{{ li }}</li>
					</ul>
				</div>
				<div class='sect' v-show='news.upcoming.length > 0'>
					<div class='sect-head-upcoming'>Coming Soon to a Musare near you</div>
					<ul class='sect-body'>
						<li v-for='li in news.upcoming'>{{ li }}</li>
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
				isModalActive: false,
				news: null
			}
		},
		ready: function () {
			let _this = this;
			let socketInterval = setInterval(() => {
				if (!!_this.$parent.socket) {
					_this.socket = _this.$parent.socket;
					_this.socket.emit('news.newest', res => {
						_this.news = res.data;
						if (_this.news) {
							if (localStorage.getItem('whatIsNew')) {
								if (parseInt(localStorage.getItem('whatIsNew')) < res.data.createdAt) {
									this.toggleModal();
									localStorage.setItem('whatIsNew', res.data.createdAt);
								}
							} else {
								this.toggleModal();
								localStorage.setItem('whatIsNew', res.data.createdAt);
							}
						}
					});
					clearInterval(socketInterval);
				}
			}, 100);
		},
		methods: {
			toggleModal: function () {
				this.isModalActive = !this.isModalActive;
			},
			formatDate: unix => {
				return moment(unix).format('DD-MM-YYYY');
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
	.modal-card-head {
		border-bottom: none;
		background-color: ghostwhite;
		padding: 15px;
	}

	.modal-card-title { font-size: 14px; }

	.delete {
		background: transparent;
		&:hover { background: transparent; }

		&:before, &:after { background-color: #bbb; }
	}

	.sect {
		div[class^='sect-head'], div[class*=' sect-head']{
			padding: 12px;
			text-transform: uppercase;
			font-weight: bold;
			color: #fff;
		}

		.sect-head-features { background-color: dodgerblue; }
		.sect-head-improvements { background-color: seagreen; }
		.sect-head-bugs { background-color: brown; }
		.sect-head-upcoming { background-color: mediumpurple; }

		.sect-body {
			padding: 15px 25px;

			li { list-style-type: disc; }
		}
	}
</style>
