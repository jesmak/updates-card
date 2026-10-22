/** Replaced at build time with the version in package.json. */
declare const __CARD_VERSION__: string;

export const CARD_VERSION = __CARD_VERSION__;

/** UpdateEntityFeature.INSTALL in Home Assistant. */
export const FEATURE_INSTALL = 1;

/** Waiting rows of the same software and version fold into one summary row from this many on. Two would save nothing. */
export const BUNCH_MIN = 3;

/** How long a row the card saw finish stays on show after its install, or the run it was part of, has ended. */
export const DONE_KEEP = 5 * 60_000;

/**
 * How long a finished install may take for its new version to show. A device reboots after its firmware is written,
 * and Home Assistant learns its version only when it is back.
 */
export const VERSION_WAIT = 3 * 60_000;
