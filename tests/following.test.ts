/**
 * How the card follows installs over time: a row's own install, an update-all script's run, and what each leaves on
 * show afterwards. Each test walks Home Assistant's states through the steps a real install goes through.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DONE_KEEP, VERSION_WAIT } from "../src/const";
import type { HomeAssistant } from "../src/hass";
import "../src/updates-card";
import type { UpdatesCard } from "../src/updates-card";
import type { UpdatesCardConfig } from "../src/types";
import { fakeHass } from "./fixtures";
import type { Fake } from "./fixtures";

const SCRIPT = "script.update_devices";
const CONFIG = { type: "custom:updates-card", install_action: { action: "perform-action", perform_action: SCRIPT } } as UpdatesCardConfig;

/** Made-up devices, each its own software so none bunch unless a test says so. */
type Step = Record<string, Partial<Fake>>;
const NAMES = ["Alpha", "Beta", "Gamma"];

function hassOf(step: Step, script: "on" | "off" = "off", title?: string): HomeAssistant & { calls: unknown[][] } {
    const fakes = NAMES.map((name) => ({
        id: `update.${name.toLowerCase()}`,
        device: name,
        friendly_name: name,
        title: title ?? name,
        state: "on",
        installed: "1.0",
        latest: "2.0",
        ...step[name],
    }));
    const hass = fakeHass(
        fakes,
        fakes.map((f) => ({ id: f.device, name: f.friendly_name })),
    );
    hass.states[SCRIPT] = { entity_id: SCRIPT, state: script, last_changed: "", attributes: {} };
    return hass;
}

const DONE: Partial<Fake> = { state: "off", installed: "2.0" };

async function card(hass: HomeAssistant): Promise<UpdatesCard> {
    const element = document.createElement("updates-card");
    element.setConfig(CONFIG);
    element.hass = hass;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

async function set(element: UpdatesCard, hass: HomeAssistant): Promise<void> {
    element.hass = hass;
    await element.updateComplete;
}

/** Moves the clock on, letting the card's own clock tick, and waits for it to draw. */
async function wait(element: UpdatesCard, ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
    await element.updateComplete;
}

const text = (e: Element | null | undefined) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
// What is shown. A shut fold keeps its content in the page, inert, so that it can slide open.
const all = (element: UpdatesCard, selector: string) =>
    [...element.shadowRoot!.querySelectorAll(selector)].filter((e) => !e.closest("[inert]"));
const one = (element: UpdatesCard, selector: string) => all(element, selector)[0] ?? null;

/** What a row shows at its end: its pill, "button" for an install button, or "" for nothing. Undefined when it isn't shown. */
function rowEnd(element: UpdatesCard, name: string): string | undefined {
    const row = all(element, ".row:not(.sib)").find((r) => text(r.querySelector(".name")) === name);
    if (!row) {
        return undefined;
    }
    return row.querySelector(".install") ? "button" : text(row.querySelector(".pill"));
}

function rowVersions(element: UpdatesCard, name: string): string {
    const row = all(element, ".row:not(.sib)").find((r) => text(r.querySelector(".name")) === name);
    return text(row?.querySelector(".ver"));
}

async function press(element: UpdatesCard, name: string): Promise<void> {
    const row = all(element, ".row:not(.sib)").find((r) => text(r.querySelector(".name")) === name)!;
    (row.querySelector(".install") as HTMLButtonElement).click();
    await element.updateComplete;
}

beforeEach(() => {
    vi.useFakeTimers({
        now: Date.parse("2026-10-22T12:00:00Z"),
        toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});

describe("a row's own install", () => {
    it("ends done when the device is installed after the call was refused", async () => {
        const hass = hassOf({});
        hass.callService = () => Promise.reject(new Error("Device busy"));
        const element = await card(hass);
        await press(element, "Alpha");
        await wait(element, 0);
        expect(rowEnd(element, "Alpha")).toBe("button");
        expect(text(one(element, ".errline"))).toBe("Device busy");
        expect(text(one(element, ".hd-sub"))).toBe("Alpha wasn't updated");

        await set(element, hassOf({ Alpha: DONE }));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        expect(one(element, ".errline")).toBeNull();
        expect(text(one(element, ".hd-sub"))).toBe("2 waiting for an update");
    });

    it("keeps its row and versions while the device reboots out of reach", async () => {
        const hass = hassOf({});
        hass.callService = () => new Promise(() => undefined);
        const element = await card(hass);
        await press(element, "Alpha");
        await set(element, hassOf({ Alpha: { state: "unavailable" } }));
        expect(rowEnd(element, "Alpha")).toBe("Updating");
        expect(rowVersions(element, "Alpha")).toBe("1.0 → 2.0");
        expect(one(element, ".off-line")).toBeNull();
        expect((one(element, ".action") as HTMLButtonElement).disabled).toBe(true);
    });

    it("stays done while the device drops off after it", async () => {
        const element = await card(hassOf({}));
        await press(element, "Alpha");
        await set(element, hassOf({ Alpha: DONE }));
        await wait(element, VERSION_WAIT + 10_000);
        await set(element, hassOf({ Alpha: { state: "unavailable" } }));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        expect(rowVersions(element, "Alpha")).toBe("1.0 → 2.0");
        expect(one(element, ".errline")).toBeNull();
        expect(text(one(element, ".hd-sub"))).toBe("2 waiting for an update");
    });

    it("gives a done row its button back when a newer update arrives", async () => {
        const element = await card(hassOf({}));
        await press(element, "Alpha");
        await set(element, hassOf({ Alpha: DONE }));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        await set(element, hassOf({ Alpha: { installed: "2.0", latest: "3.0" } }));
        expect(rowEnd(element, "Alpha")).toBe("button");
        expect(rowVersions(element, "Alpha")).toBe("2.0 → 3.0");
        expect(text(one(element, ".hd-sub"))).toBe("3 waiting for an update");
    });

    it("offers no retry to a failed row whose device sleeps", async () => {
        const hass = hassOf({});
        hass.callService = () => Promise.reject(new Error("Device busy"));
        const element = await card(hass);
        await press(element, "Alpha");
        await wait(element, 0);
        // A sleeping device keeps its update entity, and only its other entities are unavailable.
        const asleep = hassOf({});
        asleep.entities!["sensor.alpha_status"] = { entity_id: "sensor.alpha_status", device_id: "Alpha", platform: "esphome" };
        asleep.states["sensor.alpha_status"] = { entity_id: "sensor.alpha_status", state: "unavailable", last_changed: "", attributes: {} };
        await set(element, asleep);
        expect(rowEnd(element, "Alpha")).toBe("Failed");
        expect(rowVersions(element, "Alpha")).toBe("1.0 → 2.0");
        expect(text(one(element, ".errline"))).toBe("Device busy");

        // It may still show its new version while asleep, and then it is done.
        const updated = hassOf({ Alpha: DONE });
        updated.entities!["sensor.alpha_status"] = asleep.entities!["sensor.alpha_status"];
        updated.states["sensor.alpha_status"] = asleep.states["sensor.alpha_status"];
        await set(element, updated);
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        expect(rowVersions(element, "Alpha")).toBe("1.0 → 2.0");
        expect(one(element, ".errline")).toBeNull();
        expect(text(one(element, ".hd-sub"))).toBe("2 waiting for an update");
        expect(one(element, ".off-line")).toBeNull();
    });

    it("offers no retry to a failed row whose device is away", async () => {
        const hass = hassOf({});
        hass.callService = () => Promise.reject(new Error("Device busy"));
        const element = await card(hass);
        await press(element, "Alpha");
        await wait(element, 0);
        await set(element, hassOf({ Alpha: { state: "unavailable" } }));
        expect(rowEnd(element, "Alpha")).toBe("Failed");
        expect(rowVersions(element, "Alpha")).toBe("1.0 → 2.0");
    });

    it("stays on show for five minutes after it is done, saying all is updated, and then the card folds", async () => {
        const element = await card(hassOf({ Beta: DONE, Gamma: DONE }));
        await press(element, "Alpha");
        await set(element, hassOf({ Alpha: DONE, Beta: DONE, Gamma: DONE }));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        expect(text(one(element, ".hd-sub"))).toBe("All updated");
        expect(one(element, ".action")).toBeNull();
        await wait(element, DONE_KEEP - 10_000);
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        await wait(element, 20_000);
        expect(text(one(element, ".one-sum"))).toBe("All up to date · 3");
    });
});

describe("an update-all script's run", () => {
    it("lets go of the rows it never reached when it stops, and of its done rows five minutes later", async () => {
        const element = await card(hassOf({}, "on"));
        expect([rowEnd(element, "Alpha"), rowEnd(element, "Beta")]).toEqual(["", ""]);
        await set(element, hassOf({ Alpha: DONE }, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 1/3 done");

        await set(element, hassOf({ Alpha: DONE }, "off"));
        expect([rowEnd(element, "Alpha"), rowEnd(element, "Beta"), rowEnd(element, "Gamma")]).toEqual(["Updated", "button", "button"]);
        await wait(element, DONE_KEEP + 10_000);
        expect(rowEnd(element, "Alpha")).toBeUndefined();
    });

    it("drops the last run's done rows when a new one starts, and counts from zero", async () => {
        const element = await card(hassOf({}, "on"));
        await set(element, hassOf({ Alpha: DONE }, "on"));
        await set(element, hassOf({ Alpha: DONE }, "off"));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        await set(element, hassOf({ Alpha: DONE }, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/2 done");
        expect(all(element, ".seg")).toHaveLength(2);
        expect(rowEnd(element, "Alpha")).toBeUndefined();
    });

    it("takes on a row whose own install failed", async () => {
        const hass = hassOf({});
        hass.callService = () => Promise.reject(new Error("Device busy"));
        const element = await card(hass);
        await press(element, "Alpha");
        await wait(element, 0);
        await set(element, hassOf({}, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/3 done");
        await set(element, hassOf({ Alpha: { in_progress: true } }, "on"));
        expect(rowEnd(element, "Alpha")).toBe("Updating");
        expect(one(element, ".errline")).toBeNull();
    });

    it("takes on a row whose own install times out while it runs", async () => {
        const element = await card(hassOf({}));
        await press(element, "Alpha");
        await wait(element, 0);
        await set(element, hassOf({}, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating Alpha · 0/2 done");
        await wait(element, VERSION_WAIT + 10_000);
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/3 done");
        expect(rowEnd(element, "Alpha")).toBe("");
        expect(one(element, ".errline")).toBeNull();
    });

    it("takes on only rows that can be installed", async () => {
        const element = await card(hassOf({ Gamma: { features: 0 } }, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/2 done");
        expect(all(element, ".seg")).toHaveLength(2);
    });

    it("takes on a row whose own install fails while it runs", async () => {
        const hass = hassOf({});
        let refuse: (error: Error) => void = () => {};
        hass.callService = () => new Promise((_resolve, reject) => (refuse = reject));
        const element = await card(hass);
        await press(element, "Alpha");
        await set(element, hassOf({}, "on"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating Alpha · 0/2 done");
        refuse(new Error("Device busy"));
        await wait(element, 0);
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/3 done");
        expect(rowEnd(element, "Alpha")).toBe("");
        expect(one(element, ".errline")).toBeNull();
    });

    describe("a bunch with none of the run's rows", () => {
        // Rows the card can't install are never the run's, and neither is one whose own install is done, or failed while
        // its device is away.
        const OTHERS = { Beta: { features: 0 }, Gamma: { features: 0 } };
        it.each([
            ["one of it installed from elsewhere", undefined, { features: 0, in_progress: true }, "Updating"],
            ["none of it installing", undefined, { features: 0 }, ""],
            ["an own install of it failed while its device is away", "refused", { state: "unavailable" }, "Failed"],
            ["an own install of it done", "done", DONE, ""],
            ["an own install of it still going when the run starts", "running", {}, "Updating"],
            ["an own install of it failed while its device sleeps", "refused", "asleep", "Failed"],
            ["an own install of it still going while its device reboots", "running", { state: "unavailable" }, "Updating"],
            ["an own install of it done, its device away", "done", { state: "unavailable" }, ""],
        ] as const)("shows its plain status: %s", async (_name, own, alpha, pill) => {
            const hass = hassOf(OTHERS, "off", "Firmware");
            if (own === "refused") {
                hass.callService = () => Promise.reject(new Error("Device busy"));
            } else if (own === "running") {
                hass.callService = () => new Promise(() => undefined);
            }
            const element = await card(hass);
            if (own) {
                (one(element, ".sum") as HTMLButtonElement).click();
                await element.updateComplete;
                await press(element, "Alpha");
                await wait(element, 0);
            }
            if (own === "done") {
                await set(element, hassOf({ ...OTHERS, Alpha: DONE }, "off", "Firmware"));
            }
            const during = hassOf({ ...OTHERS, Alpha: alpha === "asleep" ? {} : alpha }, "on", "Firmware");
            if (alpha === "asleep") {
                // A sleeping device keeps its update entity, and only its other entities are unavailable.
                during.entities!["sensor.alpha_status"] = { entity_id: "sensor.alpha_status", device_id: "Alpha", platform: "esphome" };
                during.states["sensor.alpha_status"] = {
                    entity_id: "sensor.alpha_status",
                    state: "unavailable",
                    last_changed: "",
                    attributes: {},
                };
            }
            await set(element, during);
            expect(text(one(element, ".hd-sub"))).toMatch(/^Updating/);
            expect(text(one(element, ".sum .name"))).toBe("Firmware3");
            expect(text(one(element, ".sum .pill"))).toBe(pill);
        });
    });

    it("splits a bunch by target when a newer release arrives during the run", async () => {
        const element = await card(hassOf({}, "on", "Firmware"));
        await set(element, hassOf({ Alpha: DONE }, "on", "Firmware"));
        expect(text(one(element, ".sum .name"))).toBe("Firmware3");
        // The rows done keep the version they got, the rest show the new one, which the script installs.
        const newer = { latest: "2.1" };
        await set(element, hassOf({ Alpha: { installed: "2.0", latest: "2.1" }, Beta: newer, Gamma: newer }, "on", "Firmware"));
        expect(one(element, ".sum")).toBeNull();
        expect([rowEnd(element, "Alpha"), rowVersions(element, "Alpha")]).toEqual(["Updated", "1.0 → 2.0"]);
        expect([rowEnd(element, "Beta"), rowVersions(element, "Beta")]).toEqual(["", "1.0 → 2.1"]);
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 1/3 done");
    });

    it("keeps a done row done while its device drops off during the run", async () => {
        const element = await card(hassOf({}, "on"));
        await set(element, hassOf({ Alpha: DONE }, "on"));
        await set(element, hassOf({ Alpha: { state: "unavailable" } }, "on"));
        expect(rowEnd(element, "Alpha")).toBe("Updated");
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 1/3 done");
    });

    it("keeps a rebooting device in its bunch", async () => {
        const element = await card(hassOf({}, "on", "Firmware"));
        await set(element, hassOf({ Alpha: { state: "unavailable" } }, "on", "Firmware"));
        expect(all(element, ".sum").map((s) => text(s.querySelector(".name")))).toEqual(["Firmware3"]);
        expect(all(element, ".sum").map((s) => text(s.querySelector(".ver")))).toEqual(["1.0 → 2.0"]);
        expect(rowEnd(element, "Alpha")).toBeUndefined();
        expect(one(element, ".off-line")).toBeNull();
    });

    it("counts a bunch's pill from the run's rows, as the header does", async () => {
        const element = await card(hassOf({}, "off", "Firmware"));
        (one(element, ".sum") as HTMLButtonElement).click();
        await element.updateComplete;
        await press(element, "Alpha");
        await set(element, hassOf({ Alpha: DONE }, "off", "Firmware"));
        await set(element, hassOf({ Alpha: DONE }, "on", "Firmware"));
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/2 done");
        expect(text(one(element, ".sum .pill"))).toBe("0/2");
        expect(one(element, ".sum .pill")!.classList.contains("off")).toBe(true);
    });

    describe("a bunch's count during a run", () => {
        it.each([
            ["nothing of it reached yet", {}, "neutral", "0/3"],
            ["one of it installing", { Alpha: { in_progress: true } }, "running", "0/3"],
            ["one installing and one done", { Alpha: DONE, Beta: { in_progress: true } }, "running", "1/3"],
            ["some of it done", { Alpha: DONE }, "neutral", "1/3"],
            ["all of it done", { Alpha: DONE, Beta: DONE, Gamma: DONE }, "done", "3/3"],
        ] as const)("marks a bunch's count by how it goes: %s", async (_name, step, kind, count) => {
            const element = await card(hassOf({}, "on", "Firmware"));
            await set(element, hassOf(step, "on", "Firmware"));
            const pill = one(element, ".sum .pill")!;
            expect(["running", "done"].find((c) => pill.classList.contains(c)) ?? "neutral").toBe(kind);
            expect(text(pill)).toBe(count);
        });
    });
});

describe("a done row with an update waiting", () => {
    // A done row with an update waiting gets its button back, at once after its own install and when the run ends after a
    // run's. A run counts it as done until then, and doesn't take it on again.
    const UP: Partial<Fake> = { installed: "2.0", latest: "3.0" };
    const STEP: Partial<Fake> = { installed: "1.5" };
    const SKIPPED: Partial<Fake> = { state: "off", installed: "2.0", latest: "3.0" };
    it.each([
        [
            "its own install moved, but not to the latest",
            {},
            true,
            [[{ Alpha: STEP }, "off"]],
            "button",
            "1.5 → 2.0",
            "3 waiting for an update",
        ],
        [
            "its own install done, then a newer update",
            {},
            true,
            [
                [{ Alpha: DONE }, "off"],
                [{ Alpha: UP }, "off"],
            ],
            "button",
            "2.0 → 3.0",
            "3 waiting for an update",
        ],
        [
            "its own install done, the next release skipped",
            {},
            true,
            [[{ Alpha: SKIPPED }, "off"]],
            "Updated",
            "1.0 → 2.0",
            "2 waiting for an update",
        ],
        [
            "a run's row done, then a newer update during the run",
            {},
            false,
            [
                [{ Alpha: DONE }, "on"],
                [{ Alpha: UP }, "on"],
            ],
            "Updated",
            "1.0 → 2.0",
            "Updating all · 1/3 done",
        ],
        [
            "a run's row moved, but not to the latest",
            {},
            false,
            [[{ Alpha: STEP }, "on"]],
            "Updated",
            "1.0 → 1.5",
            "Updating all · 1/3 done",
        ],
        [
            "a run's row moved, but not to the latest, when the run ends",
            {},
            false,
            [
                [{ Alpha: STEP }, "on"],
                [{ Alpha: STEP }, "off"],
            ],
            "button",
            "1.5 → 2.0",
            "3 waiting for an update",
        ],
        [
            "its own install done, then a newer update during a run, which doesn't take it on",
            {},
            true,
            [
                [{ Alpha: DONE }, "off"],
                [{ Alpha: DONE }, "on"],
                [{ Alpha: UP }, "on"],
            ],
            "",
            "2.0 → 3.0",
            "Updating all · 0/2 done",
        ],
        [
            "a run's row done, then a newer update, when the run ends",
            {},
            false,
            [
                [{ Alpha: DONE }, "on"],
                [{ Alpha: UP }, "on"],
                [{ Alpha: UP }, "off"],
            ],
            "button",
            "2.0 → 3.0",
            "3 waiting for an update",
        ],
        [
            "a run's row done, then a newer update, when the next run starts",
            {},
            false,
            [
                [{ Alpha: DONE }, "on"],
                [{ Alpha: UP }, "on"],
                [{ Alpha: UP }, "off"],
                [{ Alpha: UP }, "on"],
            ],
            "",
            "2.0 → 3.0",
            "Updating all · 0/3 done",
        ],
        [
            "a run's row done, then a newer update after the run",
            {},
            false,
            [
                [{ Alpha: DONE }, "on"],
                [{ Alpha: DONE }, "off"],
                [{ Alpha: UP }, "off"],
            ],
            "button",
            "2.0 → 3.0",
            "3 waiting for an update",
        ],
        [
            "a run's row done, the next release skipped",
            {},
            false,
            [[{ Alpha: SKIPPED }, "on"]],
            "Updated",
            "1.0 → 2.0",
            "Updating all · 1/3 done",
        ],
        [
            "a run's row done, the next release skipped, when the run ends",
            {},
            false,
            [
                [{ Alpha: SKIPPED }, "on"],
                [{ Alpha: SKIPPED }, "off"],
            ],
            "Updated",
            "1.0 → 2.0",
            "2 waiting for an update",
        ],
        [
            "the run's only row done, then a newer update during the run",
            { Beta: DONE, Gamma: DONE },
            false,
            [
                [{ Alpha: DONE, Beta: DONE, Gamma: DONE }, "on"],
                [{ Alpha: UP, Beta: DONE, Gamma: DONE }, "on"],
            ],
            "Updated",
            "1.0 → 2.0",
            "Updating all · 1/1 done",
        ],
    ] as const)("%s", async (_name, start, own, steps, end, versions, line) => {
        const element = await card(hassOf(start, own ? "off" : "on"));
        if (own) {
            await press(element, "Alpha");
        }
        for (const [step, script] of steps) {
            await set(element, hassOf(step, script));
        }
        expect(rowEnd(element, "Alpha")).toBe(end);
        expect(rowVersions(element, "Alpha")).toBe(versions);
        expect(text(one(element, ".hd-sub"))).toBe(line);
    });
});
