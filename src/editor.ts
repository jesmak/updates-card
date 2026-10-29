/**
 * The card's visual editor: the title, the groups with what each holds, the action that updates everything, and the
 * card's height.
 */
import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { HomeAssistant } from "./hass";
import { heightData, heightSchema, tidyHeight } from "./height";
import { browserLanguage, translate } from "./localize/localize";
import type { UpdatesCardConfig } from "./types";
import { updateIntegrations } from "./updates";

interface SchemaEntry {
    name: string;
}

/** A field inside the object selector takes its helper from `description`, as ha-form's computeHelper doesn't reach it. */
function schema(hass: HomeAssistant, config: UpdatesCardConfig, text: (key: string) => string) {
    const field = (name: string, selector: Record<string, unknown>) => ({
        label: text(`editor.${name}`),
        description: text(`editor.${name}_helper`),
        selector,
    });
    return [
        { name: "title", selector: { text: {} } },
        {
            name: "groups",
            selector: {
                object: {
                    multiple: true,
                    label_field: "name",
                    fields: {
                        name: field("name", { text: {} }),
                        integration: field("integration", {
                            select: { mode: "dropdown", options: updateIntegrations(hass) },
                        }),
                        areas: field("areas", { area: { multiple: true } }),
                        exclude_areas: field("exclude_areas", { area: { multiple: true } }),
                        entities: field("entities", { entity: { multiple: true, filter: { domain: "update" } } }),
                        exclude: field("exclude", { entity: { multiple: true, filter: { domain: "update" } } }),
                    },
                },
            },
        },
        { name: "install_action", selector: { ui_action: { actions: ["perform-action", "navigate", "url"] } } },
        ...heightSchema(config, text),
    ];
}

@customElement("updates-card-editor")
export class UpdatesCardEditor extends LitElement {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private config: UpdatesCardConfig = { type: "custom:updates-card" };

    public setConfig(config: UpdatesCardConfig): void {
        this.config = { ...config };
    }

    protected render(): TemplateResult | typeof nothing {
        if (!this.hass) {
            return nothing;
        }
        return html`
            <ha-form
                .hass=${this.hass}
                .data=${heightData(this.config)}
                .schema=${schema(this.hass, this.config, (key) => this.text(key))}
                .computeLabel=${(entry: SchemaEntry) => this.text(`editor.${entry.name}`)}
                .computeHelper=${(entry: SchemaEntry) => this.helper(entry.name)}
                @value-changed=${this.valueChanged}
            ></ha-form>
        `;
    }

    private valueChanged(event: CustomEvent<{ value: UpdatesCardConfig }>): void {
        const config: UpdatesCardConfig = tidyHeight(event.detail.value);
        // Whatever is emptied is left out, so the configuration stays short.
        const empty = (value: unknown) =>
            value === undefined || value === null || String(value) === "" || (Array.isArray(value) && value.length === 0);
        if (config.groups) {
            config.groups = config.groups.map((group) => Object.fromEntries(Object.entries(group).filter(([, value]) => !empty(value))));
        }
        for (const key of ["title", "groups", "install_action"] as const) {
            if (empty(config[key])) {
                delete config[key];
            }
        }
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    }

    private text(key: string): string {
        return translate(this.language(), key);
    }

    private helper(name: string): string | undefined {
        const key = `editor.${name}_helper`;
        const helper = translate(this.language(), key);
        return helper === key ? undefined : helper;
    }

    private language(): string {
        return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "updates-card-editor": UpdatesCardEditor;
    }
}
