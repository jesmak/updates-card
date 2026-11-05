/** The little of Home Assistant a card needs, so the unmaintained custom-card-helpers isn't a dependency. */

export interface HassEntity {
    entity_id: string;
    state: string;
    last_changed: string;
    attributes: Record<string, unknown>;
}

/** An entity's entry in the registry, as the frontend hands it to cards. */
export interface HassEntityEntry {
    entity_id: string;
    device_id?: string | null;
    area_id?: string | null;
    platform?: string;
    hidden?: boolean;
}

export interface HassDevice {
    id: string;
    name: string | null;
    name_by_user: string | null;
    area_id: string | null;
    /** "service" for software rather than hardware, such as a download from the Marketplace. */
    entry_type?: "service" | null;
}

export interface HassArea {
    area_id: string;
    name: string;
}

/** One part of an entity's name, as `formatEntityName` puts them together. */
export interface NamePart {
    type: "entity" | "device" | "area" | "floor";
}

export interface HomeAssistant {
    states: Record<string, HassEntity | undefined>;
    entities?: Record<string, HassEntityEntry | undefined>;
    devices?: Record<string, HassDevice | undefined>;
    areas?: Record<string, HassArea | undefined>;
    language?: string;
    locale?: { language?: string };
    callService(
        domain: string,
        service: string,
        data?: Record<string, unknown>,
        target?: { entity_id: string | string[] },
    ): Promise<unknown>;
    /** Present in Home Assistant 2025.10 and later. */
    formatEntityName?(state: HassEntity, parts: NamePart[]): string;
}

export interface LovelaceCardConfig {
    type: string;
    [key: string]: unknown;
}
