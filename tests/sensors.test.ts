import { afterEach, describe, expect, it, vi } from "vitest";

import type { HomeAssistant } from "../src/hass";
import "../src/updates-card";
import type { UpdatesCard } from "../src/updates-card";
import type { GroupConfig, UpdatesCardConfig } from "../src/types";
import { bunchesOf, groupEntities, groupsOf } from "../src/updates";
import { fakeHass } from "./fixtures";

/**
 * Two made-up servers reporting their packages over MQTT: a web server with an update entity, a package count and a
 * problem sensor on one device, and a media box with a package count and a problem sensor.
 */
function servers(patch: { web?: string; media?: string; webProblem?: string; mediaProblem?: string; age?: number } = {}): HomeAssistant {
    const hass = fakeHass(
        [
            {
                id: "update.web_os",
                device: "web",
                platform: "mqtt",
                state: "on",
                installed: "8.1",
                latest: "8.2",
                title: "Web OS",
                features: 0,
            },
        ],
        [
            { id: "web", name: "Web server" },
            { id: "media", name: "Media box" },
        ],
    );
    const sensor = (id: string, device: string, state: string, attributes: Record<string, unknown>) => {
        hass.states[id] = { entity_id: id, state, last_changed: "", attributes };
        hass.entities![id] = { entity_id: id, device_id: device, platform: "mqtt" };
    };
    sensor("sensor.web_packages", "web", patch.web ?? "3", {
        unit_of_measurement: "packages",
        list: ["libfoo 1.2", "libbar 2.0", "web-os 8.2"],
        oldest_days: patch.age ?? 4,
    });
    sensor("sensor.media_packages", "media", patch.media ?? "0", { unit_of_measurement: "packages", list: [], oldest_days: 0 });
    // A problem sensor may carry its host's package list too, beside its reasons.
    sensor("binary_sensor.web_problem", "web", patch.webProblem ?? "off", { device_class: "problem", list: [], reasons: [] });
    sensor("binary_sensor.media_problem", "media", patch.mediaProblem ?? "on", {
        device_class: "problem",
        list: ["libfoo 1.2"],
        reasons: ["A new kernel waits for a reboot"],
    });
    hass.formatEntityName = (state, parts) => {
        const entry = hass.entities?.[state.entity_id];
        const own = state.entity_id === "update.web_os" ? "Web OS" : "Packages";
        return parts.length === 1 ? own : `${hass.devices?.[entry?.device_id ?? ""]?.name} ${own}`;
    };
    return hass;
}

const GROUP: GroupConfig = {
    name: "Servers",
    entities: ["update.web_os", "sensor.web_packages", "binary_sensor.web_problem", "sensor.media_packages", "binary_sensor.media_problem"],
    list_attribute: "list",
    reason_attribute: "reasons",
    age_attribute: "oldest_days",
    age_days: 30,
};

describe("count and problem sensors", () => {
    it("are taken from a group's entities, but never by the filters", () => {
        const hass = servers();
        expect(groupEntities(hass, { entities: ["sensor.web_packages", "binary_sensor.web_problem", "switch.x"] })).toEqual([
            "sensor.web_packages",
            "binary_sensor.web_problem",
        ]);
        expect(groupEntities(hass, { integration: "mqtt" })).toEqual(["update.web_os"]);
    });

    it("are named after their device, and an update entity sharing its device in the group after itself", () => {
        const [group] = groupsOf(servers(), { type: "custom:updates-card", groups: [GROUP] }, "en");
        expect(group.rows.map((r) => [r.name, r.kind])).toEqual([
            ["Media box", "count"],
            ["Media box", "problem"],
            ["Web OS", "update"],
            ["Web server", "count"],
        ]);
    });

    it("take a name of the user's own, update entities too", () => {
        const names = [
            { entity: "update.web_os", name: "Web server OS" },
            { entity: "sensor.web_packages", name: "Web packages" },
        ];
        const [group] = groupsOf(servers(), { type: "custom:updates-card", groups: [GROUP], names }, "en");
        expect(group.rows.map((r) => r.name)).toContain("Web server OS");
        expect(group.rows.map((r) => r.name)).toContain("Web packages");
    });

    it("count while above zero, with the unit, the list and whether the oldest has waited too long", () => {
        const [fresh] = groupsOf(servers(), { type: "custom:updates-card", groups: [GROUP] }, "en");
        const web = fresh.rows.find((r) => r.entity_id === "sensor.web_packages")!;
        expect(web).toMatchObject({ pending: true, quantity: "3 packages", items: ["libfoo 1.2", "libbar 2.0", "web-os 8.2"], old: false });
        expect(web.canInstall).toBe(false);
        expect(fresh.rows.find((r) => r.entity_id === "sensor.media_packages")).toMatchObject({ pending: false, quantity: "0 packages" });
        const [stale] = groupsOf(servers({ age: 30 }), { type: "custom:updates-card", groups: [GROUP] }, "en");
        expect(stale.rows.find((r) => r.entity_id === "sensor.web_packages")!.old).toBe(true);
    });

    it("show a problem sensor only while it is on, and still hold it for the card to watch", () => {
        const [group] = groupsOf(servers(), { type: "custom:updates-card", groups: [GROUP] }, "en");
        expect(group.rows.map((r) => r.entity_id)).not.toContain("binary_sensor.web_problem");
        expect(group.entities).toContain("binary_sensor.web_problem");
    });

    it.each([
        ["a date and time", "2026-10-22T09:10:00+03:00", Date.parse("2026-10-22T06:10:00Z")],
        ["no attribute", undefined, undefined],
        // A plain number would read as a year.
        ["a number", 2026, undefined],
        ["a text that is no time", "yesterday-ish", undefined],
    ])("take when they last reported from %s only when it reads as a time", (_name, reported, expected) => {
        const [group] = groupsOf(reporting(reported, undefined), { type: "custom:updates-card", groups: [REPORTING] }, "en");
        expect(group.rows.find((r) => r.entity_id === "sensor.web_packages")!.reported).toBe(expected);
    });

    it("never bunch, even three of the same name, unit and integration", () => {
        const hass = servers({ media: "2" });
        hass.states["sensor.third"] = {
            entity_id: "sensor.third",
            state: "1",
            last_changed: "",
            attributes: { unit_of_measurement: "packages" },
        };
        hass.entities!["sensor.third"] = { entity_id: "sensor.third", platform: "mqtt" };
        const ids = ["sensor.web_packages", "sensor.media_packages", "sensor.third"];
        const names = ids.map((entity) => ({ entity, name: "Server" }));
        const [group] = groupsOf(hass, { type: "custom:updates-card", groups: [{ entities: ids }], names }, "en");
        expect(group.rows.filter((r) => r.pending)).toHaveLength(3);
        expect(bunchesOf(group.rows).bunches).toHaveLength(0);
    });

    it("name an update entity after itself while a problem sensor of its device is off and has no row", () => {
        const [group] = groupsOf(
            servers(),
            { type: "custom:updates-card", groups: [{ entities: ["update.web_os", "binary_sensor.web_problem"] }] },
            "en",
        );
        expect(group.rows.map((r) => r.name)).toEqual(["Web OS"]);
    });
});

async function card(hass: HomeAssistant, config: Partial<UpdatesCardConfig>): Promise<UpdatesCard> {
    const element = document.createElement("updates-card");
    element.setConfig({ type: "custom:updates-card", ...config } as UpdatesCardConfig);
    element.hass = hass;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

const text = (element: Element | null | undefined) => (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const all = (element: UpdatesCard, selector: string) =>
    [...element.shadowRoot!.querySelectorAll(selector)].filter((e) => !e.closest("[inert]"));

afterEach(() => {
    document.body.innerHTML = "";
});

describe("updates-card with count and problem sensors", () => {
    it("shows a waiting count with its unit, opening to its list, and a problem with its reason", async () => {
        const element = await card(servers(), { groups: [GROUP] });
        const count = all(element, ".sum").find((e) => text(e).startsWith("Web server"))!;
        expect([text(count.querySelector(".name")), text(count.querySelector(".qty"))]).toEqual(["Web server", "3 packages"]);
        expect(all(element, ".item")).toHaveLength(0);
        (count as HTMLButtonElement).click();
        await element.updateComplete;
        expect(all(element, ".item").map(text)).toEqual(["libfoo 1.2", "libbar 2.0", "web-os 8.2"]);
        expect(all(element, ".noteline").map(text)).toEqual(["A new kernel waits for a reboot"]);
    });

    it("offers Update all only when a waiting row can be installed", async () => {
        const hass = servers();
        const element = await card(hass, {
            groups: [{ ...GROUP, entities: ["sensor.web_packages", "binary_sensor.media_problem"] }],
            install_action: { action: "perform-action", perform_action: "script.update_all" },
        });
        expect(all(element, ".action")).toHaveLength(0);
    });

    it("notices a problem sensor turning on, though it had no row while off", async () => {
        // The problem sensor's device has no row in the group, so it isn't watched as a row's sibling either.
        const hass = servers({ mediaProblem: "off", web: "0" });
        const element = await card(hass, { groups: [{ ...GROUP, entities: ["sensor.web_packages", "binary_sensor.media_problem"] }] });
        expect(text(all(element, ".hd-sub")[0])).toBe("All up to date");
        // Only the states change, as when Home Assistant hands over a state change, so only the watched entities let it through.
        const problem = hass.states["binary_sensor.media_problem"]!;
        element.hass = {
            ...hass,
            states: { ...hass.states, "binary_sensor.media_problem": { ...problem, state: "on" } },
        };
        await element.updateComplete;
        expect(all(element, ".row .alert")).toHaveLength(1);
        expect(text(all(element, ".hd-sub")[0])).toBe("1 needing attention");
        expect(element.shadowRoot!.querySelector(".hd .hd-icon.problem")?.getAttribute("icon")).toBe("mdi:alert-circle-outline");
    });

    it("counts problems apart from updates in its status line", async () => {
        const element = await card(servers(), { groups: [GROUP] });
        expect(text(all(element, ".hd-sub")[0])).toBe("2 waiting for an update · 1 needing attention");
        expect(element.shadowRoot!.querySelector(".hd .hd-icon.pending")?.getAttribute("icon")).toBe("mdi:arrow-up-circle-outline");
    });

    it("says all is up to date when its groups hold only problem sensors that are off", async () => {
        const element = await card(servers({ mediaProblem: "off" }), {
            groups: [{ entities: ["binary_sensor.web_problem", "binary_sensor.media_problem"] }],
        });
        expect(text(all(element, ".hd-sub")[0])).toBe("All up to date");
        expect(all(element, ".message")).toHaveLength(0);
        expect(all(element, ".switch")).toHaveLength(0);
    });

    it("shows the count in orange once the oldest has waited too long", async () => {
        const element = await card(servers({ age: 45 }), { groups: [GROUP] });
        expect(all(element, ".qty.old").map(text)).toEqual(["3 packages"]);
    });

    it("held with nothing waiting and no group named, gives a line only to each row that tells when it reported", async () => {
        const hass = reporting(new Date(Date.now() - 2.5 * 3_600_000).toISOString(), new Date(Date.now() - 30 * 60_000).toISOString());
        hass.states["sensor.media_packages"] = { ...hass.states["sensor.media_packages"]!, state: "unavailable" };
        const element = await card(hass, { groups: [REPORTING], height: 300 });
        expect(all(element, ".idle-line").map(text)).toEqual([
            "Media box · Unreachable · reported 30 minutes ago",
            "Web server · reported 2 hours ago",
        ]);
    });

    it("moves the time since a report on by itself while nothing else changes, and stops its clock when taken off the page", async () => {
        vi.useFakeTimers({ now: Date.parse("2026-10-22T12:00:00Z"), toFake: ["Date", "setInterval", "clearInterval"] });
        try {
            const element = await card(reporting("2026-10-22T09:10:00Z", undefined), { groups: [REPORTING], height: 300 });
            const line = () => text(all(element, ".idle-line").at(-1));
            expect(line()).toBe("Web server · reported 2 hours ago");
            await vi.advanceTimersByTimeAsync(11 * 60_000);
            await element.updateComplete;
            expect(line()).toBe("Web server · reported 3 hours ago");
            element.remove();
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});

/** The servers with nothing waiting, each package count's report time as given. */
function reporting(web: unknown, media: unknown): HomeAssistant {
    const hass = servers({ web: "0", mediaProblem: "off" });
    const at = (id: string, reported: unknown) => {
        hass.states[id] = { ...hass.states[id]!, attributes: { ...hass.states[id]!.attributes, reported } };
    };
    hass.states["update.web_os"] = {
        ...hass.states["update.web_os"]!,
        state: "off",
        attributes: { ...hass.states["update.web_os"]!.attributes, installed_version: "8.2" },
    };
    at("sensor.web_packages", web);
    at("sensor.media_packages", media);
    return hass;
}

const REPORTING: GroupConfig = { ...GROUP, name: undefined, reported_attribute: "reported" };
