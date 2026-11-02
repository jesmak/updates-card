import { afterEach, describe, expect, it } from "vitest";

import { endHeight } from "../src/updates-card";

// happy-dom lays nothing out, so each element is given the box it would have mid-slide.
interface Box {
    top?: number;
    height: number;
    style?: string;
    className?: string;
    children?: Box[];
}

function build(box: Box): HTMLElement {
    const element = document.createElement("div");
    element.className = box.className ?? "";
    element.style.cssText = box.style ?? "";
    const top = box.top ?? 0;
    element.getBoundingClientRect = () => ({ top, bottom: top + box.height, height: box.height }) as DOMRect;
    for (const child of box.children ?? []) {
        element.append(build(child));
    }
    return element;
}

/** A fold sliding, `now` pixels of it showing, around content that ends `content` pixels below its top. */
function fold(open: boolean, now: number, content: number, inner: Box[] = [{ top: 0, height: content }]): Box {
    return { className: open ? "fold open" : "fold", height: now, children: [{ className: "fold-in", height: now, children: inner }] };
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("the height a part ends at once its folds have slid", () => {
    it.each([
        ["a fold shutting ends at nothing", fold(false, 40, 100), 0],
        ["a fold opening ends at its content, not the part of it showing", fold(true, 40, 100), 100],
        [
            "a fold's content counts its last part's bottom margin",
            fold(true, 40, 0, [
                { top: 0, height: 30 },
                { top: 30, height: 30, style: "margin-bottom: 6px" },
            ]),
            66,
        ],
        ["a fold opening inside one shutting ends at nothing", fold(false, 40, 0, [fold(true, 0, 100)]), 0],
        [
            "a fold opening inside one open adds its own slide",
            fold(true, 60, 0, [
                { top: 0, height: 60 },
                { ...fold(true, 0, 100), top: 60 },
            ]),
            160,
        ],
        ["a part without folds is its own height", { height: 70, children: [{ height: 70 }] }, 70],
        [
            "parts one after another add up their folds' slides",
            { height: 80, children: [{ height: 50 }, fold(true, 0, 100), fold(false, 30, 30)] },
            150,
        ],
    ])("%s", (_name, box, height) => {
        const element = build(box);
        document.body.append(element);
        expect(endHeight(element)).toBe(height);
    });

    it("takes the tallest of each row when the groups sit side by side, shut folds placed last", () => {
        // Placed by order: the two open folds share the first row, the shutting one goes to the second.
        const cols = build({
            className: "cols",
            height: 160,
            style: "display: grid; grid-template-columns: 300px 300px; padding-top: 6px; padding-bottom: 4px",
            children: [fold(true, 100, 100), { ...fold(false, 60, 60), style: "order: 1" }, fold(true, 20, 140)],
        });
        document.body.append(cols);
        expect(endHeight(cols)).toBe(6 + 140 + 0 + 4);
    });
});
