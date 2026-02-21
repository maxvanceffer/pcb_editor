import { v4 as uuid } from "uuid";
import { BaseComponent } from "./BaseComponent";
import type { GridPosition, Pin, SerializedElement } from "./types";

export type BatteryType = "18650" | "AA" | "AAA";

const BATTERY_CONFIGS: Record<
  BatteryType,
  { name: string; widthInHoles: number; heightInHoles: number }
> = {
  "18650": {
    name: "Холдер 18650 (3.7V Li-Ion)",
    widthInHoles: 3,
    heightInHoles: 2,
  },
  AA: { name: "Холдер AA (1.5V)", widthInHoles: 2, heightInHoles: 2 },
  AAA: { name: "Холдер AAA (1.5V)", widthInHoles: 2, heightInHoles: 2 },
};

export class BatteryHolder extends BaseComponent {
  readonly type: string;
  readonly name: string;
  readonly widthInHoles: number;
  readonly heightInHoles: number;
  readonly color = "#8b5cf6";
  readonly pins: Pin[];
  readonly batteryType: BatteryType;
  Н;

  constructor(
    batteryType: BatteryType,
    position: GridPosition,
    rotation: 0 | 90 | 180 | 270 = 0,
    id?: string,
  ) {
    super(id ?? uuid(), position, rotation);
    this.batteryType = batteryType;
    const cfg = BATTERY_CONFIGS[batteryType];
    this.type = `battery-${batteryType.toLowerCase()}`;
    this.name = cfg.name;
    this.widthInHoles = cfg.widthInHoles;
    this.heightInHoles = cfg.heightInHoles;
    this.pins = [
      { id: "plus", label: "+", offsetX: 0, offsetY: 0, connectedWireIds: [] },
      {
        id: "minus",
        label: "-",
        offsetX: cfg.widthInHoles - 1,
        offsetY: cfg.heightInHoles - 1,
        connectedWireIds: [],
      },
    ];
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      batteryType: this.batteryType,
    };
  }
}
