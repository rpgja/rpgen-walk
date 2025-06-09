<script lang="ts">
    import * as anime from "$lib/anime";
    import { activeIndex, fps } from "$lib/store";

    let { initTimestamp } = $props();

    const width = 48 * 4;
    let height = $state(0);
    $effect(() => {
        if (!initTimestamp) return;
        height = Math.floor((width * anime.height) / anime.width);
    });

    const render = (time: DOMHighResTimeStamp) => {
        rafId = requestAnimationFrame(render);

        const { frames } = anime;
        const i = Math.floor($activeIndex / frames) * frames;

        // 足踏み
        const n = anime.frames;
        const elapsedSec = time / 1000;
        const step = (elapsedSec * $fps) | 0;
        const frameIndex =
            n === 1 ? 0 : n - 1 - Math.abs((step % ((n - 1) * 2)) - (n - 1));

        if (!i && i !== 0) return;
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
        const canvas = anime.canvasByI.get(i + frameIndex);
        if (!canvas) return;
        ctx.drawImage(canvas, 0, 0, canvasRef.width, canvasRef.height);
    };
    $effect(() => {
        if (!canvasRef) return;
        render(0);
        return () => cancelAnimationFrame(rafId);
    });
    let rafId: number;

    let canvasRef: HTMLCanvasElement | undefined = $state();
</script>

<canvas
    class="border border-gray-300 gimp-checkered-background"
    bind:this={canvasRef}
    {width}
    {height}
></canvas>
