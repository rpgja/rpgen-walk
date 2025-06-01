<script lang="ts">
	import "../app.css";
	import { base } from "$app/paths";

	let { children } = $props();
</script>

<svelte:head>
	<title>HGペイント（歩行グラフィックペイント）</title>
	<link rel="icon" href="{base}/momoi.png" type="image/png" />
</svelte:head>

{@render children()}
