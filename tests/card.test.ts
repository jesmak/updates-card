import { afterEach, describe, expect, it } from "vitest";

import type { HomeAssistant } from "../src/hass";
import { browserLanguage, translate } from "../src/localize/localize";
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
    it("says all is up to date under a check when nothing waits, and its line of those up to date opens to every device by group", async () => {
        const element = await card(home({ installed: "2026.2.0" }));
        expect(text(one(element, ".hd"))).toBe("Devices");
        expect(one(element, ".hd .hd-icon")?.getAttribute("icon")).toBe("mdi:check-circle-outline");
        expect(text(one(element, ".hd-sub"))).toBe("All up to date");
        expect(text(one(element, ".switch.quiet"))).toBe("7 up to date Show");
        // Out of the list, which is what scrolls when the card is held, so the line stays while the devices scroll.
        expect(one(element, ".switch.quiet")!.parentElement!.tagName).toBe("HA-CARD");
        expect(one(element, ".list .switch")).toBeNull();
        expect(one(element, ".cols")).toBeNull();
        (one(element, ".switch.quiet") as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".grp-h").map(text)).toEqual(["House4", "Shed3"]);
        expect(all(element, ".row.sib .name").map(text)).toEqual([...HOUSE].sort().concat([...SHED].sort()));
    });

    it("counts devices out of reach in its status line, and shows them in their groups", async () => {
        const element = await card(home({ installed: "2026.2.0" }, { state: "unavailable" }));
        expect(text(one(element, ".hd-sub"))).toBe("Up to date · 3 unreachable");
        expect(text(one(element, ".switch.quiet .switch-text"))).toBe("4 up to date");
        (one(element, ".switch.quiet") as HTMLButtonElement).click();
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

    it("keeps sliding while another fold still slides, and lets go once the last one ends", async () => {
        const element = await card(home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" }));
        const sliding = () => element.shadowRoot!.querySelector("ha-card")!.classList.contains("sliding");
        const end = (fold: HTMLElement) => {
            const event = new Event("transitionend", { bubbles: true, composed: true }) as TransitionEvent;
            Object.defineProperty(event, "propertyName", { value: "grid-template-rows" });
            fold.dispatchEvent(event);
        };
        (all(element, ".sum")[0] as HTMLButtonElement).click();
        (all(element, ".sum")[1] as HTMLButtonElement).click();
        await element.updateComplete;
        const [first, other] = element.shadowRoot!.querySelectorAll<HTMLElement>(".fold");
        other!.getAnimations = () => [{}] as Animation[];
        end(first!);
        await element.updateComplete;
        expect(sliding()).toBe(true);
        other!.getAnimations = () => [];
        end(other!);
        await element.updateComplete;
        expect(sliding()).toBe(false);
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
        ["held to a height", undefined, { height: 300 }, ["fade-bottom"]],
        ["held up to a limit", undefined, { max_height: 300 }, ["fade-bottom"]],
        ["held by rows in a sections view", "grid", { grid_options: { rows: 4 } }, ["fade-bottom"]],
        [
            "held to a height with automatic rows in a sections view",
            "grid",
            { height: 300, grid_options: { rows: "auto" } },
            ["fade-bottom"],
        ],
        ["held by the older layout options' rows in a sections view", "grid", { layout_options: { grid_rows: 4 } }, ["fade-bottom"]],
        ["never in auto", undefined, {}, []],
        ["never in auto with automatic rows in a sections view", "grid", { grid_options: { rows: "auto" } }, []],
        ["never by grid rows outside a sections view", undefined, { grid_options: { rows: 4 } }, []],
    ])("fades the bottom edge of a list that runs past it when %s", async (_name, layout, extra, expected) => {
        const element = await card(home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" }), { ...CONFIG, ...extra }, layout);
        const list = one(element, ".list") as HTMLElement;
        Object.defineProperty(list, "scrollHeight", { value: 600, configurable: true });
        Object.defineProperty(list, "clientHeight", { value: 200, configurable: true });
        element.requestUpdate();
        await element.updateComplete;
        expect(["fade-top", "fade-bottom"].filter((name) => list.classList.contains(name))).toEqual(expected);
    });

    it("fades the bottom edge of the groups' lines under a held card's line of those up to date, and lets go of them when the list opens", async () => {
        const element = await quiet({ height: 300 });
        const idle = one(element, ".idle") as HTMLElement;
        Object.defineProperty(idle, "scrollHeight", { value: 600, configurable: true });
        Object.defineProperty(idle, "clientHeight", { value: 200, configurable: true });
        element.requestUpdate();
        await element.updateComplete;
        expect([...idle.classList].filter((name) => name.startsWith("fade"))).toEqual(["fades", "fade-bottom"]);
        (one(element, ".switch.quiet") as HTMLElement).click();
        await element.updateComplete;
        expect(one(element, ".idle")).toBeNull();
        expect([...idle.classList].filter((name) => name.startsWith("fade"))).toEqual([]);
    });

    it("fills its rows by its own parts, never by an element a theme adds to it", async () => {
        const element = await quiet({}, "grid");
        const haCard = one(element, "ha-card") as HTMLElement;
        const box = (target: Element, height: number, width = 300) =>
            (target.getBoundingClientRect = () => ({ top: 0, bottom: height, height, width }) as DOMRect);
        Object.defineProperty(haCard, "clientWidth", { value: 300, configurable: true });
        box(haCard, 56);
        box(one(element, ".hd")!, 41);
        box(one(element, ".hd-sub")!, 17);
        const line = one(element, ".switch.quiet") as HTMLElement;
        box(line, 44);
        const fill = async () => {
            (element as unknown as { fillRows(): void }).fillRows();
            await element.updateComplete;
            return haCard.getAttribute("style") ?? "";
        };
        const own = await fill();
        expect(own).toMatch(/^min-height: \d+px/);
        const themed = document.createElement("div");
        box(themed, 500);
        haCard.append(themed);
        expect(await fill()).toBe(own);
        box(line, 248);
        expect(await fill()).not.toBe(own);
    });

    it("grows up to a limit on its rows: the rows its content needs under the limit, and the limit on the rows over it", async () => {
        const element = await quiet({ max_height: 600 }, "grid");
        const haCard = one(element, "ha-card") as HTMLElement;
        const box = (target: Element, height: number, width = 300) =>
            (target.getBoundingClientRect = () => ({ top: 0, bottom: height, height, width }) as DOMRect);
        Object.defineProperty(haCard, "clientWidth", { value: 300, configurable: true });
        box(haCard, 56);
        box(one(element, ".hd")!, 41);
        box(one(element, ".hd-sub")!, 17);
        const line = one(element, ".switch.quiet") as HTMLElement;
        const fill = async (height: number) => {
            box(line, height);
            (element as unknown as { fillRows(): void }).fillRows();
            await element.updateComplete;
            return haCard.getAttribute("style") ?? "";
        };
        expect(await fill(44)).toMatch(/^max-height: 568px; min-height: (56|120|184)px; --uc-spare: \d+px$/);
        expect(await fill(900)).toBe("max-height: 568px; min-height: 568px; --uc-spare: 0px");
    });

    it.each([
        ["with updates waiting", home(WAITING), CONFIG.groups!],
        ["with no entities", home({ installed: "2026.2.0" }), [{ name: "Nothing", entities: ["update.not_there"] }]],
    ])("held to a set height, shows no check %s", async (_name, hass, groups) => {
        const element = await card(hass, { ...CONFIG, groups, height: 300 });
        expect(one(element, ".idle")).toBeNull();
    });

    it("lets go of the list's fade when the card goes from held to auto, and fades it again when held again", async () => {
        const element = await card(home({ state: "on", installed: "2026.1.0", latest: "2026.2.0" }), { ...CONFIG, height: 300 });
        const list = one(element, ".list") as HTMLElement;
        Object.defineProperty(list, "scrollHeight", { value: 600, configurable: true });
        Object.defineProperty(list, "clientHeight", { value: 200, configurable: true });
        element.requestUpdate();
        await element.updateComplete;
        expect([...list.classList].filter((name) => name.startsWith("fade"))).toEqual(["fades", "fade-bottom"]);
        element.setConfig({ type: "custom:updates-card", ...CONFIG } as UpdatesCardConfig);
        await element.updateComplete;
        expect([...list.classList].filter((name) => name.startsWith("fade"))).toEqual([]);
        element.setConfig({ type: "custom:updates-card", ...CONFIG, height: 300 } as UpdatesCardConfig);
        await element.updateComplete;
        expect([...list.classList].filter((name) => name.startsWith("fade"))).toEqual(["fades", "fade-bottom"]);
    });

    /** The card with nothing waiting, these entities out of reach, and its list opened when asked. */
    async function quiet(config: Partial<UpdatesCardConfig>, layout?: string, down: string[] = [], open = false): Promise<UpdatesCard> {
        const element = await card(home({ installed: "2026.2.0" }), { ...CONFIG, ...config }, layout);
        const states = { ...element.hass!.states };
        for (const id of down) {
            states[id] = { ...states[id]!, state: "unavailable" };
        }
        Object.defineProperty(element, "hass", { configurable: true, value: { ...element.hass!, states } });
        element.requestUpdate();
        await element.updateComplete;
        if (open) {
            (one(element, ".switch.quiet") as HTMLElement).click();
            await element.updateComplete;
        }
        return element;
    }

    // Only a height that is set leaves room to fill. One that fits the content, or grows up to a limit, has none.
    it.each([
        ["fitting its content", {}, undefined, false, false],
        ["growing up to a limit", { max_height: 300 }, undefined, false, false],
        ["at a fixed height", { height_mode: "fixed" as const, height: 300 }, undefined, false, true],
        ["at a fixed height, opened", { height: 300 }, undefined, true, false],
        ["on rows set in the layout tab", { grid_options: { rows: 4 } }, "grid", false, true],
        ["on rows set in the layout tab, opened", { grid_options: { rows: 4 } }, "grid", true, false],
        ["on automatic rows, growing up to a limit", { max_height: 300, grid_options: { rows: "auto" } }, "grid", false, false],
        ["on automatic rows, at a fixed height", { height: 300, grid_options: { rows: "auto" } }, "grid", false, true],
        ["on automatic rows, fitting its content", { grid_options: { rows: "auto" } }, "grid", false, false],
        ["on rows set in the layout tab, which win over a limit", { max_height: 300, grid_options: { rows: 4 } }, "grid", false, true],
        ["on rows set in the layout tab's older form", { layout_options: { grid_rows: 4 } }, "grid", false, true],
    ])("with nothing waiting, shows a check under its line %s only when held to a set height", async (_name, extra, layout, open, idle) => {
        const element = await quiet(extra as Partial<UpdatesCardConfig>, layout, [], open);
        expect(one(element, ".idle") !== null).toBe(idle);
        expect(one(element, ".idle-icon") !== null).toBe(idle);
        expect(one(element, ".switch.quiet")!.getAttribute("aria-expanded")).toBe(open ? "true" : "false");
        expect(all(element, ".list .row").length > 0).toBe(open);
    });

    // A named group with devices has a line of its own. Groups without a name share one line, counting each device once. A
    // card with no named group that has devices gets no line.
    it.each([
        ["two named groups", CONFIG.groups!, ["update.shed_2"], ["House · 4 up to date", "Shed · 2 up to date · 1 unreachable"]],
        ["one group without a name", [{ integration: "esphome" }], ["update.shed_2"], []],
        [
            "two groups without names",
            [
                { integration: "esphome", exclude_areas: ["cabin"] },
                { integration: "esphome", areas: ["cabin"] },
            ],
            ["update.shed_2"],
            [],
        ],
        [
            "a named group and one without a name",
            [
                { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
                { integration: "esphome", areas: ["cabin"] },
            ],
            ["update.shed_2"],
            ["House · 4 up to date", "2 up to date · 1 unreachable"],
        ],
        [
            "a group with every device out of reach",
            CONFIG.groups!,
            ["update.shed_0", "update.shed_1", "update.shed_2"],
            ["House · 4 up to date", "Shed · 3 unreachable"],
        ],
        ["one named group alone", [{ name: "House", integration: "esphome" }], ["update.shed_2"], ["House · 6 up to date · 1 unreachable"]],
        [
            "a named group and two without names, which share a line",
            [
                { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
                { entities: ["update.shed_0"] },
                { entities: ["update.shed_1", "update.shed_2"] },
            ],
            ["update.shed_2"],
            ["House · 4 up to date", "2 up to date · 1 unreachable"],
        ],
        [
            "a named group and one without a name with every device out of reach",
            [
                { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
                { integration: "esphome", areas: ["cabin"] },
            ],
            ["update.shed_0", "update.shed_1", "update.shed_2"],
            ["House · 4 up to date", "3 unreachable"],
        ],
        [
            "two groups without names that share a device, which counts once",
            [
                { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
                { entities: ["update.shed_0", "update.shed_1"] },
                { entities: ["update.shed_1", "update.shed_2"] },
            ],
            ["update.shed_2"],
            ["House · 4 up to date", "2 up to date · 1 unreachable"],
        ],
        [
            "a named group with no devices and one without a name",
            [{ name: "Nothing", entities: ["update.not_there"] }, { integration: "esphome" }],
            [],
            [],
        ],
        [
            "a named group with no devices and one with them",
            [
                { name: "Nothing", entities: ["update.not_there"] },
                { name: "House", integration: "esphome", exclude_areas: ["cabin"] },
            ],
            [],
            ["House · 4 up to date"],
        ],
        [
            "a named group with devices and one without a name and without them",
            [{ name: "House", integration: "esphome", exclude_areas: ["cabin"] }, { entities: ["update.not_there"] }],
            [],
            ["House · 4 up to date"],
        ],
        [
            "a device both a named group and one without a name hold, counted on both lines as both groups list it",
            [{ name: "House", integration: "esphome", exclude_areas: ["cabin"] }, { entities: ["update.house_0", "update.shed_0"] }],
            [],
            ["House · 4 up to date", "2 up to date"],
        ],
    ])("held with nothing waiting, sums up %s under its line", async (_name, groups, down, lines) => {
        const element = await quiet({ groups, height: 300 }, undefined, down);
        expect(one(element, ".idle-icon")).not.toBeNull();
        expect(all(element, ".idle-line").map(text)).toEqual(lines);
        expect(all(element, ".idle-line span").map((span) => span.getAttribute("title"))).toEqual(lines);
    });

    it("gives every text a held card may cut short its own text as a tooltip", async () => {
        const quietCard = await quiet({ height: 300 });
        for (const selector of [".hd-title", ".hd-sub", ".switch-text"]) {
            const element = one(quietCard, selector)!;
            expect(element.getAttribute("title")).toBe(text(element));
        }
        // The house's devices wait and the shed's are up to date, so the line of those up to date is there too.
        const waiting = await card(home(WAITING, { installed: "2026.2.0" }), { ...CONFIG, height: 300 });
        for (const selector of [".hd-title", ".hd-sub", ".grp-name", ".switch-text"]) {
            const element = one(waiting, selector)!;
            expect(element.getAttribute("title")).toBe(text(element));
        }
    });

    it.each([
        ["a whole section", {}, 4, 189],
        ["twelve columns", { grid_options: { columns: 12 } }, 4, 189],
        ["nine columns, where a row's name and versions take three lines", { grid_options: { columns: 9 } }, 4, 203],
        ["six columns, where they take six", { grid_options: { columns: 6 } }, 4, 247],
        ["the older form's two columns of six", { layout_options: { grid_columns: 2 } }, 4, 247],
        ["a whole section in the older form", { layout_options: { grid_columns: "full" } }, 4, 189],
    ])(
        "asks a sections view on %s for the rows its header, one row and the bottom line need, and is never held lower",
        async (_name, layout, rows, height) => {
            const element = await card(home({ installed: "2026.2.0" }), {
                ...CONFIG,
                ...layout,
                height: 100,
            } as Partial<UpdatesCardConfig>);
            expect(element.getGridOptions()).toMatchObject({ rows: "auto", min_rows: rows });
            expect(one(element, "ha-card")!.getAttribute("style")).toBe(`height: ${height}px`);
        },
    );

    it.each([
        ["a maximum height", undefined, { max_height: 300 }, "max-height: 300px"],
        ["a fixed height", undefined, { height_mode: "fixed" as const, height: 240, max_height: 300 }, "height: 240px"],
        ["grid rows in a sections view win over it", "grid", { max_height: 300, grid_options: { rows: 6 } }, "height: 100%"],
        ["automatic grid rows round it down to the rows", "grid", { max_height: 300, grid_options: { rows: "auto" } }, "max-height: 248px"],
        ["neither", undefined, {}, ""],
    ])("sizes itself by %s", async (_name, layout, extra, style) => {
        const element = await card(home({ installed: "2026.2.0" }), { ...CONFIG, ...extra }, layout);
        expect(one(element, "ha-card")!.getAttribute("style") ?? "").toBe(style);
    });

    it("refuses a height that isn't a positive number of pixels, and an unknown height mode, with an error about the height", () => {
        const element = document.createElement("updates-card");
        const config = (extra: Record<string, unknown>) => ({ type: "custom:updates-card", ...CONFIG, ...extra }) as UpdatesCardConfig;
        const error = translate(browserLanguage(), "common.invalid_height");
        expect(error).toMatch(/^Invalid height\./);
        for (const value of ["300px", 0, -10]) {
            expect(() => element.setConfig(config({ max_height: value }))).toThrow(error);
            expect(() => element.setConfig(config({ height: value }))).toThrow(error);
        }
        expect(() => element.setConfig(config({ height_mode: "tall" }))).toThrow(error);
        // Left empty in YAML, each is unset.
        expect(() => element.setConfig(config({ height_mode: null, height: null, max_height: null }))).not.toThrow();
    });
});

describe("updates-card following an update-all script", () => {
    it("takes on the rows that wait once there are some, when it saw the script start before them", async () => {
        const hass = home({ installed: "2026.2.0" });
        hass.states["script.update_devices"] = { entity_id: "script.update_devices", state: "on", last_changed: "", attributes: {} };
        const element = await card(hass);
        expect(text(one(element, ".hd-sub"))).toBe("All up to date");

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
            name: "a row out of reach while nothing waits, when a row before it goes away",
            before: home(CURRENT, CURRENT, { 1: AWAY }),
            open: async (e: UpdatesCard) => {
                await click(e, one(e, ".switch.quiet")!);
                await click(e, named(e, ".off-line", ""));
            },
            after: home(CURRENT, CURRENT, { 1: AWAY, 2: AWAY }),
            pick: (e: UpdatesCard) => named(e, ".row", "Hall light"),
            then: (_e: UpdatesCard, row: Element) => expect(text(row.querySelector(".name"))).toBe("Hall light"),
        },
        {
            name: "a row up to date while nothing waits, when a row before it goes away",
            before: home(CURRENT),
            open: (e: UpdatesCard) => click(e, one(e, ".switch.quiet")!),
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
