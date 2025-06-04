<script lang="ts">
  import "../app.css";
  let { children } = $props();

  const title = "HGペイント（歩行グラフィックペイント）";
  const description = "歩行グラを作れるフリーソフトです。";
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="%sveltekit.assets%/" />
  <meta property="og:image" content="%sveltekit.assets%/momoi.png" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="%sveltekit.assets%/momoi.png" />

  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" href="%sveltekit.assets%/momoi.png" />
</svelte:head>

{@render children()}
