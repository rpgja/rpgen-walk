<script lang="ts">
  import * as anime from "../anime";

  let currentFrame = 0;
  let rafId: number;
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

  const render = () => {
    for (const [canvasIndex, way] of ways.entries()) {
      //真ん中
      if (way === null) {
        const n = anime.ways;
        if (n !== 4 && n !== 8) continue;
        const rotate = n === 4 ? rotate4ways : rotate8ways;
        const step = (currentFrame / 30 / (8 / n)) | 0;
        const _way = rotate[step % n];
        const i = anime.iByWay.get(_way);
        if (!i && i !== 0) continue;
        const canvas = anime.canvasByI.get(i);
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
        const n = anime.frames;
        const step = (currentFrame / 30) | 0;
        const frameIndex =
          n === 1 ? 0 : n - 1 - Math.abs((step % ((n - 1) * 2)) - (n - 1));
        const canvas = anime.canvasByI.get(i + frameIndex);
        if (!canvas) continue;
        ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
      }
    }
    currentFrame++;
    rafId = requestAnimationFrame(render);
  };
  $effect(() => {
    if (!canvasRefs) return;
    render();
    return () => cancelAnimationFrame(rafId);
  });

  let canvasRefs: HTMLCanvasElement[] = $state(Array(ways.length));
</script>

<div class="grid grid-cols-3 gap-2">
  {#each canvasRefs as _, i}
    <canvas
      class="w-16 h-16 border border-gray-300 gimp-checkered-background"
      bind:this={canvasRefs[i]}
      width="32"
      height="32"
    ></canvas>
  {/each}
</div>
