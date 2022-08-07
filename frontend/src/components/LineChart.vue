<script setup lang="ts">
import { PropType, computed } from "vue";
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
	LineController,
	Plugin
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

const props = defineProps({
	chartId: { type: String, default: "line-chart" },
	datasetIdKey: { type: String, default: "label" },
	width: { type: Number, default: 200 },
	height: { type: Number, default: 200 },
	cssClasses: { default: "", type: String },
	styles: {
		type: Object as PropType<Partial<CSSStyleDeclaration>>,
		default: () => {}
	},
	plugins: { type: Object as PropType<Plugin<"line">[]>, default: () => {} },
	data: { type: Object as PropType<any>, default: () => {} },
	options: { type: Object, default: () => {} }
});

const chartStyles = computed(() => ({
	position: "relative",
	height: `${props.height}px`,
	...props.styles
}));
const chartOptions = computed(() => ({
	responsive: true,
	maintainAspectRatio: false,
	resizeDelay: 10,
	...props.options
}));
</script>

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
