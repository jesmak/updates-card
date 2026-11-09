/**
 * What the card shows, worked out from Home Assistant's states and registries: which update entities each group holds,
 * how each one reads as a row, which devices are out of reach, which waiting rows fold into a bunch, and how an install
 * the card follows is going.
 *
 * Versions are only ever compared as text. Integrations version in every way there is (calendar versions, tags with a
 * `v`, `-1`, words), so nothing here reads one as a number.
 */
import { BUNCH_MIN, FEATURE_INSTALL, VERSION_WAIT } from "./const";
import type { HassEntity, HomeAssistant } from "./hass";
import type { ActionConfig, Bunch, Group, GroupConfig, Row, RowKind, UpdatesCardConfig } from "./types";

/** What an entity of each domain a group lists is as a row. Only update entities are found by the filters. */
const KINDS: Record<string, RowKind> = { update: "update", sensor: "count", binary_sensor: "problem" };

function kindOf(entityId: string): RowKind | undefined {
    return KINDS[entityId.split(".")[0]];
}

/** Every update entity there is, except those hidden in the registry. */
export function updateEntities(hass: HomeAssistant): string[] {
    return Object.keys(hass.states).filter((id) => id.startsWith("update.") && !hass.entities?.[id]?.hidden);
}

/** The integrations that have update entities, for the editor to offer. */
export function updateIntegrations(hass: HomeAssistant): string[] {
    const platforms = updateEntities(hass).map((id) => hass.entities?.[id]?.platform);
    return [...new Set(platforms.filter((p): p is string => !!p))].sort();
}

/** An entity's area: its own, or else its device's. */
function areaOf(hass: HomeAssistant, entityId: string): string | undefined {
    const entry = hass.entities?.[entityId];
    if (entry?.area_id) {
        return entry.area_id;
    }
    return (entry?.device_id && hass.devices?.[entry.device_id]?.area_id) || undefined;
}

/** The update entities one group holds, in no particular order. */
export function groupEntities(hass: HomeAssistant, group: GroupConfig): string[] {
    const exclude = new Set(group.exclude ?? []);
    const chosen = group.entities?.length
        ? group.entities.filter((id) => kindOf(id) !== undefined && hass.states[id] !== undefined)
        : updateEntities(hass).filter((id) => {
              if (group.integration && hass.entities?.[id]?.platform !== group.integration) {
                  return false;
              }
              const area = areaOf(hass, id);
              if (group.areas?.length && (!area || !group.areas.includes(area))) {
                  return false;
              }
              return !(area && group.exclude_areas?.includes(area));
          });
    return chosen.filter((id) => !exclude.has(id));
}

/** The groups as configured, or every update entity in one group without a name. */
export function groupConfigs(config: UpdatesCardConfig): GroupConfig[] {
    return config.groups?.length ? config.groups : [{}];
}

/**
 * For each device, how many of its entities have a state, how many of those are down, and how many update entities it
 * has. Worked out once for all the rows of an update.
 */
export interface DeviceCounts {
    states: number;
    down: number;
    updates: number;
}

/**
 * Whether an entity says its device is gone: it is unavailable, or it is a connection sensor that is off. ESPHome's
 * status sensor, for one, stays available and turns off when its device disconnects.
 */
function isDown(state: HassEntity): boolean {
    return (
        state.state === "unavailable" ||
        (state.entity_id.startsWith("binary_sensor.") && state.attributes.device_class === "connectivity" && state.state === "off")
    );
}

export function deviceCounts(hass: HomeAssistant): Map<string, DeviceCounts> {
    const counts = new Map<string, DeviceCounts>();
    for (const entry of Object.values(hass.entities ?? {})) {
        const state = entry?.device_id ? hass.states[entry.entity_id] : undefined;
        if (!entry?.device_id || !state) {
            continue;
        }
        const count = counts.get(entry.device_id) ?? { states: 0, down: 0, updates: 0 };
        count.states += 1;
        count.down += isDown(state) ? 1 : 0;
        count.updates += entry.entity_id.startsWith("update.") ? 1 : 0;
        counts.set(entry.device_id, count);
    }
    return counts;
}

/**
 * How a row is named and what of its entity it reads: the user's own name for it, whether its device has another entity
 * in the same group, and the group's list, reason and age attributes.
 */
export interface RowOptions {
    name?: string;
    deviceShared?: boolean;
    group?: GroupConfig;
}

/**
 * An entity as a row. A device's update entity is named after its device, as the entity's own name adds only
 * "Firmware" to it, unless the device has several update entities, which the device's name wouldn't tell apart, or
 * another entity in the same group, which would then share the name. A count or problem sensor is named after its
 * device, as its unit or its list tells what it is. A name of the user's own wins over all of these.
 *
 * Without a title, the software is the integration's, as for the firmware of Zigbee2MQTT's devices, unless the device
 * is a service, which is software of its own. The Marketplace gives its downloads no title. A sensor's row is software
 * of its own, so it never bunches.
 *
 * A row is out of reach when its entity is unavailable, or when every other entity of its device is down. ESPHome keeps
 * the update entity available after a disconnect the device announced, such as going to sleep, and so may other
 * integrations.
 */
export function rowOf(hass: HomeAssistant, entityId: string, counts: Map<string, DeviceCounts>, options: RowOptions = {}): Row | undefined {
    const state = hass.states[entityId];
    const kind = kindOf(entityId);
    if (!state || !kind) {
        return undefined;
    }
    const attributes = state.attributes;
    const entry = hass.entities?.[entityId];
    const device = entry?.device_id ? hass.devices?.[entry.device_id] : undefined;
    const count = entry?.device_id ? counts.get(entry.device_id) : undefined;
    const ownName =
        hass.formatEntityName?.(state, [{ type: "device" }, { type: "entity" }]) || String(attributes.friendly_name ?? entityId);
    const deviceName = device ? device.name_by_user || device.name || ownName : ownName;
    let name = ownName;
    if (options.name) {
        name = options.name;
    } else if (kind !== "update") {
        name = deviceName;
    } else if (device && (count?.updates ?? 1) <= 1) {
        name = options.deviceShared ? hass.formatEntityName?.(state, [{ type: "entity" }]) || ownName : deviceName;
    }
    const title = typeof attributes.title === "string" && attributes.title ? attributes.title : undefined;
    const others = count ? count.states - 1 : 0;
    const othersDown = count ? count.down - (isDown(state) ? 1 : 0) : 0;
    const unreachable = state.state === "unavailable" || (others > 0 && othersDown === others);
    const group = options.group;
    const age = group?.age_attribute ? Number(attributes[group.age_attribute]) : NaN;
    const old = group?.age_days ? age >= group.age_days : false;
    const stamp = group?.reported_attribute ? attributes[group.reported_attribute] : undefined;
    const reported = typeof stamp === "string" && !Number.isNaN(Date.parse(stamp)) ? Date.parse(stamp) : undefined;
    if (kind !== "update") {
        const attribute = kind === "count" ? group?.list_attribute : group?.reason_attribute;
        const listed = attribute ? attributes[attribute] : undefined;
        const items = Array.isArray(listed) ? listed.map(String) : typeof listed === "string" && listed ? [listed] : [];
        const unit = attributes.unit_of_measurement;
        const pending = !unreachable && (kind === "count" ? Number(state.state) > 0 : state.state === "on");
        return {
            entity_id: entityId,
            kind,
            name,
            software: name,
            softwareKey: `\u0000${entityId}`,
            installed: "",
            latest: "",
            pending,
            installing: false,
            canInstall: false,
            unreachable,
            quantity: kind === "count" ? (typeof unit === "string" && unit ? `${state.state} ${unit}` : state.state) : undefined,
            items,
            old,
            reported,
        };
    }
    const software = title ?? (device?.entry_type === "service" ? name : (entry?.platform ?? ownName));
    const progress = attributes.in_progress;
    return {
        entity_id: entityId,
        kind,
        name,
        software,
        softwareKey: `${entry?.platform ?? ""}\u0000${software}`,
        installed: versionText(attributes.installed_version),
        latest: versionText(attributes.latest_version),
        pending: state.state === "on" && !unreachable,
        installing: progress === true || typeof progress === "number",
        canInstall: (Number(attributes.supported_features ?? 0) & FEATURE_INSTALL) !== 0,
        unreachable,
        old,
        reported,
    };
}

function versionText(value: unknown): string {
    return value === null || value === undefined ? "" : String(value);
}

/**
 * The groups with their rows, sorted by name in the viewer's language. A problem sensor has a row only while it is on.
 * Whether a device has more than one entity in a group counts those that are off too, so a row's name doesn't change
 * as one comes and goes.
 */
export function groupsOf(hass: HomeAssistant, config: UpdatesCardConfig, language: string): Group[] {
    const counts = deviceCounts(hass);
    const collator = new Intl.Collator(language);
    const names = new Map((config.names ?? []).filter((entry) => entry?.entity && entry.name).map((entry) => [entry.entity, entry.name]));
    return groupConfigs(config).map((group, index) => {
        const entities = groupEntities(hass, group);
        const perDevice = new Map<string, number>();
        for (const id of entities) {
            const device = hass.entities?.[id]?.device_id;
            if (device) {
                perDevice.set(device, (perDevice.get(device) ?? 0) + 1);
            }
        }
        const shared = (id: string) => (perDevice.get(hass.entities?.[id]?.device_id ?? "") ?? 0) > 1;
        return {
            key: String(index),
            name: group.name || undefined,
            rows: entities
                .map((id) => rowOf(hass, id, counts, { name: names.get(id), deviceShared: shared(id), group }))
                .filter((row): row is Row => row !== undefined && (row.kind !== "problem" || row.pending))
                .sort((a, b) => collator.compare(a.name, b.name)),
            entities,
        };
    });
}

/**
 * Splits a group's waiting rows into bunches and single rows. Rows bunch when they update the same software (the same
 * integration and title) to the same version, whatever they move from, so a device a release behind stays with the
 * rest. Fewer than three stay single. The rows keep their order.
 */
export function bunchesOf(rows: Row[]): { bunches: Bunch[]; singles: Row[] } {
    const byKey = new Map<string, Row[]>();
    for (const row of rows) {
        const key = `${row.softwareKey}\u0000${row.latest}`;
        byKey.set(key, [...(byKey.get(key) ?? []), row]);
    }
    const bunches: Bunch[] = [];
    const bunched = new Set<string>();
    for (const [key, members] of byKey) {
        if (members.length < BUNCH_MIN) {
            continue;
        }
        const from = members.every((row) => row.installed === members[0].installed) ? members[0].installed : undefined;
        bunches.push({ key, software: members[0].software, latest: members[0].latest, from, rows: members });
        members.forEach((row) => bunched.add(row.entity_id));
    }
    return { bunches, singles: rows.filter((row) => !bunched.has(row.entity_id)) };
}

/**
 * The script an action runs, when it runs one, for the card to tell whether it is running and to offer to stop it.
 * A script's service has the script's own name, and so has its entity unless someone has renamed the entity.
 */
export function scriptOf(action: ActionConfig | undefined): string | undefined {
    if (!action || !["perform-action", "call-service"].includes(action.action)) {
        return undefined;
    }
    const service = action.perform_action ?? action.service;
    if (service === "script.turn_on") {
        const target = action.target?.entity_id;
        const ids = Array.isArray(target) ? target : target ? [target] : [];
        return ids.length === 1 && ids[0].startsWith("script.") ? ids[0] : undefined;
    }
    if (service?.startsWith("script.") && !["script.turn_off", "script.toggle", "script.reload"].includes(service)) {
        return service;
    }
    return undefined;
}

/**
 * An install the card follows: one it started from a row, or a row that was waiting when an install-all script started.
 * `from`, `to` and the software are the row's when it started, which stand in while the entity is unavailable, as Home
 * Assistant then drops the versions and title. `settled` is when the row's call to Home Assistant returned, `doneAt` when the
 * card first saw it done, which it then stays until the card lets it go.
 */
export interface Install {
    from: string;
    to: string;
    software: string;
    softwareKey: string;
    by: "row" | "run";
    settled?: number;
    error?: string;
    doneAt?: number;
}

export type Status = "pending" | "waiting" | "running" | "done" | "failed";

/**
 * How a row's install is going. A row is done once the card has seen it done, or once its version is known and has moved
 * from where the install started, whatever happened to the call that started it, whether the device is in reach, and
 * whether a newer update already waits for it. After its call has returned, a row of the card's own still counts as
 * running for a while, as a device reboots before Home Assistant learns its new version. One that hasn't moved by then
 * has failed, as has one whose call was refused. A row an install-all will reach waits.
 */
export function statusOf(row: Row, install: Install | undefined, now: number): Status {
    if (!install) {
        return row.installing ? "running" : "pending";
    }
    if (install.doneAt !== undefined || (row.installed !== "" && row.installed !== install.from)) {
        return "done";
    }
    if (install.error) {
        return "failed";
    }
    if (row.installing) {
        return "running";
    }
    if (install.by === "run") {
        return "waiting";
    }
    return install.settled === undefined || now - install.settled < VERSION_WAIT ? "running" : "failed";
}
