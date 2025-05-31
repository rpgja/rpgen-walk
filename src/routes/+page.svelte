<script lang="ts">
    import ColorWheelPart from "$lib/components/ColorWheelPart.svelte";
    import { ObjectStorage } from "$lib/object-storage";
    import { color } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import type { Component } from "@lucide/svelte";
    import IconEraser from "@lucide/svelte/icons/eraser";
    import IconFlipHorizontal from "@lucide/svelte/icons/flip-horizontal-2";
    import IconGrid from "@lucide/svelte/icons/grid";
    import IconMove from "@lucide/svelte/icons/move";
    import IconPaintBucket from "@lucide/svelte/icons/paint-bucket";
    import IconPen from "@lucide/svelte/icons/pen";
    import IconPipette from "@lucide/svelte/icons/pipette";
    import IconRedo from "@lucide/svelte/icons/redo";
    import IconSave from "@lucide/svelte/icons/save";
    import IconTrash2 from "@lucide/svelte/icons/trash-2";
    import IconUndo from "@lucide/svelte/icons/undo";
    import {
        mdiContentSave,
        mdiContentSaveOutline,
        mdiEraser,
        mdiEraserVariant,
        mdiEyedropper,
        mdiFlipHorizontal,
        mdiFormatColorFill,
        mdiGrid,
        mdiHandBackRight,
        mdiLayers,
        mdiPen,
        mdiPlus,
        mdiRedo,
        mdiTrashCan,
        mdiTrashCanOutline,
        mdiUndo,
    } from "@mdi/js";
    import * as oekaki from "@onjmin/oekaki";
    import { Segment, Switch } from "@skeletonlabs/skeleton-svelte";
    import ColorPicker from "svelte-awesome-color-picker";

    /**
     * PC版ショートカット
     */
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (!e.ctrlKey) return;
        switch (e.key) {
            case "2":
                e.preventDefault();
                choiced = tool.pen.label;
                break;
            case "3":
                e.preventDefault();
                choiced = tool.eraser.label;
                break;
            case "4":
                e.preventDefault();
                choiced = tool.dropper.label;
                break;
            case "5":
                e.preventDefault();
                choiced = tool.fill.label;
                break;
            case "6":
                e.preventDefault();
                choiced = tool.translate.label;
                break;
            case "e":
                e.preventDefault();
                erasable = !erasable;
                break;
            case "f":
                e.preventDefault();
                oekaki.flipped.value = !oekaki.flipped.value;
                break;
            case "g":
                e.preventDefault();
                isGrid = !isGrid;
                break;
            case "z":
                doAction(tool.undo.label);
                break;
            case "Z":
                doAction(tool.redo.label);
                break;
            case "s":
                e.preventDefault();
                doAction(tool.save.label);
                break;
        }
    };
    $effect(() => {
        if (!upperLayer) return;
        window.removeEventListener("keydown", handleKeyDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const dropper = (x: number, y: number) => {
        if (!activeLayer) return;
        const ctx = oekaki
            .render()
            .getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const { data } = ctx.getImageData(0, 0, width, height);
        const index = (y * width + x) * 4;
        const hex = `#${Array.from(data.slice(index, index + 3))
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")}`;
        color.update(() => hex);
    };

    const fill = async (x: number, y: number) => {
        if (!activeLayer) return;
        const rgb = $color
            .slice(1)
            .match(/.{2}/g)
            ?.map((v) => Number.parseInt(v, 16));
        if (rgb?.length !== 3) return;
        const [r, g, b] = rgb;
        const data = oekaki.floodFill(
            activeLayer.data,
            width,
            height,
            x,
            y,
            erasable ? [0, 0, 0, 0] : [r, g, b, 255],
        );
        if (data) activeLayer.data = data;
    };

    let oekakiWrapper: HTMLElement | undefined = $state();
    let activeLayer: oekaki.LayeredCanvas | undefined = $state();
    let upperLayer: oekaki.LayeredCanvas | null = $state(null);
    let lowerLayer: oekaki.LayeredCanvas | null = $state(null);

    const width = 480;
    const height = 480;
    $effect(() => {
        init();
    });
    const init = async () => {
        if (!oekakiWrapper) return;
        oekaki.init(oekakiWrapper, width, height);

        const upper = oekaki.upperLayer.value;
        const lower = oekaki.lowerLayer.value;
        upper?.canvas.classList.add("upper-canvas");
        lower?.canvas.classList.add("gimp-checkered-background");
        upperLayer = upper;
        lowerLayer = lower;

        oekaki.setDotSize(1, 16);
        document.documentElement.style.setProperty(
            "--grid-cell-size",
            `${oekaki.getDotSize()}px`,
        );

        activeLayer = new oekaki.LayeredCanvas("Layer 1");
    };

    // 描画イベント登録
    $effect(() => {
        if (!upperLayer) return;
        let prevX: number | null = null;
        let prevY: number | null = null;
        oekaki.onDraw((x, y, buttons) => {
            if (prevX === null) prevX = x;
            if (prevY === null) prevY = y;
            if (choiced === tool.dropper.label || (buttons & 2) !== 0) {
                dropper(x, y);
            } else {
                if (!activeLayer?.locked) {
                    if (choiced === tool.translate.label) {
                        activeLayer?.translateByDot(x - prevX, y - prevY);
                    } else {
                        const lerps = oekaki.lerp(x, y, prevX, prevY);
                        switch (choiced) {
                            case tool.pen.label:
                                for (const [x, y] of lerps) {
                                    erasable
                                        ? activeLayer?.eraseByDot(x, y)
                                        : activeLayer?.drawByDot(x, y);
                                }
                                break;
                            case tool.eraser.label:
                                for (const [x, y] of lerps) {
                                    activeLayer?.eraseByDot(x, y);
                                }
                                break;
                        }
                    }
                }
            }
            prevX = x;
            prevY = y;
        });
        const fin = () => {
            if (activeLayer?.modified()) {
                activeLayer.trace();
                addRecent();
            }
        };
        oekaki.onDrawn((x, y, buttons) => {
            prevX = null;
            prevY = null;
            if (activeLayer?.locked) return;
            if (choiced === tool.fill.label) fill(x, y);
            fin();
        });
        oekaki.onClick((x, y, buttons) => {});
    });

    let opacity = $state(100);
    let layerVisible = $state(true);
    let layerName = $state("");
    let layerNameDisabled = $state(true);
    let layerLocked = $state(false);
    $effect(() => {
        if (activeLayer) activeLayer.opacity = opacity;
    });
    $effect(() => {
        unjStorage.color.value = $color;
        oekaki.color.value = $color;
    });

    let recent: string[] = $state([]);
    const maxRecent = 16;
    const addRecent = () => {
        const idx = recent.indexOf($color);
        if (idx === 0) return;
        if (idx !== -1) recent.splice(idx, 1);
        recent.unshift($color);
        if (recent.length > maxRecent) recent.pop();
        recent = [...recent]; // 新しい配列を代入する（Svelte のリアクティブ性を保つため）
    };

    const tool = {
        // 描画系
        pen: { label: "ペン", mdi: mdiPen, icon: IconPen },
        eraser: { label: "消しゴム", mdi: mdiEraser, icon: IconEraser },
        dropper: {
            label: "カラーピッカー",
            mdi: mdiEyedropper,
            icon: IconPipette,
        },
        fill: {
            label: "塗りつぶし",
            mdi: mdiFormatColorFill,
            icon: IconPaintBucket,
        },
        translate: {
            label: "ハンドツール",
            mdi: mdiHandBackRight,
            icon: IconMove,
        },
        // 切り替え系
        erasable: {
            label: "常に消しゴム",
            mdi: mdiEraserVariant,
            icon: IconEraser,
        },
        flip: {
            label: "左右反転",
            mdi: mdiFlipHorizontal,
            icon: IconFlipHorizontal,
        },
        grid: { label: "グリッド線", mdi: mdiGrid, icon: IconGrid },
        // アクション系
        undo: { label: "戻る", mdi: mdiUndo, icon: IconUndo },
        redo: { label: "進む", mdi: mdiRedo, icon: IconRedo },
        save: {
            label: "画像を保存",
            mdi: mdiContentSaveOutline,
            icon: IconSave,
        },
        clear: { label: "全消し", mdi: mdiTrashCanOutline, icon: IconTrash2 },
    } as const;

    let choices = [
        tool.pen,
        tool.eraser,
        tool.dropper,
        tool.fill,
        tool.translate,
    ];
    let choiced: string = $state(unjStorage.tool.value ?? tool.pen.label);

    const mdi2DataUrl = (mdi: string) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="${mdi}" fill="black" stroke="white" stroke-width="1"/></svg>`;
        const base64 = btoa(svg);
        return `data:image/svg+xml;base64,${base64}`;
    };

    $effect(() => {
        unjStorage.tool.value = choiced;
        if (upperLayer) {
            const xy = choiced === tool.fill.label ? "21 19" : "3 21";
            const mdi = choices.find((v) => v.label === choiced)?.mdi;
            if (!mdi) return;
            upperLayer.canvas.style.cursor = `url('${mdi2DataUrl(mdi)}') ${xy}, auto`;
        }
    });

    let erasable = $state(false);
    let flipped = $state(false);
    $effect(() => {
        oekaki.flipped.value = flipped;
    });
    let isGrid = $state(false);

    let actions = [tool.undo, tool.redo, tool.save, tool.clear];
    const doAction = (action: string) => {
        switch (action) {
            case tool.undo.label:
                activeLayer?.undo();
                break;
            case tool.redo.label:
                activeLayer?.redo();
                break;
            case tool.save.label:
                {
                    const dataURL = oekaki.render().toDataURL("image/png");
                    const link = document.createElement("a");
                    link.href = dataURL;
                    link.download = "drawing.png";
                    link.click();
                }
                break;
            case tool.clear.label:
                activeLayer?.clear();
                activeLayer?.trace();
                break;
        }
    };
</script>

<div class="grid h-screen grid-rows-[auto_1fr_auto]">
    <!-- Header -->
    <header class="bg-surface-100 shadow p-4">
        HGペイント（歩行グラフィックペイント）
    </header>

    <!-- Content Area -->
    <div class="grid grid-cols-1 md:grid-cols-[auto_1fr_auto]">
        <!-- Left Sidebar -->
        <aside class="bg-surface-200 p-4 space-y-4">
            <div>フレームごとの差分？</div>
        </aside>

        <!-- Main Canvas Area -->
        <main class="bg-white flex flex-col items-center justify-center">
            <div
                class={`relative ${isGrid ? "hg-paint-grid-mode" : ""}`}
                bind:this={oekakiWrapper}
            ></div>
        </main>

        <!-- Right Sidebar -->
        <aside class="bg-surface-200 p-4 space-y-4">
            <div>レイヤー？</div>
            <ColorWheelPart />
        </aside>
    </div>

    <!-- Footer Tool Selector -->
    <footer
        class="bg-surface-100 shadow p-4 flex flex-wrap items-center justify-center"
    >
        <Segment
            name="tool"
            value={choiced}
            onValueChange={(e) => {
                if (e.value) choiced = e.value;
            }}
        >
            {#each choices as choice}
                <Segment.Item value={choice.label}>
                    <choice.icon />
                </Segment.Item>
            {/each}
        </Segment>
        <nav class="btn-group preset-outlined-surface-200-800 flex gap-4">
            <Switch
                name="erasable"
                controlActive="bg-secondary-500"
                checked={erasable}
                onCheckedChange={(e) => {
                    erasable = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <IconEraser size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <IconEraser size="14" />
                {/snippet}
            </Switch>
            <Switch
                name="flipped"
                controlActive="bg-secondary-500"
                checked={flipped}
                onCheckedChange={(e) => {
                    flipped = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <IconFlipHorizontal size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <IconFlipHorizontal size="14" />
                {/snippet}
            </Switch>
            <Switch
                name="grid"
                controlActive="bg-secondary-500"
                checked={isGrid}
                onCheckedChange={(e) => {
                    isGrid = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <IconGrid size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <IconGrid size="14" />
                {/snippet}
            </Switch>
        </nav>
        <nav class="btn-group preset-outlined-surface-200-800 flex gap-2">
            {#each actions as action}
                <button
                    type="button"
                    class="btn-icond btn-lg"
                    onclick={() => doAction(action.label)}
                >
                    <action.icon size={18} />
                </button>
            {/each}
        </nav>
        <!-- カラーピッカー UI -->
        <div class="w-full text-left flex flex-wrap items-center gap-4">
            <!-- Skeleton ColorPicker -->
            <div
                class="rounded-full ring-2 ring-black ring-offset-2 ring-offset-white"
            >
                <ColorPicker label="" bind:hex={$color} isAlpha={false} />
            </div>
            <!-- Tailwind input[type=color] -->
            <input
                type="color"
                bind:value={$color}
                class="w-10 h-10 rounded-full border-none p-0"
            />
            <!-- 最近使った色 -->
            <div class="flex gap-2">
                {#each recent as _color}
                    <button
                        type="button"
                        aria-label="Select color"
                        class="w-8 h-8 rounded-full ring-2 ring-gray-200 hover:ring-primary-500 transition"
                        style="background-color:{_color};"
                        onclick={() => color.set(_color)}
                    ></button>
                {/each}
            </div>
        </div>
    </footer>
</div>

<style>
    :global(.color-picker-wrapper label) {
        border-radius: 50%;
        box-shadow:
            0 0 0 2px black,
            0 0 0 4px white;
    }
    :global(.hg-paint-grid-mode .upper-canvas) {
        opacity: 0.4;
        background-image: linear-gradient(to right, gray 1px, transparent 1px),
            linear-gradient(to bottom, gray 1px, transparent 1px);
        background-size: var(--grid-cell-size) var(--grid-cell-size);
    }
    /* GIMPの背景のアレ */
    :global(.gimp-checkered-background) {
        background-color: #fff;
        background-image: linear-gradient(45deg, #eee 25%, transparent 25%),
            linear-gradient(-45deg, #eee 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #eee 75%),
            linear-gradient(-45deg, transparent 75%, #eee 75%);
        background-size: 16px 16px;
        background-position:
            0 0,
            0 8px,
            8px -8px,
            -8px 0px;
    }
</style>
