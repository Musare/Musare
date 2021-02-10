<script>
export default {
	methods: {
		showTab(tab) {
			const queries = this.$route.query.tab
				? this.$route.query
				: { ...this.$route.query, tab };

			queries.tab = tab;
			this.$route.query.tab = tab;
			this.tab = this.$route.query.tab;

			// eslint-disable-next-line no-restricted-globals
			history.pushState(
				{},
				null,
				`${this.$route.path}?${Object.keys(queries)
					.map(key => {
						return `${encodeURIComponent(key)}=${encodeURIComponent(
							queries[key]
						)}`;
					})
					.join("&")}`
			);
		}
	}
};
</script>
