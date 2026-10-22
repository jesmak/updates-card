import { describe, expect, it } from "vitest";

import { VERSION_WAIT } from "../src/const";
import type { Row } from "../src/types";
import { bunchesOf, deviceCounts, groupEntities, rowOf, scriptOf, statusOf } from "../src/updates";
import type { Install } from "../src/updates";
import { fakeHass } from "./fixtures";

describe("groupEntities", () => {
    const hass = fakeHass(
        [
            { id: "update.kitchen_plug", device: "d1" },
            { id: "update.garage_sensor", device: "d2" },
            { id: "update.cabin_plug", device: "d3" },
            { id: "update.own_area", device: "d3", area: "garage" },
            { id: "update.mushroom", platform: "hacs" },
            { id: "update.hidden", hidden: true },
        ],
        [
            { id: "d1", name: "plug-1" },
            { id: "d2", name: "sensor-1", area: "garage" },
            { id: "d3", name: "plug-2", area: "cabin" },
        ],
    );
    const ids = (group: Parameters<typeof groupEntities>[1]) => groupEntities(hass, group).sort();

    it.each([
        [
            "every update entity, hidden ones left out",
            {},
            ["update.cabin_plug", "update.garage_sensor", "update.kitchen_plug", "update.mushroom", "update.own_area"],
        ],
        ["by integration", { integration: "hacs" }, ["update.mushroom"]],
        ["by area, the entity's own before its device's", { areas: ["garage"] }, ["update.garage_sensor", "update.own_area"]],
        [
            "excluding areas keeps entities without one",
            { integration: "esphome", exclude_areas: ["cabin"] },
            ["update.garage_sensor", "update.kitchen_plug", "update.own_area"],
        ],
        [
            "an explicit list, filters ignored",
            { entities: ["update.mushroom", "update.missing", "sensor.x"], integration: "esphome" },
            ["update.mushroom"],
        ],
        [
            "exclude in either mode",
            { integration: "esphome", exclude: ["update.kitchen_plug"] },
            ["update.cabin_plug", "update.garage_sensor", "update.own_area"],
        ],
    ])("%s", (_name, group, expected) => {
        expect(ids(group)).toEqual(expected);
    });
});

describe("rowOf", () => {
    const hass = fakeHass(
        [
            { id: "update.plug", device: "d1", state: "on", installed: "2026.1.0", latest: "2026.2.0" },
            { id: "update.twin_a", device: "d2", friendly_name: "Hub firmware" },
            { id: "update.twin_b", device: "d2", friendly_name: "Hub radio firmware" },
            { id: "update.away", device: "d3", state: "unavailable" },
            { id: "update.asleep", device: "d4", state: "on", latest: "2.0.0" },
            { id: "update.lonely", device: "d5", state: "on", latest: "2.0.0" },
            { id: "update.card", platform: "hacs", title: null, features: 0, in_progress: 40 },
        ],
        [
            { id: "d1", name: "plug-1", name_by_user: "Kitchen plug" },
            { id: "d2", name: "hub" },
            { id: "d3", name: "Shed sensor" },
            { id: "d4", name: "Garden sensor" },
            { id: "d5", name: "Lonely sensor" },
        ],
        [
            { id: "binary_sensor.plug_status", device: "d1", state: "on" },
            { id: "binary_sensor.shed_status", device: "d3", state: "unavailable" },
            { id: "sensor.garden_temperature", device: "d4", state: "unavailable" },
            { id: "binary_sensor.garden_status", device: "d4", state: "unavailable" },
        ],
    );
    const counts = deviceCounts(hass);
    const row = (id: string) => rowOf(hass, id, counts)!;

    it("is named after the device, as the user named it", () => {
        expect(row("update.plug")).toMatchObject({
            name: "Kitchen plug",
            installed: "2026.1.0",
            latest: "2026.2.0",
            pending: true,
            canInstall: true,
        });
    });

    it("keeps the entity's own name when its device has several update entities", () => {
        expect([row("update.twin_a").name, row("update.twin_b").name]).toEqual(["Hub firmware", "Hub radio firmware"]);
    });

    it.each([
        ["its entity is unavailable", true, "update.away"],
        ["every other entity of its device is unavailable, though the update entity waits", true, "update.asleep"],
        ["its device has no other entities to tell by", false, "update.lonely"],
        ["its device's other entities are there", false, "update.plug"],
    ])("when %s, is out of reach: %s", (_name, expected, id) => {
        expect(row(id).unreachable).toBe(expected);
        // A row out of reach doesn't wait, so it never keeps the card from folding.
        if (expected) {
            expect(row(id).pending).toBe(false);
        }
    });

    it("names the software by its integration without a title, and reads a progress percentage as installing", () => {
        expect(row("update.card")).toMatchObject({ software: "hacs", canInstall: false, installing: true });
    });
});

describe("bunchesOf", () => {
    const make = (id: string, software: string, installed: string, latest: string, platform = "esphome"): Row => ({
        entity_id: id,
        name: id,
        software,
        softwareKey: `${platform}\u0000${software}`,
        installed,
        latest,
        pending: true,
        installing: false,
        canInstall: true,
        unreachable: false,
    });

    it.each([
        [
            "three of the same software and target",
            [make("a", "ESPHome", "1", "2"), make("b", "ESPHome", "1", "2"), make("c", "ESPHome", "1", "2")],
            [["a", "b", "c"]],
            [],
            "1",
        ],
        [
            "one a release behind still joins, without a common start",
            [make("a", "ESPHome", "1", "2"), make("b", "ESPHome", "0", "2"), make("c", "ESPHome", "1", "2")],
            [["a", "b", "c"]],
            [],
            undefined,
        ],
        ["two stay single", [make("a", "WLED", "1", "2"), make("b", "WLED", "1", "2")], [], ["a", "b"], undefined],
        [
            "different software to the same version never bunches",
            [make("a", "Mushroom", "v1", "v2", "hacs"), make("b", "card-mod", "v1", "v2", "hacs"), make("c", "Bambu", "v1", "v2", "hacs")],
            [],
            ["a", "b", "c"],
            undefined,
        ],
        [
            "the same title in another integration is other software",
            [make("a", "Firmware", "1", "2"), make("b", "Firmware", "1", "2"), make("c", "Firmware", "1", "2", "zha")],
            [],
            ["a", "b", "c"],
            undefined,
        ],
        [
            "different targets split",
            [make("a", "ESPHome", "1", "2"), make("b", "ESPHome", "1", "2"), make("c", "ESPHome", "1", "3")],
            [],
            ["a", "b", "c"],
            undefined,
        ],
    ])("%s", (_name, rows, bunched, singles, from) => {
        const result = bunchesOf(rows);
        expect(result.bunches.map((b) => b.rows.map((r) => r.entity_id))).toEqual(bunched);
        expect(result.singles.map((r) => r.entity_id)).toEqual(singles);
        if (result.bunches[0]) {
            expect(result.bunches[0].from).toBe(from);
        }
    });

    it("keeps the single rows in their order around a bunch", () => {
        const rows = [
            make("a", "X", "1", "2"),
            make("b", "ESPHome", "1", "2"),
            make("c", "ESPHome", "1", "2"),
            make("d", "Y", "1", "2"),
            make("e", "ESPHome", "1", "2"),
        ];
        expect(bunchesOf(rows).singles.map((r) => r.entity_id)).toEqual(["a", "d"]);
    });
});

describe("scriptOf", () => {
    it.each([
        [
            "a script called by its own service",
            { action: "perform-action", perform_action: "script.update_devices" },
            "script.update_devices",
        ],
        ["the older call-service form", { action: "call-service", service: "script.update_devices" }, "script.update_devices"],
        [
            "script.turn_on with one script",
            { action: "perform-action", perform_action: "script.turn_on", target: { entity_id: "script.update_devices" } },
            "script.update_devices",
        ],
        [
            "script.turn_on with a list of one",
            { action: "perform-action", perform_action: "script.turn_on", target: { entity_id: ["script.update_devices"] } },
            "script.update_devices",
        ],
        [
            "script.turn_on with two scripts",
            { action: "perform-action", perform_action: "script.turn_on", target: { entity_id: ["script.a", "script.b"] } },
            undefined,
        ],
        ["script.turn_off", { action: "perform-action", perform_action: "script.turn_off" }, undefined],
        ["script.toggle", { action: "perform-action", perform_action: "script.toggle" }, undefined],
        ["another service", { action: "perform-action", perform_action: "update.install" }, undefined],
        ["navigation", { action: "navigate", navigation_path: "/config/updates" }, undefined],
        ["nothing", undefined, undefined],
    ])("%s", (_name, action, expected) => {
        expect(scriptOf(action)).toBe(expected);
    });
});

describe("statusOf", () => {
    const NOW = 1_000_000;
    const row = (patch: Partial<Row>): Row => ({
        entity_id: "update.plug",
        name: "Plug",
        software: "ESPHome",
        softwareKey: "esphome\u0000ESPHome",
        installed: "1",
        latest: "2",
        pending: true,
        installing: false,
        canInstall: true,
        unreachable: false,
        ...patch,
    });
    const own = (patch: Partial<Install> = {}): Install => ({
        from: "1",
        to: "2",
        software: "ESPHome",
        softwareKey: "esphome\u0000ESPHome",
        by: "row",
        ...patch,
    });
    const run = (patch: Partial<Install> = {}): Install => ({
        from: "1",
        to: "2",
        software: "ESPHome",
        softwareKey: "esphome\u0000ESPHome",
        by: "run",
        ...patch,
    });

    it.each([
        ["nothing followed, waiting", row({}), undefined, "pending"],
        ["nothing followed, installed from elsewhere", row({ installing: true }), undefined, "running"],
        ["own install, call not returned", row({}), own(), "running"],
        [
            "own install, device rebooting and out of reach",
            row({ pending: false, unreachable: true }),
            own({ settled: NOW - 1000 }),
            "running",
        ],
        ["own install, new version", row({ pending: false, installed: "2" }), own({ settled: NOW - 1000 }), "done"],
        ["own install, version unchanged past the wait", row({}), own({ settled: NOW - VERSION_WAIT - 1 }), "failed"],
        ["own install refused", row({}), own({ settled: NOW, error: "No" }), "failed"],
        [
            "own install refused, out of reach",
            row({ pending: false, unreachable: true, installed: "" }),
            own({ settled: NOW, error: "No" }),
            "failed",
        ],
        ["own install refused, being installed from elsewhere", row({ installing: true }), own({ settled: NOW, error: "No" }), "failed"],
        [
            "own install timed out, installed since by something else",
            row({ pending: false, installed: "2" }),
            own({ settled: NOW - VERSION_WAIT - 1 }),
            "done",
        ],
        // A row that moved but has an update waiting is done, and the card lets it go: at once when it was its own, at
        // the end of the run when it was a run's.
        ["own install, version moved but an update still waits", row({ installed: "1.5" }), own({ settled: NOW - 1000 }), "done"],
        [
            "own install, moved but not to the latest past the wait",
            row({ installed: "1.5" }),
            own({ settled: NOW - VERSION_WAIT - 1 }),
            "done",
        ],
        [
            "own install, skipped a release to the latest",
            row({ pending: false, installed: "3", latest: "3" }),
            own({ settled: NOW }),
            "done",
        ],
        [
            "own install, moved and the next release skipped",
            row({ pending: false, installed: "2", latest: "3" }),
            own({ settled: NOW - VERSION_WAIT - 1 }),
            "done",
        ],
        ["own install seen done, a newer update waiting", row({ installed: "2", latest: "3" }), own({ doneAt: NOW - 1000 }), "done"],
        [
            "own install, version unknown while out of reach",
            row({ pending: false, unreachable: true, installed: "" }),
            own({ settled: NOW - 1000 }),
            "running",
        ],
        [
            "own install seen done, now out of reach",
            row({ pending: false, unreachable: true, installed: "" }),
            own({ settled: NOW - VERSION_WAIT - 1, doneAt: NOW - 1000 }),
            "done",
        ],
        ["own install returned within the wait, version unchanged", row({}), own({ settled: NOW - 1000 }), "running"],
        [
            "own install, a sleeping device showing its new version",
            row({ pending: false, unreachable: true, installed: "2" }),
            own({ settled: NOW - VERSION_WAIT - 1 }),
            "done",
        ],
        [
            "own install, moved a step but not to the latest, out of reach",
            row({ pending: false, unreachable: true, installed: "1.5" }),
            own({ settled: NOW - 1000 }),
            "done",
        ],
        [
            "run, seen done, now out of reach",
            row({ pending: false, unreachable: true, installed: "" }),
            run({ doneAt: NOW - 1000 }),
            "done",
        ],
        [
            "own install refused, installed since by something else",
            row({ pending: false, installed: "2" }),
            own({ settled: NOW, error: "No" }),
            "done",
        ],
        ["run, not reached yet", row({}), run(), "waiting"],
        ["run, being installed", row({ installing: true }), run(), "running"],
        ["run, installed", row({ pending: false, installed: "2" }), run(), "done"],
        ["run, back on the old version and out of reach", row({ pending: false, unreachable: true }), run(), "waiting"],
        ["run, moved but not to the latest", row({ installed: "1.5" }), run(), "done"],
        // Done wins over running, so a row a script comes back to stays done.
        ["run, moved and being installed again", row({ installed: "1.5", installing: true }), run(), "done"],
        ["own install, moved and being installed again", row({ installed: "1.5", installing: true }), own({ settled: NOW }), "done"],
        ["run, seen done, a newer update waiting", row({ installed: "2", latest: "3" }), run({ doneAt: NOW - 1000 }), "done"],
        ["run, moved while out of reach", row({ pending: false, unreachable: true, installed: "2" }), run(), "done"],
        ["run, version unknown while out of reach", row({ pending: false, unreachable: true, installed: "" }), run(), "waiting"],
    ] as const)("%s", (_name, r, install, expected) => {
        expect(statusOf(r, install, NOW)).toBe(expected);
    });
});
