import { ref } from "vue";
import { useRoute } from "vue-router";

export const useTabQueryHandler = defaultTab => {
	const route = useRoute();

	const tab = ref(defaultTab);

	const showTab = newTab => {
		const queries = route.query.tab
			? route.query
			: { ...route.query, tab: newTab };

		queries.tab = newTab;
		route.query.tab = newTab;
		tab.value = route.query.tab;

		// eslint-disable-next-line no-restricted-globals
		window.history.pushState(
			{},
			null,
			`${route.path}?${Object.keys(queries)
				.map(
					key =>
						`${encodeURIComponent(key)}=${encodeURIComponent(
							queries[key]
						)}`
				)
				.join("&")}`
		);
	};

	return {
		tab,
		showTab
	};
};
