<template>
	<Line
		:ref="`chart-${chartId}`"
		:chart-options="chartOptions"
		:chart-data="data"
		:chart-id="chartId"
		:dataset-id-key="datasetIdKey"
		:plugins="plugins"
		:css-classes="cssClasses"
		:styles="chartStyles"
		:width="width"
		:height="height"
	/>
</template>

<script>
import { Line } from "vue-chartjs";
import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	LineController
} from "chart.js";

ChartJS.register(
	Title,
	Tooltip,
	Legend,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	LineController
);

export default {
	name: "LineChart",
	components: { Line },
	props: {
		chartId: {
			type: String,
			default: "line-chart"
		},
		datasetIdKey: {
			type: String,
			default: "label"
		},
		width: {
			type: Number,
			default: 200
		},
		height: {
			type: Number,
			default: 200
		},
		cssClasses: {
			default: "",
			type: String
		},
		styles: {
			type: Object,
			default: () => {}
		},
		plugins: {
			type: Object,
			default: () => {}
		},
		data: {
			type: Object,
			default: () => {}
		},
		options: {
			type: Object,
			default: () => {}
		}
	},
	computed: {
		chartStyles() {
			return {
				position: "relative",
				height: this.height,
				...this.styles
			};
		},
		chartOptions() {
			return {
				responsive: true,
				maintainAspectRatio: false,
				resizeDelay: 10,
				...this.options
			};
		}
	}
};
</script>
