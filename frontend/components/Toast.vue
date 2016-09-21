<template>
	<div class="toast-container">
		<div class="toast">
			<slot></slot>
		</div>
	</div>
</template>

<style lang="sass">
	.toast-container {
		display: block;
    	position: fixed;
    	z-index: 10000;
	}

	.toast {
		border-radius: 2px;
	    top: 0;
	    width: auto;
	    clear: both;
	    margin-top: 10px;
	    position: relative;
	    max-width: 100%;
	    height: auto;
	    min-height: 48px;
	    line-height: 1.5em;
	    word-break: break-all;
	    background-color: #323232;
	    padding: 10px 25px;
	    font-size: 1.1rem;
	    font-weight: 300;
	    color: #fff;
	    display: flex;
	    align-items: center;
	    justify-content: space-between;
		box-shadow: 0 2px 5px 0 rgba(0,0,0,0.16),0 2px 10px 0 rgba(0,0,0,0.12);
	}
</style>
