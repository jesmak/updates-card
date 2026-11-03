/**
 * A dashboard card for Home Assistant's update entities, in groups. With nothing waiting, it says so under a check, and
 * the line of those up to date opens to the entities. With updates waiting, each group shows only those, and waiting rows that update
 * the same software to the same version fold into one summary row.
 *
 * A row's button installs that row alone, one at a time. Installing everything is left to an action of the user's own,
 * such as a script that installs one device after another. While such a script runs, the card follows it, hides the
 * rows' buttons so that nothing installs alongside it, and offers to stop it.
 */
import { LitElement, css, html, nothing } from "lit";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";

import { CARD_VERSION, DONE_KEEP } from "./const";
import { ScrollFade, fadeStyles } from "./fade";
import "./editor";
import type { HomeAssistant } from "./hass";
import { gridMinRows, heightCardSize, heightStyle, validHeight } from "./height";
import { browserLanguage, translate } from "./localize/localize";
import { fillLimit, filledHeight, filledStyle, validRowStep } from "./rows";
import type { ActionConfig, Bunch, Group, Row, UpdatesCardConfig } from "./types";
import { bunchesOf, groupsOf, scriptOf, statusOf } from "./updates";
import type { Install, Status } from "./updates";

console.info(
    `%c  UPDATES-CARD \n%c  ${CARD_VERSION}    `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray",
);

interface CardRegistration {
    type: string;
    name: string;
    description: string;
    documentationURL?: string;
    preview?: boolean;
}

const registry = window as unknown as { customCards?: CardRegistration[] };
registry.customCards = registry.customCards ?? [];
registry.customCards.push({
    type: "updates-card",
    name: translate(browserLanguage(), "common.name"),
    description: translate(browserLanguage(), "common.description"),
    documentationURL: "https://github.com/jesmak/updates-card",
    preview: true,
});

/**
 * The parts of a held card besides its first row: the header with the round button of a narrow card, the status line,
 * the list's top padding and a group's header above it, the list's bottom margin, the line of those up to date below the
 * list, and the card's border.
 */
const HELD_FRAME_PX = 44 + 19 + 6 + 29 + 8 + 37 + 2;

/**
 * A waiting row's or a bunch's height on a card this wide or wider, its name and versions wrapping as the width needs.
 * Measured on a bunch of today's ESPHome devices, whose names and versions take one line more at each step down.
 */
const FIRST_ROW_PX: [number, number][] = [
    [288, 44],
    [214, 58],
    [171, 73],
    [146, 87],
    [0, 102],
];

/**
 * The narrowest card a column count gives, which is on a 320 px phone: 288 px of card at 12 columns, 214 at 9 and 140 at
 * 6. A section beside others is wider (307, 228 and 150).
 */
function narrowestWidth(columns: number): number {
    return columns >= 12 ? 288 : columns >= 9 ? 214 : 140;
}

const px = (value: string) => parseFloat(value) || 0;

/**
 * Room for a measure read in fractions of a pixel, so a text exactly as wide as its room still fits. Smaller than the
 * 1/64 px a browser lays out in.
 */
const SLACK_PX = 0.01;

/** The gap above the line of those up to date while nothing waits, as the groups have above them while updates wait. */
const QUIET_GAP_PX = 6;

/** The parts the card itself puts in its ha-card, one after another. */
const CARD_PARTS = [".hd", ".hd-sub", ".bar", ".list", ".switch", ".message", ".idle"].map((part) => `:scope > ${part}`).join(", ");

/**
 * An element's height once every fold in it has slid open or shut, so the card is on its rows as a slide begins. A shut
 * fold ends at nothing. An open one ends at its content's height, measured from where its last part ends, as its box is
 * clipped while it slides. Parts follow one another, or with the groups side by side, each row of them is as tall as its
 * tallest.
 */
export function endHeight(element: HTMLElement): number {
    if (element.classList.contains("fold")) {
        const inner = element.firstElementChild as HTMLElement | null;
        const last = inner?.lastElementChild as HTMLElement | null;
        if (!element.classList.contains("open") || !inner || !last) {
            return 0;
        }
        const natural = last.getBoundingClientRect().bottom + px(getComputedStyle(last).marginBottom) - inner.getBoundingClientRect().top;
        return natural + childChange(inner);
    }
    if (!element.querySelector(".fold")) {
        return element.getBoundingClientRect().height;
    }
    const style = getComputedStyle(element);
    if (style.display !== "grid") {
        return element.getBoundingClientRect().height + childChange(element);
    }
    const columns = style.gridTemplateColumns.split(" ").length;
    const placed = [...element.children]
        .map((child, index) => ({ child: child as HTMLElement, index, order: parseInt(getComputedStyle(child).order) || 0 }))
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .map(({ child }) => child);
    let height = px(style.paddingTop) + px(style.paddingBottom);
    for (let start = 0; start < placed.length; start += columns) {
        height += Math.max(...placed.slice(start, start + columns).map((child) => endHeight(child)));
    }
    return height;
}

/** How much the children of an element that lays them out one after another change in height as their folds slide. */
function childChange(element: HTMLElement): number {
    let change = 0;
    for (const child of element.children) {
        change += endHeight(child as HTMLElement) - child.getBoundingClientRect().height;
    }
    return change;
}

/** A row as shown: a finished one keeps the version it moved from, so it stays with its bunch. */
interface Shown {
    row: Row;
    status: Status;
    install?: Install;
}

/** What an install starts from: the row's versions and software as they are when it starts. */
function startOf(row: Row): Omit<Install, "by"> {
    return { from: row.installed, to: row.latest, software: row.software, softwareKey: row.softwareKey };
}

/** Rows, each keeping its element as rows come and go before it. */
function keyed(rows: Row[], render: (row: Row) => TemplateResult) {
    return repeat(rows, (row) => row.entity_id, render);
}

/** The configured update-all action, unless it is the one that does nothing. */
function installAction(config: UpdatesCardConfig): ActionConfig | undefined {
    return config.install_action?.action === "none" ? undefined : config.install_action;
}

@customElement("updates-card")
export class UpdatesCard extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    /** Set by the dashboard: "grid" in a sections view. */
    @property({ attribute: false }) public layout?: string;
    @state() private config?: UpdatesCardConfig;
    /** Whether the up-to-date rows are open. */
    @state() private open = false;
    /** The bunches and the unreachable lines that are open, by group and key. */
    @state() private opened = new Set<string>();
    /** The installs the card follows, by entity, until the page is reloaded. */
    @state() private installs = new Map<string, Install>();
    @state() private now = Date.now();
    /** On automatic rows in a sections view, the height that ends on the card's row step, and what of it the content leaves over. */
    @state() private filled = 0;
    @state() private spare = 0;
    /** Whether a fold is sliding open or shut, so the rows the card fills move with it. */
    @state() private sliding = false;
    /** The card's width when last measured, 0 before it is drawn. */
    @state() private width = 0;
    /** As last measured, whether the waiting rows' and bunches' versions fit beside their names. */
    @state() private beside = false;
    private timer?: number;
    private slideTimer?: number;
    private frame?: number;
    private readonly resizes = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => this.measureSoon());
    /** Whether the install-all script was running at the last update, whether its run has taken on its rows, and when it last stopped. */
    private running = false;
    private tookOn = false;
    private runEnded?: number;
    private groupList: Group[] = [];
    /** The entities whose changes matter: the rows, their devices' other entities and the script. */
    private watched: string[] = [];
    private siblings = new Map<string, string[]>();
    private siblingsOf?: HomeAssistant["entities"];

    constructor() {
        super();
        // Fades the edges of what scrolls while the card is held to a height, the list or the groups' lines under the one
        // shut line, through the card's own lifecycle.
        new ScrollFade(this, () => (this.heightStyle() ? this.renderRoot.querySelectorAll<HTMLElement>(".list, .idle") : []));
    }

    public static getConfigElement(): HTMLElement {
        return document.createElement("updates-card-editor");
    }

    public static getStubConfig(): Record<string, unknown> {
        return {};
    }

    public setConfig(config: UpdatesCardConfig): void {
        if (!config || (config.groups !== undefined && !Array.isArray(config.groups))) {
            throw new Error(translate(browserLanguage(), "common.invalid_configuration"));
        }
        if (!validHeight(config)) {
            throw new Error(translate(browserLanguage(), "common.invalid_height"));
        }
        if (!validRowStep(config)) {
            throw new Error(translate(browserLanguage(), "common.invalid_row_step"));
        }
        this.config = { ...config };
    }

    public getCardSize(): number {
        const waiting = this.groupList.flatMap((g) => g.rows).filter((r) => r.pending).length;
        return heightCardSize(this.config ?? {}, waiting === 0 ? 1 : 2 + Math.min(waiting, 6), this.minimumHeight());
    }

    public getGridOptions(): Record<string, unknown> {
        return { columns: 12, min_columns: 6, rows: "auto", min_rows: gridMinRows(this.minimumHeight()) };
    }

    /**
     * Held to a height, the header, the status line, a group's header, its first row and the line of those up to date still
     * fit, at the narrowest the card's columns allow or at its measured width if narrower. The texts above the list keep
     * to one line then. The progress bar of an update-all run takes its room from the list while the run goes on.
     */
    private minimumHeight(): number {
        const narrowest = Math.min(narrowestWidth(this.gridColumns()), this.width || Infinity);
        return HELD_FRAME_PX + FIRST_ROW_PX.find(([width]) => narrowest >= width)![1];
    }

    /** The columns set in the layout tab, in either form Home Assistant has saved them, or a whole section. */
    private gridColumns(): number {
        const config = this.config as { grid_options?: { columns?: unknown }; layout_options?: { grid_columns?: unknown } } | undefined;
        const columns = config?.grid_options
            ? config.grid_options.columns
            : typeof config?.layout_options?.grid_columns === "number"
              ? config.layout_options.grid_columns * 3
              : undefined;
        return typeof columns === "number" ? columns : 12;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this.now = Date.now();
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        window.clearInterval(this.timer);
        this.timer = undefined;
        this.resizes?.disconnect();
        cancelAnimationFrame(this.frame ?? 0);
        window.clearTimeout(this.slideTimer);
        this.sliding = false;
    }

    protected updated(): void {
        if (!this.isConnected) {
            return;
        }
        const card = this.renderRoot.querySelector("ha-card");
        if (card) {
            this.resizes?.observe(card);
        }
        this.measureSoon();
    }

    private measureSoon(): void {
        cancelAnimationFrame(this.frame ?? 0);
        this.frame = requestAnimationFrame(() => {
            this.measureBeside();
            this.fillRows();
        });
    }

    /**
     * Puts the waiting rows' and bunches' versions beside their names only when they fit there: when a name's longest word,
     * the gap and the whole version fit in the row's texts, and no row is taller than with its version under its name. Then
     * every such row, shut folds' included, so the list keeps one layout. The list is held to its drawn height meanwhile,
     * its overflow clipped, so nothing around it moves.
     */
    private measureBeside(): void {
        const card = this.renderRoot.querySelector<HTMLElement>("ha-card");
        const list = card?.querySelector<HTMLElement>(":scope > .list");
        const infos = list ? [...list.querySelectorAll<HTMLElement>(".row:not(.sib) > .info, .sum > .info")] : [];
        if (!card || !list?.clientWidth || infos.length === 0) {
            return;
        }
        const heights = (): number[] => infos.map((info) => px(getComputedStyle(info).height));
        const was = card.classList.contains("beside");
        // A computed height has six significant digits, which can fall short of the 1/64 px a browser lays out in, and the
        // list held to that would shrink by a fraction while it is measured. So it is held to the 1/64 px it rounds to. Its
        // content is held too, so a held list that scrolls keeps its place while the rows measured beside are shorter.
        const content = list.firstElementChild as HTMLElement | null;
        list.style.height = `${Math.round(px(getComputedStyle(list).height) * 64) / 64}px`;
        list.style.overflow = "hidden";
        list.style.overflowAnchor = "none";
        content?.style.setProperty("min-height", `${Math.round(px(getComputedStyle(content).height) * 64) / 64}px`);
        card.classList.remove("beside");
        const under = heights();
        card.classList.add("beside");
        const sideBySide = heights();
        card.classList.add("measuring");
        const fits = infos.every((info, i) => {
            const style = getComputedStyle(info);
            const parts = [...info.children].reduce((sum, part) => sum + px(getComputedStyle(part).width), 0);
            return parts + px(style.columnGap) <= px(style.width) + SLACK_PX && sideBySide[i] <= under[i] + SLACK_PX;
        });
        card.classList.remove("measuring");
        card.classList.toggle("beside", was);
        list.style.height = "";
        list.style.overflow = "";
        list.style.overflowAnchor = "";
        content?.style.removeProperty("min-height");
        if (fits !== this.beside) {
            this.beside = fits;
        }
    }

    /**
     * In a sections view whose rows are left automatic, the card takes the whole rows its content needs, or the half rows
     * with `row_step: half`, so the cards under it stay on the rows, up to the limit of a card that grows up to one. The
     * room left over goes under the status line. Measured to where the folds' slides end rather than where they are, so the card is on its rows as a slide begins.
     */
    private fillRows(): void {
        const card = this.renderRoot.querySelector<HTMLElement>("ha-card");
        if (!card || !card.clientWidth) {
            return;
        }
        // The card's whole width, border included, as the widths the columns give are.
        const width = Math.round(card.getBoundingClientRect().width);
        if (width !== this.width) {
            this.width = width;
        }
        const limit = fillLimit(this.config ?? {}, this.layout, this.minimumHeight());
        if (!limit) {
            if (this.filled) this.filled = 0;
            if (this.spare) this.spare = 0;
            return;
        }
        // The card's parts one after another, never the card's own height, which is the min-height set here. The list grows
        // into a height given to the card, so only its content counts.
        const style = getComputedStyle(card);
        let content = px(style.borderTopWidth) + px(style.borderBottomWidth) + px(style.paddingTop) + px(style.paddingBottom);
        // Only the card's own parts, never an element a theme adds to it.
        for (const part of card.querySelectorAll(CARD_PARTS)) {
            const partStyle = getComputedStyle(part);
            const inner = part.classList.contains("list") ? (part.firstElementChild as HTMLElement | null) : null;
            const height = part.classList.contains("list") ? (inner ? endHeight(inner) : 0) : part.getBoundingClientRect().height;
            content += px(partStyle.marginTop) + height + px(partStyle.marginBottom);
        }
        content -= this.spareShown(card);
        const filled = filledHeight(Math.round(content), this.config ?? {}, limit);
        const spare = Math.max(0, Math.floor(filled - content));
        if (filled !== this.filled) {
            this.filled = filled;
        }
        if (spare !== this.spare) {
            this.spare = spare;
        }
    }

    /** The spare room as drawn now, which while a fold slides is somewhere between the old and the new. */
    private spareShown(card: HTMLElement): number {
        // While nothing waits, the line of those up to date takes it, above its own gap.
        const quiet = card.querySelector<HTMLElement>(":scope > .switch.quiet");
        if (quiet) {
            return Math.max(0, (parseFloat(getComputedStyle(quiet).marginTop) || 0) - QUIET_GAP_PX);
        }
        const below = card.querySelector<HTMLElement>(":scope > .list, :scope > .message");
        return Math.max(0, below ? parseFloat(getComputedStyle(below).marginTop) || 0 : 0);
    }

    /** The card's inline style: the height it is held to, or the rows it fills up to any limit, with their spare room under the status line. */
    private cardStyle(): string {
        const style = filledStyle(this.config ?? {}, this.layout, this.minimumHeight(), this.filled);
        return this.filled ? `${style}; --uc-spare: ${this.spare}px` : style;
    }

    /** The card's classes: held to a height, its texts above the list keep to one line, and a slide moves its rows along. */
    private cardClass(): string {
        return [this.heightStyle() && "held", this.sliding && "sliding", this.beside && "beside"].filter(Boolean).join(" ");
    }

    private readonly toggleAll = (): void => {
        this.open = !this.open;
        this.slide();
    };

    /** A fold set sliding: the card fills its rows along with the slide until the slide's end, or a second in case none comes. */
    private slide(): void {
        this.sliding = true;
        window.clearTimeout(this.slideTimer);
        this.slideTimer = window.setTimeout(() => (this.sliding = false), 1000);
    }

    private readonly slid = (event: TransitionEvent): void => {
        const target = event.target as HTMLElement;
        if (event.propertyName !== "grid-template-rows" || !target.classList?.contains("fold")) {
            return;
        }
        // Another fold may still be sliding, as one reversed halfway ends before the one opening beside it.
        const moving = [...this.renderRoot.querySelectorAll(".fold")].some(
            (fold) => fold !== target && (fold.getAnimations?.().length ?? 0) > 0,
        );
        if (!moving) {
            window.clearTimeout(this.slideTimer);
            this.sliding = false;
        }
    };

    protected shouldUpdate(changed: PropertyValues): boolean {
        if (!this.config || !changed.has("hass") || changed.size > 1) {
            return true;
        }
        const previous = changed.get("hass") as HomeAssistant | undefined;
        if (!previous || !this.hass) {
            return true;
        }
        if (
            previous.entities !== this.hass.entities ||
            previous.devices !== this.hass.devices ||
            previous.areas !== this.hass.areas ||
            (previous.locale?.language ?? previous.language) !== (this.hass.locale?.language ?? this.hass.language)
        ) {
            return true;
        }
        // Home Assistant hands the card every state change in the house. A new update entity comes with a registry change.
        return this.watched.some((id) => previous.states[id] !== this.hass?.states[id]);
    }

    /** Works out the groups, follows the install-all script and the installs, and keeps a clock running while one goes on. */
    protected willUpdate(): void {
        if (!this.hass || !this.config) {
            return;
        }
        const hass = this.hass;
        this.groupList = groupsOf(hass, this.config, this.language());
        const rows = new Map(this.groupList.flatMap((g) => g.rows.map((r) => [r.entity_id, r] as const)));
        const script = scriptOf(this.config.install_action);
        const installs = new Map(this.installs);

        const scriptOn = !!script && hass.states[script]?.state === "on";
        if (scriptOn && !this.running) {
            // A new run counts only its own rows, not those the last one left on show.
            for (const [id, install] of installs) {
                if (install.by === "run") {
                    installs.delete(id);
                }
            }
            this.tookOn = false;
        }
        // A done row with an update waiting is let go, so it gets its button back. A run's stays done until the run ends,
        // so that its count holds.
        for (const [id, install] of installs) {
            const row = rows.get(id);
            if (row?.pending && statusOf(row, install, this.now) === "done" && !(install.by === "run" && scriptOn)) {
                installs.delete(id);
            }
        }
        // A run takes on every waiting row it can install once, when it starts, or as soon as it can if it could take none
        // on then.
        // A page opened mid-run starts its count there. It leaves out a row whose own install is still going, and while
        // it runs, it takes on a row whose own install fails, as the script installs that row all the same.
        if (scriptOn) {
            let took = false;
            for (const row of rows.values()) {
                const own = installs.get(row.entity_id);
                const ownStatus = own?.by === "row" ? statusOf(row, own, this.now) : undefined;
                const starting = !this.tookOn && own?.by !== "run" && ownStatus !== "running";
                if (row.pending && row.canInstall && (starting || ownStatus === "failed")) {
                    installs.set(row.entity_id, { ...startOf(row), by: "run" });
                    took ||= starting;
                }
            }
            this.tookOn ||= took;
            if (!this.running) {
                this.runEnded = undefined;
            }
        } else if (this.running) {
            this.runEnded = Date.now();
        }
        this.running = scriptOn;

        for (const [id, install] of installs) {
            const row = rows.get(id);
            const status = row ? statusOf(row, install, this.now) : undefined;
            // What the script never reached is let go when it stops.
            if (!row || (install.by === "run" && !this.running && status !== "done")) {
                installs.delete(id);
                continue;
            }
            if (status === "done" && install.doneAt === undefined) {
                installs.set(id, { ...install, doneAt: this.now });
                continue;
            }
            // A finished row stays on show while its run goes on, and for a while after.
            const since =
                install.by === "run" ? (this.running ? undefined : Math.max(install.doneAt ?? 0, this.runEnded ?? 0)) : install.doneAt;
            if (status === "done" && since !== undefined && this.now - since > DONE_KEEP) {
                installs.delete(id);
            }
        }
        this.installs = installs;

        const ticking = this.running || installs.size > 0 || [...rows.values()].some((r) => r.installing);
        if (ticking && this.timer === undefined) {
            this.timer = window.setInterval(() => (this.now = Date.now()), 5000);
        } else if (!ticking && this.timer !== undefined) {
            window.clearInterval(this.timer);
            this.timer = undefined;
        }
        this.watched = [...rows.keys(), ...[...rows.keys()].flatMap((id) => this.siblingIds(hass, id)), ...(script ? [script] : [])];
    }

    /** The other entities of an entity's device, which tell whether the device is out of reach. */
    private siblingIds(hass: HomeAssistant, entityId: string): string[] {
        if (this.siblingsOf !== hass.entities) {
            this.siblings = new Map();
            for (const entry of Object.values(hass.entities ?? {})) {
                if (entry?.device_id) {
                    this.siblings.set(entry.device_id, [...(this.siblings.get(entry.device_id) ?? []), entry.entity_id]);
                }
            }
            this.siblingsOf = hass.entities;
        }
        const device = hass.entities?.[entityId]?.device_id;
        return device ? (this.siblings.get(device) ?? []).filter((id) => id !== entityId) : [];
    }

    protected render(): TemplateResult | typeof nothing {
        if (!this.hass || !this.config) {
            return nothing;
        }
        const title = this.config.title ?? this.text("common.title");
        const all = new Map(this.groupList.flatMap((g) => g.rows.map((r) => [r.entity_id, r] as const)));
        if (all.size === 0) {
            return html`<ha-card class=${this.cardClass()} style=${this.cardStyle()}>
                <div class="hd"><div class="hd-title" title=${title}>${title}</div></div>
                <div class="message">${this.text("common.no_entities")}</div>
            </ha-card>`;
        }
        const shown = new Map([...all.values()].map((row) => [row.entity_id, this.shown(row)] as const));
        const active = [...shown.values()].filter((s) => s.status !== "pending" || s.row.pending);
        const current = [...all.values()].filter(
            (r) => !shown.get(r.entity_id)!.row.pending && !r.unreachable && !this.installs.has(r.entity_id),
        );
        const unreachable = [...all.values()].filter((r) => r.unreachable && !this.installs.has(r.entity_id));

        if (active.length === 0) {
            return this.folded(title, current.length, unreachable.length);
        }

        const script = scriptOf(this.config.install_action);
        const runs = [...this.installs.values()].filter((i) => i.by === "run");
        const busy = active.some((s) => s.status === "running");
        let action: TemplateResult | typeof nothing = nothing;
        if (this.running && script) {
            action = html`<button class="action ghost" @click=${() => this.stop(script)}>
                <ha-icon icon="mdi:stop"></ha-icon><span>${this.text("common.stop")}</span>
            </button>`;
        } else if (installAction(this.config) && active.some((s) => s.row.pending)) {
            const label = this.text("common.update_all");
            action = html`<button
                class="action"
                title=${label}
                aria-label=${label}
                ?disabled=${busy}
                @click=${() => this.act(installAction(this.config!)!)}
            >
                <ha-icon icon="mdi:update"></ha-icon><span>${label}</span>
            </button>`;
        }

        const status = this.statusLine(active, runs);
        const currentText = this.text("common.current_count", { n: current.length });
        return html`
            <ha-card class=${this.cardClass()} style=${this.cardStyle()} @transitionend=${this.slid}>
                <div class="hd">
                    <div class="hd-title" title=${title}>${title}</div>
                    ${action}
                </div>
                <div class="hd-sub" title=${status}>${status}</div>
                ${this.running && runs.length > 0 ? this.progress(runs) : nothing}
                <div class="list">
                    <div class="cols">${this.groupList.map((group) => this.waitingGroup(group, shown, busy))}</div>
                </div>
                ${
                    current.length > 0
                        ? html`<button class="switch" aria-expanded=${this.open ? "true" : "false"} @click=${this.toggleAll}>
                              <span class="switch-text" title=${currentText}>${currentText}</span>
                              <span>${this.text(this.open ? "common.hide" : "common.show")}</span>
                          </button>`
                        : nothing
                }
            </ha-card>
        `;
    }

    /**
     * While nothing waits, as in wud-queue-card: the header with a check, the status line, and the line of those up to date,
     * which opens to the rows up to date and those out of reach, by group.
     */
    private folded(title: string, current: number, unreachable: number): TemplateResult {
        const status = unreachable > 0 ? this.text("common.current_unreachable", { n: unreachable }) : this.text("common.all_current");
        const count =
            current > 0 ? this.text("common.current_count", { n: current }) : this.text("common.unreachable_count", { n: unreachable });
        const idle = this.setHeight() && !this.open;
        return html`<ha-card class=${this.cardClass()} style=${this.cardStyle()} @transitionend=${this.slid}>
            <div class="hd">
                <ha-icon class="hd-icon" icon="mdi:check-circle-outline"></ha-icon>
                <div class="hd-title" title=${title}>${title}</div>
            </div>
            <div class="hd-sub" title=${status}>${status}</div>
            <button class="switch quiet" aria-expanded=${this.open ? "true" : "false"} @click=${this.toggleAll}>
                <span class="switch-text" title=${count}>${count}</span>
                <span>${this.text(this.open ? "common.hide" : "common.show")}</span>
            </button>
            <div class="list ${idle ? "shut" : ""}">
                ${this.fold(this.open, html`<div class="cols">${this.groupList.map((group) => this.quietGroup(group))}</div>`)}
            </div>
            ${idle ? this.idle() : nothing}
        </ha-card>`;
    }

    /**
     * The room a card held to a set height has under its one shut line: a check, and a line for each named group with
     * devices, with how many are up to date and how many out of reach. The groups without a name share a line when a named
     * group has one too. More lines than fit scroll.
     */
    private idle(): TemplateResult {
        const groups = this.groupList.filter((group) => group.rows.length > 0);
        // A device two of them hold counts once, as on the card's own line.
        const unnamed = [
            ...new Map(
                groups
                    .filter((group) => !group.name)
                    .flatMap((group) => group.rows)
                    .map((row) => [row.entity_id, row] as const),
            ).values(),
        ];
        const lines = [
            ...groups.filter((group) => group.name).map((group) => ({ name: group.name, rows: group.rows })),
            ...(unnamed.length > 0 && groups.some((group) => group.name) ? [{ name: undefined, rows: unnamed }] : []),
        ];
        return html`<div class="idle">
            <ha-icon class="idle-icon" icon="mdi:check-circle-outline"></ha-icon>
            <div class="idle-lines">
                ${lines.map(({ name, rows }) => {
                    const unreachable = rows.filter((r) => r.unreachable).length;
                    const current = rows.length - unreachable;
                    const text = [
                        name,
                        current > 0 ? this.text("common.current_count", { n: current }) : "",
                        unreachable > 0 ? this.text("common.unreachable_count", { n: unreachable }) : "",
                    ]
                        .filter(Boolean)
                        .join(" · ");
                    return html`<div class="idle-line">
                        <ha-icon icon=${unreachable > 0 ? "mdi:lan-disconnect" : "mdi:check"}></ha-icon>
                        <span title=${text}>${text}</span>
                    </div>`;
                })}
            </div>
        </div>`;
    }

    /** Whether the card is held to a height that is set, fixed or in rows, and so may have room left under its content. */
    private setHeight(): boolean {
        return this.heightStyle().startsWith("height");
    }

    /** A group while nothing waits: its rows up to date, then its line of those out of reach. */
    private quietGroup(group: Group): TemplateResult | typeof nothing {
        const current = group.rows.filter((r) => !r.unreachable);
        const unreachable = group.rows.filter((r) => r.unreachable);
        if (group.rows.length === 0) {
            return nothing;
        }
        return html`<div class="group">
            ${group.name ? html`<div class="grp-h"><span class="grp-name" title=${group.name}>${group.name}</span><span class="n">${current.length}</span></div>` : nothing}
            ${current.length > 0 ? html`<div class="grp-body">${keyed(current, (r) => this.currentRow(r))}</div>` : nothing}
            ${this.unreachableLine(group, unreachable)}
        </div>`;
    }

    /** A group while updates wait: its bunches and single rows, its line of those out of reach, and when opened, the rest. */
    private waitingGroup(group: Group, shown: Map<string, Shown>, busy: boolean): TemplateResult | typeof nothing {
        const mine = group.rows.map((r) => shown.get(r.entity_id)!);
        const active = mine.filter((s) => s.status !== "pending" || s.row.pending);
        const unreachable = group.rows.filter((r) => r.unreachable && !this.installs.has(r.entity_id));
        const current = mine.filter((s) => !active.includes(s) && !s.row.unreachable).map((s) => s.row);
        const rest = html`<div class="grp-body">${keyed(current, (r) => this.currentRow(r))}</div>`;
        const header = group.name
            ? html`<div class="grp-h"><span class="grp-name" title=${group.name}>${group.name}</span></div>`
            : nothing;
        const quiet = active.length === 0 && unreachable.length === 0;
        if (quiet && current.length === 0) {
            return nothing;
        }
        const { bunches, singles } = bunchesOf(active.map((s) => s.row));
        const byId = new Map(active.map((s) => [s.row.entity_id, s] as const));
        // A group with nothing waiting and nothing out of reach shows only while the rest are open. Every group is in a fold,
        // so that it keeps its element when that changes.
        return this.fold(
            !quiet || this.open,
            html`<div class="group">
                ${header}
                ${repeat(
                    bunches,
                    (bunch) => bunch.key,
                    (bunch) => this.bunch(group, bunch, byId, busy),
                )}
                ${singles.length > 0 ? html`<div class="grp-body">${keyed(singles, (r) => this.waitingRow(byId.get(r.entity_id)!, busy))}</div>` : nothing}
                ${current.length > 0 ? this.fold(quiet || this.open, rest) : nothing} ${this.unreachableLine(group, unreachable)}
            </div>`,
        );
    }

    private bunch(group: Group, bunch: Bunch, byId: Map<string, Shown>, busy: boolean): TemplateResult {
        const key = `${group.key}\u0000${bunch.key}`;
        const isOpen = this.opened.has(key);
        const statuses = bunch.rows.map((r) => byId.get(r.entity_id)!.status);
        // During a run the count is of the run's rows, as the header's is.
        const runs = bunch.rows.map((r) => byId.get(r.entity_id)!).filter((s) => s.install?.by === "run");
        let pill: TemplateResult | typeof nothing = nothing;
        if (this.running && runs.length > 0) {
            const done = runs.filter((s) => s.status === "done").length;
            const kind = statuses.includes("running") ? "running" : done === runs.length ? "done" : "off";
            pill = html`<span class="pill ${kind}">
                ${statuses.includes("running") ? html`<ha-icon class="spin" icon="mdi:sync"></ha-icon>` : nothing}${done}/${runs.length}
            </span>`;
        } else if (statuses.includes("running")) {
            pill = this.pill("running");
        } else if (statuses.includes("failed")) {
            pill = this.pill("failed");
        }
        return html`
            <button class="sum" aria-expanded=${isOpen ? "true" : "false"} @click=${() => this.toggle(key)}>
                <ha-icon class="chev" icon=${isOpen ? "mdi:chevron-down" : "mdi:chevron-right"}></ha-icon>
                <span class="info">
                    <span class="name">${bunch.software}<span class="count">${bunch.rows.length}</span></span>
                    ${this.versions(bunch.from, bunch.latest)}
                </span>
                <span class="end">${pill}</span>
            </button>
            ${this.fold(isOpen, html`<div class="grp-body">${keyed(bunch.rows, (r) => this.waitingRow(byId.get(r.entity_id)!, busy))}</div>`)}
        `;
    }

    private waitingRow(shown: Shown, busy: boolean): TemplateResult {
        const { row, status, install } = shown;
        const offerInstall = row.canInstall && !row.unreachable && !this.running && (status === "pending" || status === "failed");
        const label = this.text("common.install", { name: row.name });
        return html`
            <div
                class="row ${status === "waiting" ? "muted" : ""}"
                role="button"
                tabindex="0"
                @click=${() => this.moreInfo(row.entity_id)}
                @keydown=${this.onKey(row.entity_id)}
            >
                <div class="info">
                    <div class="name">${row.name}</div>
                    ${this.versions(row.installed, row.latest)}
                </div>
                <div class="end">
                    ${
                        offerInstall
                            ? html`<button
                                  class="install"
                                  ?disabled=${busy}
                                  title=${label}
                                  aria-label=${label}
                                  @click=${(e: Event) => this.install(e, row)}
                              >
                                  <ha-icon icon="mdi:arrow-up"></ha-icon>
                              </button>`
                            : // A failed row that can't be tried again, as its device is away, says so where its button would be.
                              status === "running" || status === "done" || status === "failed"
                              ? this.pill(status)
                              : nothing
                    }
                </div>
            </div>
            ${status === "failed" ? html`<div class="errline">${install?.error || this.text("common.not_installed", { version: row.installed })}</div>` : nothing}
        `;
    }

    private currentRow(row: Row): TemplateResult {
        return html`<div
            class="row sib muted"
            role="button"
            tabindex="0"
            @click=${() => this.moreInfo(row.entity_id)}
            @keydown=${this.onKey(row.entity_id)}
        >
            <div class="info"><div class="name">${row.name}</div></div>
            <div class="end"><span class="ver">${row.installed}</span></div>
        </div>`;
    }

    /**
     * A group's devices out of reach: a muted line at the group's end, set apart by a rule, that opens to them. Their
     * versions may be unknown while they're away.
     */
    private unreachableLine(group: Group, rows: Row[]): TemplateResult | typeof nothing {
        if (rows.length === 0) {
            return nothing;
        }
        const key = `${group.key}\u0000unreachable`;
        const isOpen = this.opened.has(key);
        return html`
            <button class="off-line" aria-expanded=${isOpen ? "true" : "false"} @click=${() => this.toggle(key)}>
                <ha-icon icon="mdi:lan-disconnect"></ha-icon>
                <span class="grow">${this.text("common.unreachable_count", { n: rows.length })}</span>
                <span>${this.text(isOpen ? "common.hide" : "common.show")}</span>
            </button>
            ${this.fold(
                isOpen,
                html`<div class="grp-body muted">
                    ${keyed(
                        rows,
                        (row) =>
                            html`<div
                                class="row sib"
                                role="button"
                                tabindex="0"
                                @click=${() => this.moreInfo(row.entity_id)}
                                @keydown=${this.onKey(row.entity_id)}
                            >
                                <div class="info">
                                    <div class="name">${row.name}</div>
                                    ${row.latest && row.latest !== row.installed ? this.versions(row.installed, row.latest) : nothing}
                                </div>
                                <div class="end"><span class="off-state">${this.text("status.unreachable")}</span></div>
                            </div>`,
                    )}
                </div>`,
            )}
        `;
    }

    /** Content that slides open and shut. A shut one stays in the page, so the change can be animated. */
    private fold(isOpen: boolean, content: TemplateResult): TemplateResult {
        return html`<div class="fold ${isOpen ? "open" : ""}" ?inert=${!isOpen}>
            <div class="fold-in">${content}</div>
        </div>`;
    }

    private versions(from: string | undefined, to: string): TemplateResult {
        return html`<span class="ver">${from ? `${from} → ` : "→ "}<span class="new">${to}</span></span>`;
    }

    private pill(status: "running" | "done" | "failed"): TemplateResult {
        return html`<span class="pill ${status}">
            ${status === "running" ? html`<ha-icon class="spin" icon="mdi:sync"></ha-icon>` : nothing}${this.text(`status.${status}`)}
        </span>`;
    }

    /** One line under the title: what is installing, what failed, or how much is waiting. */
    private statusLine(active: Shown[], runs: Install[]): string {
        const names = (status: Status) =>
            active
                .filter((s) => s.status === status)
                .map((s) => s.row.name)
                .join(", ");
        const progress =
            this.running && runs.length > 0
                ? this.text("common.progress", { done: runs.filter((i) => i.doneAt !== undefined).length, n: runs.length })
                : "";
        if (names("running")) {
            return [this.text("common.updating", { name: names("running") }), progress].filter(Boolean).join(" · ");
        }
        if (this.running) {
            return [this.text("common.update_all_running"), progress].filter(Boolean).join(" · ");
        }
        if (names("failed")) {
            return this.text("common.failed", { name: names("failed") });
        }
        const pending = active.filter((s) => s.row.pending).length;
        return pending > 0 ? this.text("common.pending_count", { n: pending }) : this.text("common.all_updated");
    }

    /** A thin bar with a segment per row of the run, coloured by how it is going. */
    private progress(runs: Install[]): TemplateResult {
        const done = runs.filter((i) => i.doneAt !== undefined).length;
        const running = [...this.installs.entries()].some(
            ([id, i]) => i.by === "run" && i.doneAt === undefined && this.hass?.states[id]?.attributes.in_progress,
        );
        return html`<div class="bar" role="presentation">
            ${runs.map((_, index) => html`<span class="seg ${index < done ? "done" : index === done && running ? "running" : ""}"></span>`)}
        </div>`;
    }

    /**
     * A row as shown, with how its install goes. A finished one reads from the version it moved from to the one it has.
     * One the card follows that has no versions while it is away reads as it did when its install started, so it stays
     * in its bunch too.
     */
    private shown(row: Row): Shown {
        const install = this.installs.get(row.entity_id);
        const status = statusOf(row, install, this.now);
        if (!install) {
            return { row, status };
        }
        const away = !row.latest;
        const base = away ? { ...row, software: install.software, softwareKey: install.softwareKey } : row;
        if (status === "done") {
            return { row: { ...base, installed: install.from, latest: away ? install.to : row.installed }, status, install };
        }
        return { row: away ? { ...base, installed: install.from, latest: install.to } : row, status, install };
    }

    private toggle(key: string): void {
        const opened = new Set(this.opened);
        if (!opened.delete(key)) {
            opened.add(key);
        }
        this.opened = opened;
        this.slide();
    }

    private heightStyle(): string {
        return heightStyle(this.config ?? {}, this.layout, this.minimumHeight());
    }

    private async install(event: Event, row: Row): Promise<void> {
        // The button is its own thing to click; the row under it opens the entity.
        event.stopPropagation();
        if (!this.hass) {
            return;
        }
        this.installs = new Map(this.installs).set(row.entity_id, { ...startOf(row), by: "row" });
        this.now = Date.now();
        let error: string | undefined;
        try {
            // Home Assistant answers when the install has ended, which for a device can take minutes.
            await this.hass.callService("update", "install", {}, { entity_id: row.entity_id });
        } catch (e) {
            error = e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e);
        }
        const install = this.installs.get(row.entity_id);
        if (install?.by === "row") {
            this.installs = new Map(this.installs).set(row.entity_id, { ...install, settled: Date.now(), error });
        }
    }

    /** Runs a configured action the way the dashboard runs any card's, confirmation and all. */
    private act(action: ActionConfig): void {
        this.dispatchEvent(
            new CustomEvent("hass-action", { detail: { config: { tap_action: action }, action: "tap" }, bubbles: true, composed: true }),
        );
    }

    private stop(script: string): void {
        this.act({
            action: "perform-action",
            perform_action: "script.turn_off",
            target: { entity_id: script },
            confirmation: { text: this.text("common.stop_confirm") },
        });
    }

    private onKey(entityId: string): (event: KeyboardEvent) => void {
        return (event) => {
            if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                this.moreInfo(entityId);
            }
        };
    }

    private moreInfo(entityId: string): void {
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    }

    private text(key: string, values: Record<string, string | number> = {}): string {
        return translate(this.language(), key).replace(/\{(\w+)\}/g, (match, name: string) =>
            name in values ? String(values[name]) : match,
        );
    }

    private language(): string {
        return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
    }

    static get styles(): CSSResultGroup {
        return [
            css`
                /* A column, so that with a height of its own the header and the bottom line stay put and the list scrolls. */
                ha-card {
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    container-type: inline-size;
                    --uc-soft: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
                    --uc-track: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.08);
                }

                button {
                    font: inherit;
                    color: inherit;
                    background: none;
                    border: 0;
                    padding: 0;
                    text-align: left;
                    cursor: pointer;
                }

                button:focus-visible,
                .row:focus-visible {
                    outline: 2px solid var(--primary-color);
                    outline-offset: -2px;
                }

                .hd {
                    flex: none;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 12px 0 16px;
                }

                /* A check before the title while nothing waits, as in wud-queue-card. */
                .hd-icon {
                    flex: none;
                    color: var(--success-color, #43a047);
                }

                .hd-title {
                    flex: 1 1 auto;
                    min-width: 0;
                    font-size: var(--ha-card-header-font-size, 18px);
                    line-height: 1.4;
                }

                .hd-sub {
                    flex: none;
                    padding: 0 16px 2px;
                    font-size: 12px;
                }

                /* Under the check, the status line starts where the title does: the header's padding, the icon and the gap. */
                .hd:has(.hd-icon) + .hd-sub {
                    padding-left: 50px;
                }

                .message {
                    padding: 4px 16px 14px;
                    font-size: 12px;
                    color: var(--secondary-text-color);
                }

                /* The card's one call to action, so it looks like one on any theme. */
                .action {
                    flex: none;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12.5px;
                    font-weight: 500;
                    color: var(--text-primary-color, #fff);
                    background: var(--primary-color);
                    border-radius: 16px;
                    padding: 5px 12px;
                    white-space: nowrap;
                    --mdc-icon-size: 16px;
                }

                .action ha-icon {
                    display: none;
                }

                .action.ghost {
                    color: var(--primary-text-color);
                    background: var(--uc-track);
                }

                .action.ghost ha-icon {
                    display: inline-flex;
                }

                .action:disabled {
                    opacity: 0.5;
                    cursor: default;
                }

                .bar {
                    flex: none;
                    display: flex;
                    gap: 3px;
                    margin: 8px 16px 0;
                }

                .seg {
                    flex: 1 1 0;
                    height: 4px;
                    border-radius: 2px;
                    background: color-mix(in srgb, var(--secondary-text-color) 35%, transparent);
                }

                .seg.running {
                    background: var(--primary-color);
                    opacity: 0.6;
                }

                .seg.done {
                    background: var(--success-color, #43a047);
                }

                /* The room a whole row leaves over goes under the header. */
                .list,
                .message {
                    margin-top: var(--uc-spare, 0px);
                }

                .list {
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow-y: auto;
                    scrollbar-width: thin;
                }

                .cols {
                    padding: 6px 0 4px;
                }

                .fold {
                    display: grid;
                    grid-template-rows: 0fr;
                    min-width: 0;
                    transition: grid-template-rows var(--ha-animation-duration-normal, 250ms) ease;
                }

                .fold.open {
                    grid-template-rows: 1fr;
                }

                .fold-in {
                    min-height: 0;
                    overflow: hidden;
                }

                /* Side by side when there is room, each group laid out by its own width. */
                .group {
                    container-type: inline-size;
                    min-width: 0;
                }

                @container (min-width: 700px) {
                    .cols {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        column-gap: 8px;
                        align-items: start;
                    }

                    /* A group with nothing waiting, while shut, leaves its column to those that have something. */
                    .cols > .fold:not(.open) {
                        order: 1;
                    }
                }

                .grp-h {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px 2px 16px;
                    font-size: 12px;
                    font-weight: 500;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    color: var(--secondary-text-color);
                }

                .grp-h .n {
                    font-weight: 400;
                }

                .grp-body {
                    margin-left: 16px;
                    border-left: 2px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                }

                .grp-body .row {
                    padding-left: 12px;
                }

                .row,
                .sum {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 3px 12px 3px 16px;
                    min-height: 40px;
                    cursor: pointer;
                }

                .sum {
                    min-height: 44px;
                }

                .chev {
                    flex: none;
                    --mdc-icon-size: 20px;
                    color: var(--secondary-text-color);
                }

                .info {
                    flex: 1 1 auto;
                    min-width: 0;
                    display: block;
                }

                /* Names and versions wrap rather than being cut. */
                .name,
                .ver {
                    display: block;
                    line-height: 1.3;
                    overflow-wrap: anywhere;
                }

                .name {
                    font-size: 14px;
                }

                .ver {
                    font-family: var(--ha-font-family-code, ui-monospace, monospace);
                    font-size: 11.5px;
                    color: var(--secondary-text-color);
                }

                .ver .new {
                    color: var(--primary-color);
                    font-weight: 500;
                }

                .end {
                    flex: none;
                    max-width: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    color: var(--secondary-text-color);
                }

                .muted {
                    opacity: 0.62;
                }

                .count {
                    font-size: 11px;
                    color: var(--secondary-text-color);
                    background: var(--uc-track);
                    border-radius: 8px;
                    padding: 0 6px;
                    margin-left: 6px;
                    vertical-align: 1px;
                    white-space: nowrap;
                }

                .install {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: color-mix(in srgb, var(--primary-color) 30%, transparent);
                    color: var(--primary-text-color);
                    display: grid;
                    place-items: center;
                    --mdc-icon-size: 17px;
                }

                .install:disabled {
                    opacity: 0.35;
                    cursor: default;
                }

                .pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    font-size: 11px;
                    font-weight: 500;
                    border-radius: 10px;
                    padding: 1px 8px;
                    white-space: nowrap;
                    --mdc-icon-size: 12px;
                }

                .pill.running {
                    background: var(--uc-soft);
                    color: var(--primary-color);
                }

                .pill.done {
                    background: rgba(var(--rgb-success-color, 67, 160, 71), 0.12);
                    color: var(--success-color, #43a047);
                }

                .pill.failed {
                    background: rgba(var(--rgb-error-color, 219, 68, 55), 0.1);
                    color: var(--error-color, #db4437);
                }

                .pill.off {
                    background: var(--uc-track);
                    color: var(--secondary-text-color);
                }

                .spin {
                    animation: spin 1.4s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .errline {
                    margin: 0 12px 6px 12px;
                    padding: 6px 9px;
                    border-radius: 8px;
                    font-size: 12px;
                    color: var(--error-color, #db4437);
                    background: rgba(var(--rgb-error-color, 219, 68, 55), 0.1);
                }

                .row.sib {
                    min-height: 26px;
                    padding-top: 1px;
                    padding-bottom: 1px;
                    flex-wrap: wrap;
                    row-gap: 0;
                }

                .row.sib .name {
                    font-size: 13px;
                }

                .row.sib .info {
                    flex: 1 0 auto;
                    max-width: 100%;
                }

                .row.sib .end {
                    margin-left: auto;
                    max-width: 100%;
                }

                /* A rule above it, inset as the rows are, keeps it apart from the rows before it. */
                .off-line {
                    --uc-inset: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    box-sizing: border-box;
                    margin-top: 6px;
                    padding: 10px 12px 2px var(--uc-inset);
                    background: linear-gradient(var(--divider-color, rgba(0, 0, 0, 0.12)), var(--divider-color, rgba(0, 0, 0, 0.12)))
                        no-repeat left var(--uc-inset) top 0 / calc(100% - var(--uc-inset) - 12px) 1px;
                    font-size: 12px;
                    color: var(--secondary-text-color);
                    opacity: 0.8;
                    --mdc-icon-size: 16px;
                }

                .off-state {
                    font-size: 11.5px;
                    white-space: nowrap;
                }

                .grow {
                    flex: 1 1 auto;
                }

                .switch {
                    flex: none;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    box-sizing: border-box;
                    border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
                    padding: 9px 16px;
                    font-size: 12.5px;
                    color: var(--secondary-text-color);
                }

                /*
                 * While nothing waits, the line of those up to date stays above the list, out of what scrolls, with room
                 * above it as the groups have while updates wait, and what a whole row leaves over on top of that.
                 */
                .switch.quiet {
                    flex: none;
                    margin-top: calc(var(--uc-spare, 0px) + ${QUIET_GAP_PX}px);
                }

                .switch.quiet + .list {
                    margin-top: 0;
                }

                /* A narrow card gives the rows the room its indents would take, and the title the room of the button's text. */
                @container (max-width: 300px) {
                    .hd,
                    .row,
                    .sum,
                    .grp-h {
                        padding-left: 10px;
                    }

                    .off-line {
                        --uc-inset: 10px;
                    }

                    .hd-sub,
                    .switch {
                        padding-left: 10px;
                        padding-right: 10px;
                    }

                    .hd:has(.hd-icon) + .hd-sub {
                        padding-left: 44px;
                    }

                    .bar {
                        margin-left: 10px;
                        margin-right: 10px;
                    }

                    .grp-body {
                        margin-left: 10px;
                    }

                    .grp-body .row {
                        padding-left: 8px;
                    }

                    .action {
                        width: 32px;
                        height: 32px;
                        padding: 0;
                        border-radius: 50%;
                        justify-content: center;
                        --mdc-icon-size: 18px;
                    }

                    .action ha-icon {
                        display: inline-flex;
                    }

                    .action span {
                        display: none;
                    }
                }

                /*
                 * A waiting row's or a bunch's version goes beside its name when every one fits there, as measured, on one
                 * line. Its name wraps between words only, as its longest word was measured to fit.
                 */
                .beside .row:not(.sib) > .info,
                .beside .sum > .info {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 16px;
                }

                .beside .row:not(.sib) > .info > .name,
                .beside .sum > .info > .name {
                    overflow-wrap: break-word;
                }

                .beside .row:not(.sib) > .info > .ver,
                .beside .sum > .info > .ver {
                    flex: none;
                    white-space: nowrap;
                    text-align: end;
                }

                /* Measuring: each name at its longest word, never broken inside one, beside its whole version. */
                .measuring .row:not(.sib) > .info > .name,
                .measuring .sum > .info > .name {
                    flex: none;
                    width: min-content;
                    overflow-wrap: normal;
                }

                /* Held to a height, the texts above the list and the line under it keep to one line, cut short with their text as a tooltip. */
                .held .hd-title,
                .held .hd-sub,
                .held .grp-name,
                .held .switch-text {
                    min-width: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Held, the list scrolls, so its scrollbar and its end keep off the card's edges. A shut one has neither. */
                .held .list:not(.shut) {
                    scrollbar-gutter: stable;
                    margin-right: 4px;
                    margin-bottom: 8px;
                }

                .held .cols {
                    padding-bottom: 0;
                }

                /* Held and shut, the room under the line goes to the check and the groups' lines instead of the list. */
                .held .list.shut {
                    flex: none;
                }

                /* With more groups than fit, it scrolls from its top. The list is shut, so it is the card's only scroller. */
                .idle {
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: safe center;
                    gap: 4px;
                    padding: 0 16px 12px;
                    color: var(--secondary-text-color);
                }

                .idle-icon {
                    --mdc-icon-size: 64px;
                    flex: none;
                    margin-bottom: 4px;
                    color: var(--success-color, #43a047);
                    opacity: 0.5;
                }

                /* The lines are centred as one block, so their icons line up. */
                .idle-lines {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 0;
                    max-width: 100%;
                }

                /* A line wraps rather than cut short, its icon by its first line, as the room scrolls when they don't fit. */
                .idle-line {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                    max-width: 100%;
                    font-size: 12px;
                    line-height: 16px;
                    --mdc-icon-size: 16px;
                }

                .idle-line ha-icon {
                    flex: none;
                }

                .idle-line span {
                    min-width: 0;
                    overflow-wrap: anywhere;
                }

                .grp-name {
                    flex: 0 1 auto;
                }

                /* The rows the card fills, and the room under the header, change along with a slide, not on ha-card's own timing. */
                ha-card.sliding {
                    transition: min-height var(--ha-animation-duration-normal, 250ms) ease;
                }

                ha-card.sliding > .list {
                    transition:
                        margin var(--ha-animation-duration-normal, 250ms) ease,
                        padding var(--ha-animation-duration-normal, 250ms) ease;
                }

                @media (prefers-reduced-motion: reduce) {
                    .spin {
                        animation: none;
                    }

                    .fold,
                    ha-card.sliding,
                    ha-card.sliding > .list {
                        transition: none;
                    }
                }
            `,
            fadeStyles,
        ];
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "updates-card": UpdatesCard;
    }
}
