<script>
export default {
	data() {
		return {
			position: 1,
			maxPosition: 1,
			gettingSet: false,
			loadAllSongs: false
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
			this.getSet();
		}
	}
};
</script>
