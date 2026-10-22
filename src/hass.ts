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
}

export interface HassArea {
    area_id: string;
    name: string;
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
}

export interface LovelaceCardConfig {
    type: string;
    [key: string]: unknown;
}
