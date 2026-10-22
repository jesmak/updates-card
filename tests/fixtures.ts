import type { HassEntityEntry, HomeAssistant } from "../src/hass";

/** A made-up update entity: its device, area, integration and state in one place. */
export interface Fake {
    id: string;
    state?: string;
    installed?: string;
    latest?: string;
    title?: string | null;
    platform?: string;
    device?: string;
    area?: string;
    features?: number;
    in_progress?: boolean | number;
    hidden?: boolean;
    friendly_name?: string;
}

/** Another entity of a device, such as its connection sensor. */
export interface Sibling {
    id: string;
    device: string;
    state: string;
    device_class?: string;
}

export interface Device {
    id: string;
    name: string;
    name_by_user?: string;
    area?: string;
}

/** A Home Assistant with the given update entities, devices and other entities, and a callService that records its calls. */
export function fakeHass(updates: Fake[], devices: Device[] = [], siblings: Sibling[] = []): HomeAssistant & { calls: unknown[][] } {
    const calls: unknown[][] = [];
    const states: HomeAssistant["states"] = {};
    const entities: Record<string, HassEntityEntry> = {};
    for (const u of updates) {
        states[u.id] = {
            entity_id: u.id,
            state: u.state ?? "off",
            last_changed: "2026-01-01T00:00:00Z",
            attributes:
                // Home Assistant keeps an unavailable entity's name and features, and drops the rest.
                u.state === "unavailable"
                    ? { friendly_name: u.friendly_name ?? `${u.id} firmware`, supported_features: u.features ?? 1 }
                    : {
                          friendly_name: u.friendly_name ?? `${u.id} firmware`,
                          installed_version: u.installed ?? "1.0.0",
                          latest_version: u.latest ?? u.installed ?? "1.0.0",
                          title: u.title === undefined ? "Firmware" : u.title,
                          supported_features: u.features ?? 1,
                          in_progress: u.in_progress ?? false,
                      },
        };
        entities[u.id] = { entity_id: u.id, device_id: u.device, area_id: u.area, platform: u.platform ?? "esphome", hidden: u.hidden };
    }
    for (const s of siblings) {
        states[s.id] = {
            entity_id: s.id,
            state: s.state,
            last_changed: "2026-01-01T00:00:00Z",
            attributes: s.device_class ? { device_class: s.device_class } : {},
        };
        entities[s.id] = { entity_id: s.id, device_id: s.device, platform: "esphome" };
    }
    return {
        calls,
        states,
        entities,
        devices: Object.fromEntries(
            devices.map((d) => [d.id, { id: d.id, name: d.name, name_by_user: d.name_by_user ?? null, area_id: d.area ?? null }]),
        ),
        areas: { garage: { area_id: "garage", name: "Garage" }, cabin: { area_id: "cabin", name: "Cabin" } },
        locale: { language: "en" },
        callService: async (...args: unknown[]) => {
            calls.push(args);
        },
    };
}
