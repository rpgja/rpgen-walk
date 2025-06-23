<script lang="ts">
  import * as anime from "$lib/anime";
  import { fps } from "$lib/store";

  let { initTimestamp } = $props();

  const width = 48;
  let height = $state(0);
  $effect(() => {
    if (!initTimestamp) return;
    height = Math.floor((width * anime.height) / anime.width);
  });

  const ways = [
    anime.way.q,
    anime.way.w,
    anime.way.e,
    anime.way.a,
    null,
    anime.way.d,
    anime.way.z,
    anime.way.s,
    anime.way.c,
  ];

  const rotate4ways = [anime.way.s, anime.way.a, anime.way.w, anime.way.d];
  const rotate8ways = [
    anime.way.s,
    anime.way.z,
    anime.way.a,
    anime.way.q,
    anime.way.w,
    anime.way.e,
    anime.way.d,
    anime.way.c,
  ];

  const render = (time: DOMHighResTimeStamp) => {
    rafId = requestAnimationFrame(render);

    // 足踏み
    const n = anime.frames;
    const elapsedSec = time / 1000;
    const step = (elapsedSec * $fps) | 0;
    const frameIndex = n !== 3 ? step % n : 2 - Math.abs(2 - (step % 4));

    // ぐるぐる
    const rotateStep = (step / (8 / n)) | 0;

    for (const [canvasIndex, way] of ways.entries()) {
      //真ん中
      if (way === null) {
        const n = anime.ways;
        if (n !== 4 && n !== 8) continue;
        const rotate = n === 4 ? rotate4ways : rotate8ways;
        const _way = rotate[rotateStep % n];
        const i = anime.iByWay.get(_way);
        if (!i && i !== 0) continue;
        const canvas = anime.canvasByI.get(i + frameIndex);
        if (!canvas) continue;
        const cv = canvasRefs[canvasIndex];
        if (!cv) continue;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        if (!ctx) continue;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
      } else {
        const i = anime.iByWay.get(way);
        if (!i && i !== 0) continue;
        const cv = canvasRefs[canvasIndex];
        if (!cv) continue;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        if (!ctx) continue;
        ctx.clearRect(0, 0, cv.width, cv.height);
        const canvas = anime.canvasByI.get(i + frameIndex);
        if (!canvas) continue;
        ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
      }
    }
  };
  $effect(() => {
    if (!canvasRefs) return;
    render(0);
    return () => cancelAnimationFrame(rafId);
  });
  let rafId: number;

  let canvasRefs: HTMLCanvasElement[] = $state(Array(ways.length));
</script>

<div class="grid grid-cols-3 gap-2">
  {#each canvasRefs as _, i}
    <canvas
      class="border border-gray-300 gimp-checkered-background"
      bind:this={canvasRefs[i]}
      {width}
      {height}
    ></canvas>
  {/each}
</div>
