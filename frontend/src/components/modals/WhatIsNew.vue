<template>
	<div
		v-if="news !== null"
		class="modal"
		:class="{ 'is-active': isModalActive }"
	>
		<div class="modal-background" />
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">
					<strong>{{ news.title }}</strong>
					({{ formatDate(news.createdAt) }})
				</p>
				<button class="delete" @click="toggleModal()" />
			</header>
			<section class="modal-card-body">
				<div class="content">
					<p>{{ news.markdown }}</p>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
import { format } from "date-fns";
import { mapGetters } from "vuex";

export default {
	data() {
		return {
			isModalActive: false,
			news: null
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		this.socket.dispatch("news.newest", res => {
			if (res.status !== "success") return;

			const { news } = res.data;

			this.news = news;
			if (this.news && localStorage.getItem("firstVisited")) {
				if (localStorage.getItem("whatIsNew")) {
					if (
						parseInt(localStorage.getItem("whatIsNew")) <
						news.createdAt
					) {
						this.toggleModal();
						localStorage.setItem("whatIsNew", news.createdAt);
					}
				} else {
					if (
						parseInt(localStorage.getItem("firstVisited")) <
						news.createdAt
					)
						this.toggleModal();
					localStorage.setItem("whatIsNew", news.createdAt);
				}
			} else if (!localStorage.getItem("firstVisited"))
				localStorage.setItem("firstVisited", Date.now());
		});
	},
	methods: {
		toggleModal() {
			this.isModalActive = !this.isModalActive;
		},
		formatDate: unix => {
			return format(unix, "dd-MM-yyyy");
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
.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body {
		background-color: var(--dark-grey-3);
	}

	strong,
	p {
		color: var(--light-grey-2);
	}
}

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
	&:hover {
		background: transparent;
	}

	&:before,
	&:after {
		background-color: var(--light-grey-3);
	}
}

.sect {
	div[class^="sect-head"],
	div[class*=" sect-head"] {
		padding: 12px;
		text-transform: uppercase;
		font-weight: bold;
		color: var(--white);
	}

	.sect-head-features {
		background-color: dodgerblue;
	}
	.sect-head-improvements {
		background-color: seagreen;
	}
	.sect-head-bugs {
		background-color: brown;
	}
	.sect-head-upcoming {
		background-color: mediumpurple;
	}

	.sect-body {
		padding: 15px 25px;

		li {
			list-style-type: disc;
		}
	}
}
</style>
