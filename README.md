# Updates card

Home Assistant dashboard card for update entities, in groups, folded to a single line when nothing is waiting.

[![GitHub Release][releases-shield]][releases] [![GitHub Release Date][release-date-shield]][releases] [![HACS][hacs-shield]][hacs] [![License][license-shield]](LICENSE)

<p>
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/waiting-light.png#gh-light-mode-only" width="400" alt="ESPHome devices in two groups, a house and a garden. Five devices of the house fold into one row going from 2026.9.1 to 2026.10.0, the garden lists two devices with their own buttons and one unreachable">
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/waiting-dark.png#gh-dark-mode-only" width="400" alt="ESPHome devices in two groups, a house and a garden. Five devices of the house fold into one row going from 2026.9.1 to 2026.10.0, the garden lists two devices with their own buttons and one unreachable">
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/mixed-light.png#gh-light-mode-only" width="400" alt="Updates of Home Assistant Core, two HACS cards and a router, each in a group of its own, the router without an install button">
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/mixed-dark.png#gh-dark-mode-only" width="400" alt="Updates of Home Assistant Core, two HACS cards and a router, each in a group of its own, the router without an install button">
</p>

## What is it?

A card for Home Assistant's `update` entities, such as the firmware of ESPHome, Zigbee or WLED devices, HACS downloads,
Home Assistant itself, or anything else that has an update entity. It shows them in groups you choose, by integration, by area or
by a list of entities.

Most of the time everything is up to date, and the card is a single line that says so. When updates come in, each
group shows only what is waiting. When many devices wait for the same release, as every ESPHome device does when
ESPHome releases, they fold into one row that opens to them all.

Each row has its own install button, and the card installs one row at a time. Updating everything is left to an action
of your own, such as a script that installs one device after another and skips the ones that are offline. While such
a script runs, the card follows it, shows how far it has got, hides the rows' buttons so nothing installs alongside
it, and offers to stop it.

## Installation

### With HACS

1. Add this repository to HACS custom repositories with type **Dashboard**
2. Search for Updates card in HACS and download it
3. Refresh your browser

### Manual

1. Take `dist/updates-card.js` from the source code of the [latest release][releases] and copy it to the `config/www`
   folder of your Home Assistant installation
2. In Home Assistant settings, open dashboards, click the three dots at the top right and open resources
3. Add a new resource with the path `/local/updates-card.js` and type JavaScript
4. Refresh your browser

## Options

Every option can be set in the card's visual editor.

| Name             | Type   | Description                                                                                                                                                                                 | Default                            |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `title`          | string | The card's title                                                                                                                                                                            | "Updates" in the viewer's language |
| `groups`         | list   | The groups, each with the options below                                                                                                                                                     | Every update entity in one group   |
| `install_action` | action | What the **Update all** button does, as any dashboard action. A script is followed while it runs (below). Without it, there is no such button                                               |                                    |
| `max_height`     | number | The card's greatest height in pixels. The card grows with its content up to it, and then the list scrolls. A height in grid rows, set in the layout tab of a sections view, is used instead |                                    |

A group holds the update entities of an integration, in some areas or outside them, or exactly the ones listed.

| Name            | Type   | Description                                                                        |
| --------------- | ------ | ---------------------------------------------------------------------------------- |
| `name`          | string | Shown above the group. Without one, the group has no heading                       |
| `integration`   | string | Only update entities of this integration, such as `esphome` or `hacs`              |
| `areas`         | list   | Only update entities in these areas, by the entity's own area or else its device's |
| `exclude_areas` | list   | No update entities from these areas                                                |
| `entities`      | list   | Exactly these update entities, instead of the integration and areas                |
| `exclude`       | list   | Update entities never shown in the group                                           |

Update entities hidden in Home Assistant are left out, except when listed in `entities`.

## What it shows

<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/folded-light.png#gh-light-mode-only" width="460" alt="The card as one line, with a check, the title and all ten devices up to date">
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/folded-dark.png#gh-dark-mode-only" width="460" alt="The card as one line, with a check, the title and all ten devices up to date">

**Nothing waiting.** The card is one line. Tapping it opens every update entity, muted, by group, with its version.

**Updates waiting.** Each group shows the rows with an update, with the version installed and the one available. A
line at the bottom opens the rest. Three or more rows of a group that update the same software to the same version
fold into one row, named after the software, which opens to all of them. The same software means the same integration
and the same title, which an update entity gives for the software it updates. Every ESPHome device's says "ESPHome",
while each HACS download has its own name, so two HACS cards never fold together. The card compares versions only as
text and never reads them as numbers, so any kind of versioning works.

**Installing a row.** The row's button calls `update.install` for that entity alone. While it installs, the other
buttons wait, so two installs never run at once from the card. A device reboots after its firmware is written, so the
row keeps showing "Updating" until the new version shows, for up to three minutes. A row whose version hasn't moved by
then shows that the update failed. An entity whose integration can't install updates has no button, and a tap on any
row opens its details.

<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/running-light.png#gh-light-mode-only" width="460" alt="Updating all, with a stop button, a progress bar of seven segments, the folded row of the house at 0 of 5 and the garden's rows waiting their turn">
<img src="https://raw.githubusercontent.com/jesmak/updates-card/main/docs/images/running-dark.png#gh-dark-mode-only" width="460" alt="Updating all, with a stop button, a progress bar of seven segments, the folded row of the house at 0 of 5 and the garden's rows waiting their turn">

**Updating all.** The **Update all** button runs `install_action`. When the action runs a script, by its own name
(`script.update_devices`) or with `script.turn_on` on one script, the card follows the script while it runs. It hides
the rows' buttons, counts what it has updated, and offers **Stop**, which asks first and then turns the script off. The
count covers every waiting row the card can install, so a script that leaves some of them out ends short of the total.

**Unreachable devices.** An update entity counts as unreachable when it is unavailable, or when each of its device's
other entities is unavailable or is a connection sensor that is off. Such rows go on a line of their own at the end of
their group, and don't keep the card from folding into one line. ESPHome, for one, keeps a sleeping device's update
entity available, and its status sensor too, which turns off. That is why the device's other entities are asked, and
why a connection sensor counts by what it says.

**A device that isn't there.** The card lists update entities, and Home Assistant creates a new ESPHome device's update
entity disabled. Such a device shows once its update entity is enabled in the device's settings.

## Sizes

The card takes a whole section by default and can be made as narrow as half of one. Below 300 pixels, the **Update
all** button shows only its icon. From 700 pixels on, the groups go side by side, two to a row.

## Examples

### ESPHome devices at home and at a summer cottage

A script that updates one reachable device after another, and the card on top of it.

```yaml
type: custom:updates-card
title: ESPHome devices
groups:
  - name: Home
    integration: esphome
    exclude_areas: [cottage]
  - name: Cottage
    integration: esphome
    areas: [cottage]
install_action:
  action: perform-action
  perform_action: script.update_esphome_devices
max_height: 600
```

### Everything Home Assistant itself and HACS update

```yaml
type: custom:updates-card
title: Updates
groups:
  - name: Home Assistant
    integration: hassio
  - name: HACS
    integration: hacs
```

### A few entities by hand

```yaml
type: custom:updates-card
groups:
  - entities:
      - update.router_firmware
      - update.nas_firmware
```

## Translating

The card's texts are in `src/localize/languages/`, one JSON file per language, named by its language code. English
and Finnish are there. To add a language, copy `en.json`, translate its texts and open a pull request.

## Development

Requires Node 22.13 or newer.

```
npm install
npm run check
```

`npm run check` typechecks, lints, checks formatting, runs the tests and builds `dist/updates-card.js`, which is the
file HACS installs and is committed to the repository.

| Path                      | What it contains                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `src/updates-card.ts`     | The card itself, and how it follows installs                                        |
| `src/editor.ts`           | The visual editor                                                                   |
| `src/updates.ts`          | Choosing each group's entities, the rows, unreachable devices, folding and statuses |
| `src/localize/languages/` | The card's texts, one JSON file per language                                        |
| `docs/screenshots.json`   | The made-up data the README's screenshots are taken from                            |
| `tests/`                  | Tests, run with vitest                                                              |

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/jesmak)

## License

MIT, see [LICENSE](LICENSE).

[releases-shield]: https://img.shields.io/github/release/jesmak/updates-card.svg?style=for-the-badge
[release-date-shield]: https://img.shields.io/github/release-date/jesmak/updates-card?style=for-the-badge
[releases]: https://github.com/jesmak/updates-card/releases
[hacs-shield]: https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge
[hacs]: https://hacs.xyz/docs/faq/custom_repositories/
[license-shield]: https://img.shields.io/github/license/jesmak/updates-card.svg?style=for-the-badge
