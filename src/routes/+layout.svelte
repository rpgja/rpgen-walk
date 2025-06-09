<script lang="ts">
  import "../app.css";
  import { base } from "$app/paths";

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
  <meta property="og:url" content="{base}/" />
  <meta property="og:image" content="{base}/midori.png" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="{base}/midori.png" />

  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" href="{base}/midori.png" />

  <!-- PWA 対応 -->
  <link rel="manifest" href="{base}/manifest.json" />
  <meta name="theme-color" content="##6CBB5A" />

  <script
    src="https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.js"
  ></script>
</svelte:head>

{@render children()}
