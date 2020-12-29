<script>
export default {
	data() {
		return {
			position: 1,
			maxPosition: 1,
			gettingSet: false,
			loadAllSongs: false,
			interval: null
		};
	},
	computed: {
		setsLoaded() {
			return this.position - 1;
		},
		maxSets() {
			return this.maxPosition - 1;
		}
	},
	unmounted() {
		clearInterval(this.interval);
	},
	methods: {
		handleScroll() {
			const scrollPosition = document.body.clientHeight + window.scrollY;
			const bottomPosition = document.body.scrollHeight;

			if (this.loadAllSongs) return false;

			if (scrollPosition + 400 >= bottomPosition) this.getSet();

			return this.maxPosition === this.position;
		},
		loadAll() {
			this.loadAllSongs = true;
			this.interval = setInterval(() => {
				if (this.loadAllSongs && this.maxPosition > this.position)
					this.getSet();
				else {
					clearInterval(this.interval);
					this.loadAllSongs = false;
				}
			}, 500);
		}
	}
};
</script>
