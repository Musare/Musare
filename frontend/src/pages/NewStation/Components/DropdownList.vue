<script lang="ts" setup>
import { ref, onBeforeUnmount, computed } from "vue";
import {
	useFloating,
	offset,
	flip,
	shift,
	autoUpdate,
	arrow
} from "@floating-ui/vue";

const reference = ref();
const floating = ref();
const floatingArrow = ref();
const isOpen = ref(false);

const { placement, floatingStyles, middlewareData } = useFloating(
	reference,
	floating,
	{
		placement: "left",
		middleware: [
			offset(10),
			flip(),
			shift(),
			arrow({ element: floatingArrow })
		],
		whileElementsMounted: autoUpdate
	}
);

const arrowStyles = computed(() => {
	const staticStyles = {
		left:
			middlewareData.value?.arrow?.x != null
				? `${middlewareData.value.arrow.x}px`
				: "",
		top:
			middlewareData.value?.arrow?.y != null
				? `${middlewareData.value.arrow.y}px`
				: ""
	};

	switch (placement.value) {
		case "left":
			return {
				...staticStyles,
				right: "-8px"
			};
		case "right":
			return {
				...staticStyles,
				left: "-8px"
			};
		case "top":
			return {
				...staticStyles,
				bottom: "-8px"
			};
		case "bottom":
			return {
				...staticStyles,
				top: "-8px"
			};
		default:
			return {};
	}
});

const collapse = () => {
	isOpen.value = false;

	// eslint-disable-next-line no-use-before-define
	document.removeEventListener("click", handleClickOutside);
};

const expand = () => {
	isOpen.value = true;

	// eslint-disable-next-line no-use-before-define
	document.addEventListener("click", handleClickOutside);
};

const toggle = () => {
	if (isOpen.value) collapse();
	else expand();
};

const handleClickOutside = (event: MouseEvent) => {
	if (
		floating.value &&
		!floating.value.contains(event.target) &&
		!reference.value.contains(event.target)
	) {
		collapse();
	}
};

defineExpose({
	expand,
	collapse,
	toggle
});

onBeforeUnmount(() => {
	if (isOpen.value) collapse();
});
</script>

<template>
	<div ref="reference" class="dropdown-list__reference" @click="toggle">
		<slot />
	</div>

	<div
		v-if="isOpen"
		ref="floating"
		class="dropdown-list__floating"
		:style="floatingStyles"
	>
		<ul class="dropdown-list__list">
			<slot name="options" />
		</ul>
		<div
			ref="floatingArrow"
			class="dropdown-list__arrow"
			:class="`dropdown-list__arrow--placement-${placement}`"
			:style="arrowStyles"
		></div>
	</div>
</template>

<style lang="less" scoped>
.dropdown-list {
	--light-grey-1: #d4d4d4;

	&__floating {
		position: fixed;
		top: 0;
		left: 0;
		width: 180px;
		z-index: 1000;
		background-color: var(--white);
		color: var(--black);
		border: solid 1px var(--light-grey-1);
		border-radius: 5px;
		box-shadow:
			0 14px 28px rgba(0, 0, 0, 0.25),
			0 10px 10px rgba(0, 0, 0, 0.22);
	}

	&__list {
		display: flex;
		flex-direction: column;
		max-height: 300px;
		overflow-y: auto;
		margin: 0;
		padding: 0;
	}

	&__arrow {
		position: absolute;
		width: 0;
		height: 0;
		border: 8px solid transparent;
		pointer-events: none;

		&::before {
			content: "";
			position: absolute;
			border: 8px solid transparent;
		}

		&--placement-left {
			border-left-color: var(--light-grey-1);
			border-right: 0;

			&::before {
				top: -8px;
				left: -9px;
				border-left-color: var(--white);
				border-right: 0;
			}
		}

		&--placement-right {
			border-right-color: var(--light-grey-1);
			border-left: 0;

			&::before {
				top: -8px;
				right: -9px;
				border-right-color: var(--white);
				border-left: 0;
			}
		}

		&--placement-top {
			border-top-color: var(--light-grey-1);
			border-bottom: 0;

			&::before {
				top: -9px;
				left: -8px;
				border-top-color: var(--white);
				border-bottom: 0;
			}
		}

		&--placement-bottom {
			border-bottom-color: var(--light-grey-1);
			border-top: 0;

			&::before {
				bottom: -9px;
				left: -8px;
				border-bottom-color: var(--white);
				border-top: 0;
			}
		}
	}
}
</style>
