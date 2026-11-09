import type { LovelaceCardConfig } from "./hass";
import type { RowStepConfig } from "./rows";

/**
 * Which entities a group holds. With `entities`, exactly those, which may also be sensors that count waiting updates and
 * binary sensors that tell of a problem. Otherwise every update entity that matches the filters given: of the
 * integration, in one of the areas, in none of the excluded areas. `exclude` leaves out single entities in either case.
 */
export interface GroupConfig {
    name?: string;
    integration?: string;
    areas?: string[];
    exclude_areas?: string[];
    entities?: string[];
    exclude?: string[];
    /** The attribute of a count sensor that lists what waits. */
    list_attribute?: string;
    /** The attribute of a problem sensor that tells what the problem is, as a text or a list of them. */
    reason_attribute?: string;
    /** The attribute that tells how many days the oldest update has waited, and from how many days on that is too long. */
    age_attribute?: string;
    age_days?: number;
    /** The attribute that tells when the entity's source last reported, as a date and time. */
    reported_attribute?: string;
}

/** A name of the user's own for one entity's row, instead of the one the card gives it. */
export interface NameConfig {
    entity: string;
    name: string;
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

export interface UpdatesCardConfig extends LovelaceCardConfig, RowStepConfig {
    /** Shown at the top of the card. Without one the card is titled in the viewer's language. */
    title?: string;
    /** Without groups, every update entity in one group without a name. */
    groups?: GroupConfig[];
    names?: NameConfig[];
    /** What "update all" does, such as a script that installs one device after another. Without it, there is no such button. */
    install_action?: ActionConfig;
}

/**
 * What a row is: an update entity, a sensor counting waiting updates (such as packages), or a binary sensor telling of a
 * problem, which shows only while it is on.
 */
export type RowKind = "update" | "count" | "problem";

/** An entity as the card shows it. Only an update entity has versions and can be installed. */
export interface Row {
    entity_id: string;
    kind: RowKind;
    name: string;
    /** The software being updated: the entity's `title`, else the row's name on a service, else its integration. */
    software: string;
    /** The integration and the software together, which a bunch's rows share. */
    softwareKey: string;
    installed: string;
    latest: string;
    pending: boolean;
    installing: boolean;
    canInstall: boolean;
    unreachable: boolean;
    /** A count sensor's state with its unit, such as "9 packages". */
    quantity?: string;
    /** What a count sensor's list attribute lists, or a problem sensor's reason attribute says. */
    items?: string[];
    /** Whether the oldest update has waited the group's `age_days` or longer. */
    old?: boolean;
    /** When the entity's source last reported, by the group's `reported_attribute`, in milliseconds. */
    reported?: number;
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
    /** Every entity the group holds, a problem sensor that is off and so has no row included, for the card to watch. */
    entities: string[];
}
