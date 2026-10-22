import type { LovelaceCardConfig } from "./hass";

/**
 * Which update entities a group holds. With `entities`, exactly those. Otherwise every update entity that matches the
 * filters given: of the integration, in one of the areas, in none of the excluded areas. `exclude` leaves out single
 * entities in either case.
 */
export interface GroupConfig {
    name?: string;
    integration?: string;
    areas?: string[];
    exclude_areas?: string[];
    entities?: string[];
    exclude?: string[];
}

/** A Home Assistant action, as the frontend's `ui_action` selector writes it. */
export interface ActionConfig {
    action: string;
    perform_action?: string;
    /** The name the action had before `perform_action`, still found in older configurations. */
    service?: string;
    target?: { entity_id?: string | string[] };
    [key: string]: unknown;
}

export interface UpdatesCardConfig extends LovelaceCardConfig {
    /** Shown at the top of the card. Without one the card is titled in the viewer's language. */
    title?: string;
    /** Without groups, every update entity in one group without a name. */
    groups?: GroupConfig[];
    /** What "update all" does, such as a script that installs one device after another. Without it, there is no such button. */
    install_action?: ActionConfig;
    /** The card's greatest height in pixels. Above it, the list scrolls. A height in grid rows overrides it. */
    max_height?: number;
}

/** An update entity as the card shows it. */
export interface Row {
    entity_id: string;
    name: string;
    /** The software being updated (the entity's `title`), or its integration when it has none. */
    software: string;
    /** The integration and the software together, which a bunch's rows share. */
    softwareKey: string;
    installed: string;
    latest: string;
    pending: boolean;
    installing: boolean;
    canInstall: boolean;
    unreachable: boolean;
}

/** Three or more waiting rows of a group that update the same software to the same version. */
export interface Bunch {
    key: string;
    software: string;
    latest: string;
    /** The version every row moves from, or undefined when they don't all move from the same one. */
    from?: string;
    rows: Row[];
}

export interface Group {
    key: string;
    name?: string;
    rows: Row[];
}
