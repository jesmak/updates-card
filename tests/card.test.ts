import { afterEach, describe, expect, it } from "vitest";

import type { HomeAssistant } from "../src/hass";
import "../src/updates-card";
import type { UpdatesCard } from "../src/updates-card";
import type { UpdatesCardConfig } from "../src/types";
import { fakeHass } from "./fixtures";
import type { Fake } from "./fixtures";

// Made-up devices at a made-up house and garden shed.
const HOUSE = ["Kitchen plug", "Hall light", "Desk lamp", "Heat pump plug"];
const SHED = ["Shed sensor", "Shed heater plug", "Gate controller"];

function devices(names: string[], area: string, state: Partial<Fake> = {}): Fake[] {
    return names.map((name, i) => ({ id: `update.${area}_${i}`, device: `${area}_${i}`, friendly_name: name, ...state }));
}

/** The house and the shed, each device in the state given, and a few house devices, by their place in HOUSE, in their own. */
function home(state: Partial<Fake>, shed: Partial<Fake> = state, house: Record<number, Partial<Fake>> = {}) {
    const updates = [...devices(HOUSE, "house", state), ...devices(SHED, "shed", shed)].map((u, i) => ({ ...u, ...house[i] }));
    return fakeHass(
        updates,
        updates.map((u) => ({ id: u.device!, name: u.friendly_name!, area: u.device!.startsWith("shed") ? "cabin" : undefined })),
    );
}

const WAITING: Partial<Fake> = { state: "on", installed: "2026.1.0", latest: "2026.2.0" };

const CONFIG: Partial<UpdatesCardConfig> = {
    title: "Devices",
    groups: [
        { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
        { name: "Shed", integration: "esphome", areas: ["cabin"] },
    ],
    install_action: { action: "perform-action", perform_action: "script.update_devices" },
};

async function card(hass: HomeAssistant, config: Partial<UpdatesCardConfig> = CONFIG, layout?: string): Promise<UpdatesCard> {
    const element = document.createElement("updates-card");
    element.setConfig({ type: "custom:updates-card", ...config } as UpdatesCardConfig);
    element.layout = layout;
    element.hass = hass;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

function text(element: Element | null | undefined): string {
    return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

// What is shown. A shut fold keeps its content in the page, inert, so that it can slide open.
const all = (element: UpdatesCard, selector: string) =>
    [...element.shadowRoot!.querySelectorAll(selector)].filter((e) => !e.closest("[inert]"));
const one = (element: UpdatesCard, selector: string) => all(element, selector)[0] ?? null;

afterEach(() => {
    document.body.innerHTML = "";
});

describe("updates-card", () => {
    it("is one line when nothing waits, and opens to every device by group", async () => {
        const element = await card(home({ installed: "2026.2.0" }));
        expect(text(one(element, ".one"))).toBe("Devices All up to date · 7");
        expect(one(element, ".cols")).toBeNull();
        (one(element, ".one") as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".grp-h").map(text)).toEqual(["House4", "Shed3"]);
        expect(all(element, ".row.sib .name").map(text)).toEqual([...HOUSE].sort().concat([...SHED].sort()));
    });

    it("folds devices out of reach into the one line, and names them there", async () => {
        const element = await card(home({ installed: "2026.2.0" }, { state: "unavailable" }));
        expect(text(one(element, ".one-sum"))).toBe("Up to date · 3 unreachable");
        (one(element, ".one") as HTMLButtonElement).click();
        await element.updateComplete;
        (one(element, ".off-line") as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".grp-body.muted .row .name").map(text)).toEqual([...SHED].sort());
        expect(all(element, ".grp-body.muted .off-state").map(text)).toEqual(["Unreachable", "Unreachable", "Unreachable"]);
    });

    describe("the Update all button", () => {
        it.each([
            ["no action", undefined, "off", ""],
            ["the action that does nothing", { action: "none" }, "off", ""],
            ["a script", { action: "perform-action", perform_action: "script.update_devices" }, "off", "Update all"],
            ["a script that runs", { action: "perform-action", perform_action: "script.update_devices" }, "on", "Stop"],
            ["an action that isn't a script", { action: "navigate", navigation_path: "/config/updates" }, "on", "Update all"],
        ])("offers Update all with %s only when it does something", async (_name, action, script, button) => {
            const hass = home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" });
            hass.states["script.update_devices"] = { entity_id: "script.update_devices", state: script, last_changed: "", attributes: {} };
            const element = await card(hass, { ...CONFIG, install_action: action });
            expect(text(one(element, ".action"))).toBe(button);
        });
    });

    it("opens the rows up to date from the switch at the bottom, a group with nothing waiting whole", async () => {
        const element = await card(home({ installed: "2026.2.0" }, undefined, { 0: WAITING }));
        expect(all(element, ".grp-h").map(text)).toEqual(["House"]);
        expect(all(element, ".row .name").map(text)).toEqual(["Kitchen plug"]);
        expect(text(one(element, ".switch"))).toBe("6 up to date Show");

        (one(element, ".switch") as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".grp-h").map(text)).toEqual(["House", "Shed"]);
        expect(all(element, ".row.sib .name").map(text)).toEqual(["Desk lamp", "Hall light", "Heat pump plug", ...[...SHED].sort()]);
        expect(text(one(element, ".switch"))).toBe("6 up to date Hide");
    });

    it("puts the line of devices out of reach at the end of its group, after the rows up to date", async () => {
        const element = await card(home({ installed: "2026.2.0" }, WAITING, { 1: { state: "unavailable" } }));
        (one(element, ".switch") as HTMLButtonElement).click();
        await element.updateComplete;
        const house = all(element, ".group").find((g) => text(g.querySelector(".grp-h")) === "House")!;
        const order = [...house.querySelectorAll(".row.sib, .off-line")]
            .filter((e) => !e.closest("[inert]"))
            .map((e) => (e.classList.contains("off-line") ? "line" : "row"));
        expect(order).toEqual(["row", "row", "row", "line"]);
    });

    it("bunches waiting devices of the same software and version, and lists them all when opened", async () => {
        const element = await card(home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" }));
        expect(text(one(element, ".hd-sub"))).toBe("7 waiting for an update");
        expect(all(element, ".sum").map(text)).toEqual(["Firmware4 2026.1.0 → 2026.2.0", "Firmware3 2026.1.0 → 2026.2.0"]);
        // A summary row has no install button of its own.
        expect(all(element, ".sum .install")).toHaveLength(0);
        (all(element, ".sum")[1] as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".row .name").map(text)).toEqual([...SHED].sort());
        expect(all(element, ".row .install")).toHaveLength(3);
        expect(text(one(element, ".action"))).toBe("Update all");
    });

    it("installs one row at a time, and calls update.install for that row alone", async () => {
        const hass = fakeHass([
            { id: "update.a", state: "on", latest: "2.0.0", friendly_name: "Alpha" },
            { id: "update.b", state: "on", latest: "2.0.0", friendly_name: "Beta", title: "Other" },
        ]);
        let finish = () => {};
        hass.callService = (...args: unknown[]) => {
            hass.calls.push(args);
            return new Promise<void>((resolve) => (finish = resolve));
        };
        const element = await card(hass, {});
        (all(element, ".install")[0] as HTMLButtonElement).click();
        await element.updateComplete;
        expect(hass.calls).toEqual([["update", "install", {}, { entity_id: "update.a" }]]);
        expect(text(one(element, ".pill.running"))).toBe("Updating");
        expect((all(element, ".install")[0] as HTMLButtonElement).disabled).toBe(true);
        expect(text(one(element, ".hd-sub"))).toBe("Updating Alpha");
        finish();
    });

    it("hides the row buttons while the update-all script runs, and offers to stop it", async () => {
        const hass = home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" });
        hass.states["script.update_devices"] = { entity_id: "script.update_devices", state: "on", last_changed: "", attributes: {} };
        const element = await card(hass);
        expect(text(one(element, ".action"))).toBe("Stop");
        for (const sum of all(element, ".sum")) {
            (sum as HTMLButtonElement).click();
        }
        await element.updateComplete;
        expect(all(element, ".install")).toHaveLength(0);
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/7 done");

        const actions: unknown[] = [];
        element.addEventListener("hass-action", (e) => actions.push((e as CustomEvent).detail));
        (one(element, ".action") as HTMLButtonElement).click();
        expect(actions).toEqual([
            {
                action: "tap",
                config: {
                    tap_action: {
                        action: "perform-action",
                        perform_action: "script.turn_off",
                        target: { entity_id: "script.update_devices" },
                        confirmation: { text: expect.any(String) },
                    },
                },
            },
        ]);
    });

    it.each([
        ["a maximum height", undefined, { max_height: 300 }, "max-height: 300px"],
        ["grid rows in a sections view win over it", "grid", { max_height: 300, grid_options: { rows: 6 } }, "height: 100%"],
        ["automatic grid rows leave it in force", "grid", { max_height: 300, grid_options: { rows: "auto" } }, "max-height: 300px"],
        ["neither", undefined, {}, ""],
    ])("sizes itself by %s", async (_name, layout, extra, style) => {
        const element = await card(home({ installed: "2026.2.0" }), { ...CONFIG, ...extra }, layout);
        expect(one(element, "ha-card")!.getAttribute("style") ?? "").toBe(style);
    });
});

describe("updates-card following an update-all script", () => {
    it("takes on the rows that wait once there are some, when it saw the script start before them", async () => {
        const hass = home({ installed: "2026.2.0" });
        hass.states["script.update_devices"] = { entity_id: "script.update_devices", state: "on", last_changed: "", attributes: {} };
        const element = await card(hass);
        expect(text(one(element, ".one-sum"))).toBe("All up to date · 7");

        const waiting = home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" });
        waiting.states["script.update_devices"] = hass.states["script.update_devices"];
        element.hass = waiting;
        await element.updateComplete;
        expect(text(one(element, ".hd-sub"))).toBe("Updating all · 0/7 done");
        expect(all(element, ".seg")).toHaveLength(7);
    });
});

describe("updates-card's own elements", () => {
    // Bunches and rows are keyed and every group has one fold, so each keeps its element through the changes below.
    const CURRENT: Partial<Fake> = { installed: "2026.2.0" };
    const AWAY: Partial<Fake> = { state: "unavailable" };
    /** Four Alpha and four Beta devices, of which those from `first` up to the count given wait for 2.0. */
    const bunched = (alpha: number, beta: number, first = 1) =>
        fakeHass(
            [..."1234"].flatMap((n) =>
                ["a", "b"].map((s) => {
                    const waits = Number(n) >= first && Number(n) <= (s === "a" ? alpha : beta);
                    return {
                        id: `update.${s}${n}`,
                        state: waits ? "on" : "off",
                        installed: waits ? "1.0" : "2.0",
                        latest: "2.0",
                        title: s === "a" ? "Alpha" : "Beta",
                        friendly_name: `${s}${n}`,
                    };
                }),
            ),
        );
    // The shed waits throughout, so that the card never folds into one line.
    const house = (devices: Record<number, Partial<Fake>>) => home(CURRENT, WAITING, devices);
    const named = (element: UpdatesCard, selector: string, name: string) =>
        [...element.shadowRoot!.querySelectorAll(selector)].find((e) => text(e.querySelector(".name, .grp-h") ?? e).startsWith(name))!;
    const click = async (element: UpdatesCard, target: Element) => {
        (target as HTMLElement).click();
        await element.updateComplete;
    };
    const shown = (e: Element) => e.closest("[inert]") === null;
    const rowIn = (group: Element, name: string) =>
        [...group.querySelectorAll(".row")].find((r) => text(r.querySelector(".name")) === name)!;

    it.each([
        {
            name: "an open bunch, when a bunch before it dissolves",
            before: bunched(3, 3),
            open: (e: UpdatesCard) => click(e, named(e, ".sum", "Beta")),
            after: bunched(2, 3),
            pick: (e: UpdatesCard) => named(e, ".sum", "Beta").nextElementSibling!,
            then: (_e: UpdatesCard, fold: Element) => expect(fold.classList.contains("open")).toBe(true),
        },
        {
            name: "an open bunch, when a bunch forms before it",
            before: bunched(2, 3),
            open: (e: UpdatesCard) => click(e, named(e, ".sum", "Beta")),
            after: bunched(3, 3),
            pick: (e: UpdatesCard) => named(e, ".sum", "Beta").nextElementSibling!,
            then: (_e: UpdatesCard, fold: Element) => expect(fold.classList.contains("open")).toBe(true),
        },
        {
            name: "a row in a bunch, when a row before it leaves",
            before: bunched(0, 4),
            open: (e: UpdatesCard) => click(e, named(e, ".sum", "Beta")),
            after: bunched(0, 4, 2),
            pick: (e: UpdatesCard) => named(e, ".row", "b3"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("b3"),
        },
        {
            name: "a group, when its last waiting row leaves while the rest are open",
            before: house({ 0: WAITING }),
            open: (e: UpdatesCard) => click(e, one(e, ".switch")!),
            after: house({}),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(true),
        },
        {
            name: "a group, when its last waiting row leaves while the rest are shut",
            before: house({ 0: WAITING }),
            after: house({}),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            hidden: true,
        },
        {
            name: "a group, when its first row starts waiting while the rest are shut",
            before: house({}),
            after: house({ 0: WAITING }),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(false),
        },
        {
            name: "a group, when its first row starts waiting while the rest are open",
            before: house({}),
            open: (e: UpdatesCard) => click(e, one(e, ".switch")!),
            after: house({ 0: WAITING }),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(true),
        },
        {
            name: "a group, when its only device out of reach comes back while the rest are shut",
            before: house({ 0: AWAY }),
            after: house({}),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            hidden: true,
        },
        {
            name: "a group, when a device of it goes out of reach while the rest are shut",
            before: house({}),
            after: house({ 0: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(false),
        },
        {
            name: "a group, when a device of it goes out of reach while the rest are open",
            before: house({}),
            open: (e: UpdatesCard) => click(e, one(e, ".switch")!),
            after: house({ 0: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(true),
        },
        {
            name: "a group, when its only device out of reach comes back while the rest are open",
            before: house({ 0: AWAY }),
            open: (e: UpdatesCard) => click(e, one(e, ".switch")!),
            after: house({}),
            pick: (e: UpdatesCard) => named(e, ".group", "House"),
            then: (_e: UpdatesCard, group: Element) => expect(shown(rowIn(group, "Hall light"))).toBe(true),
        },
        {
            name: "a row up to date, when a row before it starts waiting",
            before: house({}),
            open: (e: UpdatesCard) => click(e, one(e, ".switch")!),
            after: house({ 2: WAITING }),
            pick: (e: UpdatesCard) => named(e, ".row.sib", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
        {
            name: "a waiting row, when a row before it starts waiting",
            before: house({ 1: WAITING }),
            after: house({ 1: WAITING, 2: { ...WAITING, title: "Other" } }),
            pick: (e: UpdatesCard) => named(e, ".row", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
        {
            name: "a row out of reach, when a row before it goes away",
            before: house({ 1: AWAY }),
            open: (e: UpdatesCard) => click(e, named(e, ".off-line", "")),
            after: house({ 1: AWAY, 2: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".row", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
        {
            name: "a row out of reach in the one-line card, when a row before it goes away",
            before: home(CURRENT, CURRENT, { 1: AWAY }),
            open: async (e: UpdatesCard) => {
                await click(e, one(e, ".one")!);
                await click(e, named(e, ".off-line", ""));
            },
            after: home(CURRENT, CURRENT, { 1: AWAY, 2: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".row", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
        {
            name: "a row of the one-line card, when a row before it goes away",
            before: home(CURRENT),
            open: (e: UpdatesCard) => click(e, one(e, ".one")!),
            after: home(CURRENT, CURRENT, { 2: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".row.sib", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
    ])("keeps $name", async ({ before, open, after, pick, then, hidden }) => {
        const element = await card(before);
        await open?.(element);
        const picked = pick(element);
        expect(picked).toBeDefined();
        element.hass = after;
        await element.updateComplete;
        expect(pick(element)).toBe(picked);
        expect(picked.isConnected).toBe(true);
        expect(shown(picked)).toBe(!hidden);
        then?.(element, picked);
    });

    it("keeps a row through its own install failing, with its error line after it", async () => {
        const hass = house({ 1: WAITING });
        hass.callService = () => Promise.reject(new Error("Device busy"));
        const element = await card(hass);
        const row = named(element, ".row", "Hall light");
        (row.querySelector(".install") as HTMLButtonElement).click();
        await element.updateComplete;
        await Promise.resolve();
        await element.updateComplete;
        expect(named(element, ".row", "Hall light")).toBe(row);
        expect(text(row.nextElementSibling)).toBe("Device busy");

        element.hass = house({ 1: WAITING, 2: WAITING });
        await element.updateComplete;
        expect(named(element, ".row", "Hall light")).toBe(row);
        expect(text(row.nextElementSibling)).toBe("Device busy");
    });
});
