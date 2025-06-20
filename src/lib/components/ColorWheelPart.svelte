<script lang="ts">
  import "reinvented-color-wheel/css/reinvented-color-wheel.min.css";
  import RCW from "reinvented-color-wheel";
  const ReinventedColorWheel = RCW as any;

  import { color } from "$lib/store.js";

  let el = $state();
  type ColorWheel = { hex: string };
  let colorWheel: ColorWheel | undefined = $state();
  const hex = $color;
  $effect(() => {
    colorWheel = new ReinventedColorWheel({
      appendTo: el,
      hex,
      wheelDiameter: 200,
      wheelThickness: 20,
      handleDiameter: 16,
      wheelReflectsSaturation: false,
      onChange: (v: ColorWheel) => {
        $color = v.hex;
      },
    });
  });
  $effect(() => {
    if (colorWheel) colorWheel.hex = $color;
  });
</script>

<center bind:this={el}></center>
