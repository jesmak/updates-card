/*! updates-card 1.0.1 | MIT License */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t6, e6, o6) {
    if (this._$cssResult$ = true, o6 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e6;
  }
  get styleSheet() {
    let t6 = this.o;
    const s5 = this.t;
    if (e && void 0 === t6) {
      const e6 = void 0 !== s5 && 1 === s5.length;
      e6 && (t6 = o.get(s5)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s5, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var i = (t6, ...e6) => {
  const o6 = 1 === t6.length ? t6[0] : e6.reduce((e7, s5, o7) => e7 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t6[o7 + 1], t6[0]);
  return new n(o6, t6, s);
};
var S = (s5, o6) => {
  if (e) s5.adoptedStyleSheets = o6.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e6 of o6) {
    const o7 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o7.setAttribute("nonce", n5), o7.textContent = e6.cssText, s5.appendChild(o7);
  }
};
var c = e ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e6 = "";
  for (const s5 of t7.cssRules) e6 += s5.cssText;
  return r(e6);
})(t6) : t6;

// node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t6, s5) => t6;
var u = { toAttribute(t6, s5) {
  switch (s5) {
    case Boolean:
      t6 = t6 ? l : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, s5) {
  let i7 = t6;
  switch (s5) {
    case Boolean:
      i7 = null !== t6;
      break;
    case Number:
      i7 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t6);
      } catch (t7) {
        i7 = null;
      }
  }
  return i7;
} };
var f = (t6, s5) => !i2(t6, s5);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ?? (Symbol.metadata = /* @__PURE__ */ Symbol("metadata")), a.litPropertyMetadata ?? (a.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var y = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, s5 = b) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t6, s5), !s5.noAccessor) {
      const i7 = /* @__PURE__ */ Symbol(), h4 = this.getPropertyDescriptor(t6, i7, s5);
      void 0 !== h4 && e2(this.prototype, t6, h4);
    }
  }
  static getPropertyDescriptor(t6, s5, i7) {
    const { get: e6, set: r6 } = h(this.prototype, t6) ?? { get() {
      return this[s5];
    }, set(t7) {
      this[s5] = t7;
    } };
    return { get: e6, set(s6) {
      const h4 = e6?.call(this);
      r6?.call(this, s6), this.requestUpdate(t6, h4, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t6) {
    return this.elementProperties.get(t6) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t6 = n2(this);
    t6.finalize(), void 0 !== t6.l && (this.l = [...t6.l]), this.elementProperties = new Map(t6.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t7 = this.properties, s5 = [...r2(t7), ...o2(t7)];
      for (const i7 of s5) this.createProperty(i7, t7[i7]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const s5 = litPropertyMetadata.get(t6);
      if (void 0 !== s5) for (const [t7, i7] of s5) this.elementProperties.set(t7, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, s5] of this.elementProperties) {
      const i7 = this._$Eu(t7, s5);
      void 0 !== i7 && this._$Eh.set(i7, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s5) {
    const i7 = [];
    if (Array.isArray(s5)) {
      const e6 = new Set(s5.flat(1 / 0).reverse());
      for (const s6 of e6) i7.unshift(c(s6));
    } else void 0 !== s5 && i7.push(c(s5));
    return i7;
  }
  static _$Eu(t6, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t6) => this.enableUpdating = t6), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t6) => t6(this));
  }
  addController(t6) {
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t6), void 0 !== this.renderRoot && this.isConnected && t6.hostConnected?.();
  }
  removeController(t6) {
    this._$EO?.delete(t6);
  }
  _$E_() {
    const t6 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t6.set(i7, this[i7]), delete this[i7]);
    t6.size > 0 && (this._$Ep = t6);
  }
  createRenderRoot() {
    const t6 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t6, this.constructor.elementStyles), t6;
  }
  connectedCallback() {
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(true), this._$EO?.forEach((t6) => t6.hostConnected?.());
  }
  enableUpdating(t6) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t6) => t6.hostDisconnected?.());
  }
  attributeChangedCallback(t6, s5, i7) {
    this._$AK(t6, i7);
  }
  _$ET(t6, s5) {
    const i7 = this.constructor.elementProperties.get(t6), e6 = this.constructor._$Eu(t6, i7);
    if (void 0 !== e6 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s5, i7.type);
      this._$Em = t6, null == h4 ? this.removeAttribute(e6) : this.setAttribute(e6, h4), this._$Em = null;
    }
  }
  _$AK(t6, s5) {
    const i7 = this.constructor, e6 = i7._$Eh.get(t6);
    if (void 0 !== e6 && this._$Em !== e6) {
      const t7 = i7.getPropertyOptions(e6), h4 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : u;
      this._$Em = e6;
      const r6 = h4.fromAttribute(s5, t7.type);
      this[e6] = r6 ?? this._$Ej?.get(e6) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t6, s5, i7, e6 = false, h4) {
    if (void 0 !== t6) {
      const r6 = this.constructor;
      if (false === e6 && (h4 = this[t6]), i7 ?? (i7 = r6.getPropertyOptions(t6)), !((i7.hasChanged ?? f)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t6) && !this.hasAttribute(r6._$Eu(t6, i7)))) return;
      this.C(t6, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, s5, { useDefault: i7, reflect: e6, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t6) && (this._$Ej.set(t6, r6 ?? s5 ?? this[t6]), true !== h4 || void 0 !== r6) || (this._$AL.has(t6) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t6, s5)), true === e6 && this._$Em !== t6 && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t6));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t7) {
      Promise.reject(t7);
    }
    const t6 = this.scheduleUpdate();
    return null != t6 && await t6, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [t8, s6] of this._$Ep) this[t8] = s6;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [s6, i7] of t7) {
        const { wrapped: t8 } = i7, e6 = this[s6];
        true !== t8 || this._$AL.has(s6) || void 0 === e6 || this.C(s6, void 0, i7, e6);
      }
    }
    let t6 = false;
    const s5 = this._$AL;
    try {
      t6 = this.shouldUpdate(s5), t6 ? (this.willUpdate(s5), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t6 = false, this._$EM(), s6;
    }
    t6 && this._$AE(s5);
  }
  willUpdate(t6) {
  }
  _$AE(t6) {
    this._$EO?.forEach((t7) => t7.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t6)), this.updated(t6);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t6) {
    return true;
  }
  update(t6) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t7) => this._$ET(t7, this[t7]))), this._$EM();
  }
  updated(t6) {
  }
  firstUpdated(t6) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ?? (a.reactiveElementVersions = [])).push("2.1.2");

// node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t6) => t6;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var u2 = Array.isArray;
var d2 = (t6) => u2(t6) || "function" == typeof t6?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t6) => (i7, ...s5) => ({ _$litType$: t6, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t6, i7) {
  if (!u2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
var N = (t6, i7) => {
  const s5 = t6.length - 1, e6 = [];
  let n5, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t6[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m : void 0 !== u5[2] ? (y2.test(u5[2]) && (n5 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n5 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g) : c5 === $ || c5 === g ? c5 = p2 : c5 === _ || c5 === m ? c5 = v : (c5 = p2, n5 = void 0);
    const x2 = c5 === p2 && t6[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e6.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t6, l3 + (t6[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e6];
};
var S2 = class _S {
  constructor({ strings: t6, _$litType$: i7 }, e6) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t6.length - 1, d3 = this.parts, [f3, v3] = N(t6, i7);
    if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t7 of r6.getAttributeNames()) if (t7.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t7).split(o3), e7 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e7[2], strings: s5, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r6.removeAttribute(t7);
        } else t7.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t7));
        if (y2.test(r6.tagName)) {
          const t7 = r6.textContent.split(o3), i8 = t7.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t7[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t7[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = r6.data.indexOf(o3, t7 + 1)); ) d3.push({ type: 7, index: l3 }), t7 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t6, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function M(t6, i7, s5 = t6, e6) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e6 ? s5._$Co?.[e6] : s5._$Cl;
  const o6 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o6 && (h4?._$AO?.(false), void 0 === o6 ? h4 = void 0 : (h4 = new o6(t6), h4._$AT(t6, s5, e6)), void 0 !== e6 ? (s5._$Co ?? (s5._$Co = []))[e6] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t6, h4._$AS(t6, i7.values), h4, e6)), i7;
}
var R = class {
  constructor(t6, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e6 = (t6?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e6;
    let h4 = P.nextNode(), o6 = 0, n5 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o6 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t6) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t6) : 6 === r6.type && (i8 = new Z(h4, this, t6)), this._$AV.push(i8), r6 = s5[++n5];
      }
      o6 !== r6?.index && (h4 = P.nextNode(), o6++);
    }
    return P.currentNode = l2, e6;
  }
  p(t6) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t6[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, i7, s5, e6) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t6, this._$AB = i7, this._$AM = s5, this.options = e6, this._$Cv = e6?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t6?.nodeType && (t6 = i7.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, i7 = this) {
    t6 = M(this, t6, i7), a2(t6) ? t6 === A || null == t6 || "" === t6 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t6 !== this._$AH && t6 !== E && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : d2(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(l2.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: i7, _$litType$: s5 } = t6, e6 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e6) this._$AH.p(i7);
    else {
      const t7 = new R(e6, this), s6 = t7.u(this.options);
      t7.p(i7), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let i7 = C.get(t6.strings);
    return void 0 === i7 && C.set(t6.strings, i7 = new S2(t6)), i7;
  }
  k(t6) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e6 = 0;
    for (const h4 of t6) e6 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e6], s5._$AI(h4), e6++;
    e6 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e6), i7.length = e6);
  }
  _$AR(t6 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t6 !== this._$AB; ) {
      const s6 = i3(t6).nextSibling;
      i3(t6).remove(), t6 = s6;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, i7, s5, e6, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t6, this.name = i7, this._$AM = e6, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t6, i7 = this, s5, e6) {
    const h4 = this.strings;
    let o6 = false;
    if (void 0 === h4) t6 = M(this, t6, i7, 0), o6 = !a2(t6) || t6 !== this._$AH && t6 !== E, o6 && (this._$AH = t6);
    else {
      const e7 = t6;
      let n5, r6;
      for (t6 = h4[0], n5 = 0; n5 < h4.length - 1; n5++) r6 = M(this, e7[s5 + n5], i7, n5), r6 === E && (r6 = this._$AH[n5]), o6 || (o6 = !a2(r6) || r6 !== this._$AH[n5]), r6 === A ? t6 = A : t6 !== A && (t6 += (r6 ?? "") + h4[n5 + 1]), this._$AH[n5] = r6;
    }
    o6 && !e6 && this.j(t6);
  }
  j(t6) {
    t6 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === A ? void 0 : t6;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== A);
  }
};
var z = class extends H {
  constructor(t6, i7, s5, e6, h4) {
    super(t6, i7, s5, e6, h4), this.type = 5;
  }
  _$AI(t6, i7 = this) {
    if ((t6 = M(this, t6, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e6 = t6 === A && s5 !== A || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, h4 = t6 !== A && (s5 === A || e6);
    e6 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var Z = class {
  constructor(t6, i7, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    M(this, t6);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ?? (t2.litHtmlVersions = [])).push("3.3.3");
var D = (t6, i7, s5) => {
  const e6 = s5?.renderBefore ?? i7;
  let h4 = e6._$litPart$;
  if (void 0 === h4) {
    const t7 = s5?.renderBefore ?? null;
    e6._$litPart$ = h4 = new k(i7.insertBefore(c3(), t7), t7, void 0, s5 ?? {});
  }
  return h4._$AI(t6), h4;
};

// node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var _a;
    const t6 = super.createRenderRoot();
    return (_a = this.renderOptions).renderBefore ?? (_a.renderBefore = t6.firstChild), t6;
  }
  update(t6) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ?? (s3.litElementVersions = [])).push("4.2.2");

// node_modules/@lit/reactive-element/decorators/custom-element.js
var t3 = (t6) => (e6, o6) => {
  void 0 !== o6 ? o6.addInitializer(() => {
    customElements.define(t6, e6);
  }) : customElements.define(t6, e6);
};

// node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t6 = o5, e6, r6) => {
  const { kind: n5, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t6 = Object.create(t6)).wrapped = true), s5.set(r6.name, t6), "accessor" === n5) {
    const { name: o6 } = r6;
    return { set(r7) {
      const n6 = e6.get.call(this);
      e6.set.call(this, r7), this.requestUpdate(o6, n6, t6, true, r7);
    }, init(e7) {
      return void 0 !== e7 && this.C(o6, void 0, t6, e7), e7;
    } };
  }
  if ("setter" === n5) {
    const { name: o6 } = r6;
    return function(r7) {
      const n6 = this[o6];
      e6.call(this, r7), this.requestUpdate(o6, n6, t6, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t6) {
  return (e6, o6) => "object" == typeof o6 ? r4(t6, e6, o6) : ((t7, e7, o7) => {
    const r6 = e7.hasOwnProperty(o7);
    return e7.constructor.createProperty(o7, t7), r6 ? Object.getOwnPropertyDescriptor(e7, o7) : void 0;
  })(t6, e6, o6);
}

// node_modules/@lit/reactive-element/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// node_modules/lit-html/directive.js
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e5 = (t6) => (...e6) => ({ _$litDirective$: t6, values: e6 });
var i5 = class {
  constructor(t6) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t6, e6, i7) {
    this._$Ct = t6, this._$AM = e6, this._$Ci = i7;
  }
  _$AS(t6, e6) {
    return this.update(t6, e6);
  }
  update(t6, e6) {
    return this.render(...e6);
  }
};

// node_modules/lit-html/directive-helpers.js
var { I: t5 } = j;
var i6 = (o6) => o6;
var s4 = () => document.createComment("");
var v2 = (o6, n5, e6) => {
  const l3 = o6._$AA.parentNode, d3 = void 0 === n5 ? o6._$AB : n5._$AA;
  if (void 0 === e6) {
    const i7 = l3.insertBefore(s4(), d3), n6 = l3.insertBefore(s4(), d3);
    e6 = new t5(i7, n6, o6, o6.options);
  } else {
    const t6 = e6._$AB.nextSibling, n6 = e6._$AM, c5 = n6 !== o6;
    if (c5) {
      let t7;
      e6._$AQ?.(o6), e6._$AM = o6, void 0 !== e6._$AP && (t7 = o6._$AU) !== n6._$AU && e6._$AP(t7);
    }
    if (t6 !== d3 || c5) {
      let o7 = e6._$AA;
      for (; o7 !== t6; ) {
        const t7 = i6(o7).nextSibling;
        i6(l3).insertBefore(o7, d3), o7 = t7;
      }
    }
  }
  return e6;
};
var u3 = (o6, t6, i7 = o6) => (o6._$AI(t6, i7), o6);
var m2 = {};
var p3 = (o6, t6 = m2) => o6._$AH = t6;
var M2 = (o6) => o6._$AH;
var h3 = (o6) => {
  o6._$AR(), o6._$AA.remove();
};

// node_modules/lit-html/directives/repeat.js
var u4 = (e6, s5, t6) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t6; l3++) r6.set(e6[l3], l3);
  return r6;
};
var c4 = e5(class extends i5 {
  constructor(e6) {
    if (super(e6), e6.type !== t4.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e6, s5, t6) {
    let r6;
    void 0 === t6 ? t6 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o6 = [];
    let i7 = 0;
    for (const s6 of e6) l3[i7] = r6 ? r6(s6, i7) : i7, o6[i7] = t6(s6, i7), i7++;
    return { values: o6, keys: l3 };
  }
  render(e6, s5, t6) {
    return this.dt(e6, s5, t6).values;
  }
  update(s5, [t6, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t6, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ?? (this.ut = []), v3 = [];
    let m3, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m3 && (m3 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m3.has(h4[x2])) if (m3.has(h4[j2])) {
      const e6 = y3.get(a3[k2]), t7 = void 0 !== e6 ? d3[e6] : null;
      if (null === t7) {
        const e7 = v2(s5, d3[x2]);
        u3(e7, p4[k2]), v3[k2] = e7;
      } else v3[k2] = u3(t7, p4[k2]), v2(s5, d3[x2], t7), d3[e6] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e6 = v2(s5, v3[w2 + 1]);
      u3(e6, p4[k2]), v3[k2++] = e6;
    }
    for (; x2 <= j2; ) {
      const e6 = d3[x2++];
      null !== e6 && h3(e6);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// src/const.ts
var CARD_VERSION = "1.0.1";
var FEATURE_INSTALL = 1;
var BUNCH_MIN = 3;
var DONE_KEEP = 5 * 6e4;
var VERSION_WAIT = 3 * 6e4;

// src/localize/languages/en.json
var en_default = {
  common: {
    name: "Updates card",
    description: "Update entities in groups, folded to one line when nothing is waiting",
    title: "Updates",
    invalid_configuration: "Invalid configuration",
    no_entities: "No update entities found",
    all_current_count: "All up to date \xB7 {n}",
    current_unreachable: "Up to date \xB7 {n} unreachable",
    pending_count: "{n} waiting for an update",
    all_updated: "All updated",
    current_count: "{n} up to date",
    unreachable_count: "{n} unreachable",
    show: "Show",
    hide: "Hide",
    install: "Update {name}",
    update_all: "Update all",
    update_all_running: "Updating all",
    stop: "Stop",
    stop_confirm: "Stop updating? The device being updated now may still finish.",
    updating: "Updating {name}",
    progress: "{done}/{n} done",
    failed: "{name} wasn't updated",
    not_installed: "The update ended, but the version is still {version}."
  },
  status: {
    running: "Updating",
    done: "Updated",
    failed: "Failed",
    unreachable: "Unreachable"
  },
  editor: {
    title: "Title",
    groups: "Groups",
    name: "Name",
    name_helper: "Shown above the group. Leave empty for a group without a heading.",
    integration: "Integration",
    integration_helper: "Only update entities of this integration.",
    areas: "Areas",
    areas_helper: "Only update entities in these areas, by the entity's own area or its device's.",
    exclude_areas: "Excluded areas",
    exclude_areas_helper: "No update entities from these areas.",
    entities: "Entities",
    entities_helper: "Exactly these update entities, instead of the integration and areas above.",
    exclude: "Excluded entities",
    exclude_helper: "Update entities never shown in this group.",
    install_action: "Update all",
    install_action_helper: "What the Update all button does, such as a script that updates one device after another. Without it, there is no such button.",
    max_height: "Maximum height",
    max_height_helper: "The card grows with its content up to this height, and then the list scrolls. A height set in the layout tab of a sections view is used instead."
  }
};

// src/localize/languages/fi.json
var fi_default = {
  common: {
    name: "P\xE4ivityskortti",
    description: "P\xE4ivitysentiteetit ryhmitt\xE4in, yhdell\xE4 rivill\xE4 kun mit\xE4\xE4n ei ole odottamassa",
    title: "P\xE4ivitykset",
    invalid_configuration: "Virheelliset asetukset",
    no_entities: "P\xE4ivitysentiteettej\xE4 ei l\xF6ytynyt",
    all_current_count: "Kaikki ajan tasalla \xB7 {n}",
    current_unreachable: "Ajan tasalla \xB7 {n} ei tavoitettavissa",
    pending_count: "{n} odottaa p\xE4ivityst\xE4",
    all_updated: "Kaikki p\xE4ivitetty",
    current_count: "{n} ajan tasalla",
    unreachable_count: "{n} ei tavoitettavissa",
    show: "N\xE4yt\xE4",
    hide: "Piilota",
    install: "P\xE4ivit\xE4 {name}",
    update_all: "P\xE4ivit\xE4 kaikki",
    update_all_running: "P\xE4ivitet\xE4\xE4n kaikkia",
    stop: "Pys\xE4yt\xE4",
    stop_confirm: "Pys\xE4ytet\xE4\xE4nk\xF6 p\xE4ivitys? Juuri p\xE4ivittym\xE4ss\xE4 oleva laite voi viel\xE4 p\xE4ivitty\xE4 loppuun.",
    updating: "P\xE4ivitet\xE4\xE4n {name}",
    progress: "{done}/{n} valmiina",
    failed: "{name} ei p\xE4ivittynyt",
    not_installed: "P\xE4ivitys p\xE4\xE4ttyi, mutta versio on yh\xE4 {version}."
  },
  status: {
    running: "P\xE4ivitet\xE4\xE4n",
    done: "P\xE4ivitetty",
    failed: "Ep\xE4onnistui",
    unreachable: "Ei tavoitettavissa"
  },
  editor: {
    title: "Otsikko",
    groups: "Ryhm\xE4t",
    name: "Nimi",
    name_helper: "N\xE4ytet\xE4\xE4n ryhm\xE4n yl\xE4puolella. J\xE4t\xE4 tyhj\xE4ksi, jos ryhm\xE4 ei tarvitse otsikkoa.",
    integration: "Integraatio",
    integration_helper: "Vain t\xE4m\xE4n integraation p\xE4ivitysentiteetit.",
    areas: "Alueet",
    areas_helper: "Vain n\xE4iden alueiden p\xE4ivitysentiteetit, entiteetin oman tai sen laitteen alueen mukaan.",
    exclude_areas: "Pois j\xE4tett\xE4v\xE4t alueet",
    exclude_areas_helper: "Ei p\xE4ivitysentiteettej\xE4 n\xE4ilt\xE4 alueilta.",
    entities: "Entiteetit",
    entities_helper: "Juuri n\xE4m\xE4 p\xE4ivitysentiteetit, yll\xE4 olevan integraation ja alueiden sijaan.",
    exclude: "Pois j\xE4tett\xE4v\xE4t entiteetit",
    exclude_helper: "P\xE4ivitysentiteetit, joita ei koskaan n\xE4ytet\xE4 t\xE4ss\xE4 ryhm\xE4ss\xE4.",
    install_action: "P\xE4ivit\xE4 kaikki",
    install_action_helper: "Mit\xE4 P\xE4ivit\xE4 kaikki -painike tekee, esimerkiksi skripti, joka p\xE4ivitt\xE4\xE4 laitteet yksi kerrallaan. Jos j\xE4t\xE4t asetuksen tyhj\xE4ksi, P\xE4ivit\xE4 kaikki -painiketta ei n\xE4ytet\xE4.",
    max_height: "Enimm\xE4iskorkeus",
    max_height_helper: "Kortti kasvaa sis\xE4lt\xF6ns\xE4 mukana t\xE4h\xE4n korkeuteen asti, ja sen j\xE4lkeen lista vierii. Osioihin jaetun n\xE4kym\xE4n asettelu-v\xE4lilehdell\xE4 asetettu korkeus ohittaa t\xE4m\xE4n."
  }
};

// src/localize/localize.ts
var FILES = { "./languages/en.json": en_default, "./languages/fi.json": fi_default };
var LANGUAGES = Object.fromEntries(
  Object.entries(FILES).map(([path, table]) => [path.replace(/^.*\/|\.json$/g, "").toLowerCase(), table])
);
var LANGUAGE_CODES = Object.keys(LANGUAGES).sort();
function translate(language, key) {
  const code = (language ?? "en").split(/[-_]/)[0].toLowerCase();
  return read(LANGUAGES[code], key) ?? read(LANGUAGES.en, key) ?? key;
}
function read(table, key) {
  let value = table;
  for (const part of key.split(".")) {
    if (value === null || typeof value !== "object") {
      return void 0;
    }
    value = value[part];
  }
  return typeof value === "string" ? value : void 0;
}
function browserLanguage() {
  return document.documentElement.lang || navigator.language || "en";
}

// src/updates.ts
function updateEntities(hass) {
  return Object.keys(hass.states).filter((id) => id.startsWith("update.") && !hass.entities?.[id]?.hidden);
}
function updateIntegrations(hass) {
  const platforms = updateEntities(hass).map((id) => hass.entities?.[id]?.platform);
  return [...new Set(platforms.filter((p4) => !!p4))].sort();
}
function areaOf(hass, entityId) {
  const entry = hass.entities?.[entityId];
  if (entry?.area_id) {
    return entry.area_id;
  }
  return entry?.device_id && hass.devices?.[entry.device_id]?.area_id || void 0;
}
function groupEntities(hass, group) {
  const exclude = new Set(group.exclude ?? []);
  const chosen = group.entities?.length ? group.entities.filter((id) => id.startsWith("update.") && hass.states[id] !== void 0) : updateEntities(hass).filter((id) => {
    if (group.integration && hass.entities?.[id]?.platform !== group.integration) {
      return false;
    }
    const area = areaOf(hass, id);
    if (group.areas?.length && (!area || !group.areas.includes(area))) {
      return false;
    }
    return !(area && group.exclude_areas?.includes(area));
  });
  return chosen.filter((id) => !exclude.has(id));
}
function groupConfigs(config) {
  return config.groups?.length ? config.groups : [{}];
}
function isDown(state) {
  return state.state === "unavailable" || state.entity_id.startsWith("binary_sensor.") && state.attributes.device_class === "connectivity" && state.state === "off";
}
function deviceCounts(hass) {
  const counts = /* @__PURE__ */ new Map();
  for (const entry of Object.values(hass.entities ?? {})) {
    const state = entry?.device_id ? hass.states[entry.entity_id] : void 0;
    if (!entry?.device_id || !state) {
      continue;
    }
    const count = counts.get(entry.device_id) ?? { states: 0, down: 0, updates: 0 };
    count.states += 1;
    count.down += isDown(state) ? 1 : 0;
    count.updates += entry.entity_id.startsWith("update.") ? 1 : 0;
    counts.set(entry.device_id, count);
  }
  return counts;
}
function rowOf(hass, entityId, counts) {
  const state = hass.states[entityId];
  if (!state) {
    return void 0;
  }
  const attributes = state.attributes;
  const entry = hass.entities?.[entityId];
  const device = entry?.device_id ? hass.devices?.[entry.device_id] : void 0;
  const count = entry?.device_id ? counts.get(entry.device_id) : void 0;
  const ownName = String(attributes.friendly_name ?? entityId);
  const name = device && (count?.updates ?? 1) <= 1 ? device.name_by_user || device.name || ownName : ownName;
  const title = typeof attributes.title === "string" && attributes.title ? attributes.title : void 0;
  const software = title ?? entry?.platform ?? ownName;
  const others = count ? count.states - 1 : 0;
  const othersDown = count ? count.down - (isDown(state) ? 1 : 0) : 0;
  const unreachable = state.state === "unavailable" || others > 0 && othersDown === others;
  const progress = attributes.in_progress;
  return {
    entity_id: entityId,
    name,
    software,
    softwareKey: `${entry?.platform ?? ""}\0${software}`,
    installed: versionText(attributes.installed_version),
    latest: versionText(attributes.latest_version),
    pending: state.state === "on" && !unreachable,
    installing: progress === true || typeof progress === "number",
    canInstall: (Number(attributes.supported_features ?? 0) & FEATURE_INSTALL) !== 0,
    unreachable
  };
}
function versionText(value) {
  return value === null || value === void 0 ? "" : String(value);
}
function groupsOf(hass, config, language) {
  const counts = deviceCounts(hass);
  const collator = new Intl.Collator(language);
  return groupConfigs(config).map((group, index) => ({
    key: String(index),
    name: group.name || void 0,
    rows: groupEntities(hass, group).map((id) => rowOf(hass, id, counts)).filter((row) => row !== void 0).sort((a3, b3) => collator.compare(a3.name, b3.name))
  }));
}
function bunchesOf(rows) {
  const byKey = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = `${row.softwareKey}\0${row.latest}`;
    byKey.set(key, [...byKey.get(key) ?? [], row]);
  }
  const bunches = [];
  const bunched = /* @__PURE__ */ new Set();
  for (const [key, members] of byKey) {
    if (members.length < BUNCH_MIN) {
      continue;
    }
    const from = members.every((row) => row.installed === members[0].installed) ? members[0].installed : void 0;
    bunches.push({ key, software: members[0].software, latest: members[0].latest, from, rows: members });
    members.forEach((row) => bunched.add(row.entity_id));
  }
  return { bunches, singles: rows.filter((row) => !bunched.has(row.entity_id)) };
}
function scriptOf(action) {
  if (!action || !["perform-action", "call-service"].includes(action.action)) {
    return void 0;
  }
  const service = action.perform_action ?? action.service;
  if (service === "script.turn_on") {
    const target = action.target?.entity_id;
    const ids = Array.isArray(target) ? target : target ? [target] : [];
    return ids.length === 1 && ids[0].startsWith("script.") ? ids[0] : void 0;
  }
  if (service?.startsWith("script.") && !["script.turn_off", "script.toggle", "script.reload"].includes(service)) {
    return service;
  }
  return void 0;
}
function statusOf(row, install, now) {
  if (!install) {
    return row.installing ? "running" : "pending";
  }
  if (install.doneAt !== void 0 || row.installed !== "" && row.installed !== install.from) {
    return "done";
  }
  if (install.error) {
    return "failed";
  }
  if (row.installing) {
    return "running";
  }
  if (install.by === "run") {
    return "waiting";
  }
  return install.settled === void 0 || now - install.settled < VERSION_WAIT ? "running" : "failed";
}

// src/editor.ts
function schema(hass, text) {
  const field = (name, selector) => ({
    label: text(`editor.${name}`),
    description: text(`editor.${name}_helper`),
    selector
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
              select: { mode: "dropdown", options: updateIntegrations(hass) }
            }),
            areas: field("areas", { area: { multiple: true } }),
            exclude_areas: field("exclude_areas", { area: { multiple: true } }),
            entities: field("entities", { entity: { multiple: true, filter: { domain: "update" } } }),
            exclude: field("exclude", { entity: { multiple: true, filter: { domain: "update" } } })
          }
        }
      }
    },
    { name: "install_action", selector: { ui_action: { actions: ["perform-action", "navigate", "url"] } } },
    { name: "max_height", selector: { number: { min: 100, max: 2e3, step: 10, unit_of_measurement: "px", mode: "box" } } }
  ];
}
var UpdatesCardEditor = class extends i4 {
  constructor() {
    super(...arguments);
    this.config = { type: "custom:updates-card" };
  }
  setConfig(config) {
    this.config = { ...config };
  }
  render() {
    if (!this.hass) {
      return A;
    }
    return b2`
            <ha-form
                .hass=${this.hass}
                .data=${this.config}
                .schema=${schema(this.hass, (key) => this.text(key))}
                .computeLabel=${(entry) => this.text(`editor.${entry.name}`)}
                .computeHelper=${(entry) => this.helper(entry.name)}
                @value-changed=${this.valueChanged}
            ></ha-form>
        `;
  }
  valueChanged(event) {
    const config = { ...event.detail.value };
    const empty = (value) => value === void 0 || value === null || String(value) === "" || Array.isArray(value) && value.length === 0;
    if (config.groups) {
      config.groups = config.groups.map((group) => Object.fromEntries(Object.entries(group).filter(([, value]) => !empty(value))));
    }
    for (const key of ["title", "groups", "install_action", "max_height"]) {
      if (empty(config[key])) {
        delete config[key];
      }
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  text(key) {
    return translate(this.language(), key);
  }
  helper(name) {
    const key = `editor.${name}_helper`;
    const helper = translate(this.language(), key);
    return helper === key ? void 0 : helper;
  }
  language() {
    return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
  }
};
__decorateClass([
  n4({ attribute: false })
], UpdatesCardEditor.prototype, "hass", 2);
__decorateClass([
  r5()
], UpdatesCardEditor.prototype, "config", 2);
UpdatesCardEditor = __decorateClass([
  t3("updates-card-editor")
], UpdatesCardEditor);

// src/updates-card.ts
console.info(
  `%c  UPDATES-CARD 
%c  ${CARD_VERSION}    `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);
var registry = window;
registry.customCards = registry.customCards ?? [];
registry.customCards.push({
  type: "updates-card",
  name: translate(browserLanguage(), "common.name"),
  description: translate(browserLanguage(), "common.description"),
  documentationURL: "https://github.com/jesmak/updates-card",
  preview: true
});
function startOf(row) {
  return { from: row.installed, to: row.latest, software: row.software, softwareKey: row.softwareKey };
}
function keyed(rows, render) {
  return c4(rows, (row) => row.entity_id, render);
}
function installAction(config) {
  return config.install_action?.action === "none" ? void 0 : config.install_action;
}
var UpdatesCard = class extends i4 {
  constructor() {
    super(...arguments);
    this.open = false;
    this.opened = /* @__PURE__ */ new Set();
    this.installs = /* @__PURE__ */ new Map();
    this.now = Date.now();
    /** Whether the install-all script was running at the last update, whether its run has taken on its rows, and when it last stopped. */
    this.running = false;
    this.tookOn = false;
    this.groupList = [];
    /** The entities whose changes matter: the rows, their devices' other entities and the script. */
    this.watched = [];
    this.siblings = /* @__PURE__ */ new Map();
  }
  static getConfigElement() {
    return document.createElement("updates-card-editor");
  }
  static getStubConfig() {
    return {};
  }
  setConfig(config) {
    if (!config || config.groups !== void 0 && !Array.isArray(config.groups)) {
      throw new Error(translate(browserLanguage(), "common.invalid_configuration"));
    }
    this.config = { ...config };
  }
  getCardSize() {
    const waiting = this.groupList.flatMap((g2) => g2.rows).filter((r6) => r6.pending).length;
    return waiting === 0 ? 1 : 2 + Math.min(waiting, 6);
  }
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }
  connectedCallback() {
    super.connectedCallback();
    this.now = Date.now();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this.timer);
    this.timer = void 0;
  }
  shouldUpdate(changed) {
    if (!this.config || !changed.has("hass") || changed.size > 1) {
      return true;
    }
    const previous = changed.get("hass");
    if (!previous || !this.hass) {
      return true;
    }
    if (previous.entities !== this.hass.entities || previous.devices !== this.hass.devices || previous.areas !== this.hass.areas || (previous.locale?.language ?? previous.language) !== (this.hass.locale?.language ?? this.hass.language)) {
      return true;
    }
    return this.watched.some((id) => previous.states[id] !== this.hass?.states[id]);
  }
  /** Works out the groups, follows the install-all script and the installs, and keeps a clock running while one goes on. */
  willUpdate() {
    if (!this.hass || !this.config) {
      return;
    }
    const hass = this.hass;
    this.groupList = groupsOf(hass, this.config, this.language());
    const rows = new Map(this.groupList.flatMap((g2) => g2.rows.map((r6) => [r6.entity_id, r6])));
    const script = scriptOf(this.config.install_action);
    const installs = new Map(this.installs);
    const scriptOn = !!script && hass.states[script]?.state === "on";
    if (scriptOn && !this.running) {
      for (const [id, install] of installs) {
        if (install.by === "run") {
          installs.delete(id);
        }
      }
      this.tookOn = false;
    }
    for (const [id, install] of installs) {
      const row = rows.get(id);
      if (row?.pending && statusOf(row, install, this.now) === "done" && !(install.by === "run" && scriptOn)) {
        installs.delete(id);
      }
    }
    if (scriptOn) {
      let took = false;
      for (const row of rows.values()) {
        const own = installs.get(row.entity_id);
        const ownStatus = own?.by === "row" ? statusOf(row, own, this.now) : void 0;
        const starting = !this.tookOn && own?.by !== "run" && ownStatus !== "running";
        if (row.pending && row.canInstall && (starting || ownStatus === "failed")) {
          installs.set(row.entity_id, { ...startOf(row), by: "run" });
          took || (took = starting);
        }
      }
      this.tookOn || (this.tookOn = took);
      if (!this.running) {
        this.runEnded = void 0;
      }
    } else if (this.running) {
      this.runEnded = Date.now();
    }
    this.running = scriptOn;
    for (const [id, install] of installs) {
      const row = rows.get(id);
      const status = row ? statusOf(row, install, this.now) : void 0;
      if (!row || install.by === "run" && !this.running && status !== "done") {
        installs.delete(id);
        continue;
      }
      if (status === "done" && install.doneAt === void 0) {
        installs.set(id, { ...install, doneAt: this.now });
        continue;
      }
      const since = install.by === "run" ? this.running ? void 0 : Math.max(install.doneAt ?? 0, this.runEnded ?? 0) : install.doneAt;
      if (status === "done" && since !== void 0 && this.now - since > DONE_KEEP) {
        installs.delete(id);
      }
    }
    this.installs = installs;
    const ticking = this.running || installs.size > 0 || [...rows.values()].some((r6) => r6.installing);
    if (ticking && this.timer === void 0) {
      this.timer = window.setInterval(() => this.now = Date.now(), 5e3);
    } else if (!ticking && this.timer !== void 0) {
      window.clearInterval(this.timer);
      this.timer = void 0;
    }
    this.watched = [...rows.keys(), ...[...rows.keys()].flatMap((id) => this.siblingIds(hass, id)), ...script ? [script] : []];
  }
  /** The other entities of an entity's device, which tell whether the device is out of reach. */
  siblingIds(hass, entityId) {
    if (this.siblingsOf !== hass.entities) {
      this.siblings = /* @__PURE__ */ new Map();
      for (const entry of Object.values(hass.entities ?? {})) {
        if (entry?.device_id) {
          this.siblings.set(entry.device_id, [...this.siblings.get(entry.device_id) ?? [], entry.entity_id]);
        }
      }
      this.siblingsOf = hass.entities;
    }
    const device = hass.entities?.[entityId]?.device_id;
    return device ? (this.siblings.get(device) ?? []).filter((id) => id !== entityId) : [];
  }
  render() {
    if (!this.hass || !this.config) {
      return A;
    }
    const title = this.config.title ?? this.text("common.title");
    const all = new Map(this.groupList.flatMap((g2) => g2.rows.map((r6) => [r6.entity_id, r6])));
    if (all.size === 0) {
      return b2`<ha-card style=${this.heightStyle()}>
                <div class="hd"><div class="hd-title">${title}</div></div>
                <div class="message">${this.text("common.no_entities")}</div>
            </ha-card>`;
    }
    const shown = new Map([...all.values()].map((row) => [row.entity_id, this.shown(row)]));
    const active = [...shown.values()].filter((s5) => s5.status !== "pending" || s5.row.pending);
    const current = [...all.values()].filter(
      (r6) => !shown.get(r6.entity_id).row.pending && !r6.unreachable && !this.installs.has(r6.entity_id)
    );
    const unreachable = [...all.values()].filter((r6) => r6.unreachable && !this.installs.has(r6.entity_id));
    if (active.length === 0) {
      return this.folded(title, current.length, unreachable.length);
    }
    const script = scriptOf(this.config.install_action);
    const runs = [...this.installs.values()].filter((i7) => i7.by === "run");
    const busy = active.some((s5) => s5.status === "running");
    let action = A;
    if (this.running && script) {
      action = b2`<button class="action ghost" @click=${() => this.stop(script)}>
                <ha-icon icon="mdi:stop"></ha-icon><span>${this.text("common.stop")}</span>
            </button>`;
    } else if (installAction(this.config) && active.some((s5) => s5.row.pending)) {
      const label = this.text("common.update_all");
      action = b2`<button
                class="action"
                title=${label}
                aria-label=${label}
                ?disabled=${busy}
                @click=${() => this.act(installAction(this.config))}
            >
                <ha-icon icon="mdi:update"></ha-icon><span>${label}</span>
            </button>`;
    }
    return b2`
            <ha-card style=${this.heightStyle()}>
                <div class="hd">
                    <div class="hd-title">${title}</div>
                    ${action}
                </div>
                <div class="hd-sub">${this.statusLine(active, runs)}</div>
                ${this.running && runs.length > 0 ? this.progress(runs) : A}
                <div class="list">
                    <div class="cols">${this.groupList.map((group) => this.waitingGroup(group, shown, busy))}</div>
                </div>
                ${current.length > 0 ? b2`<button
                              class="switch"
                              aria-expanded=${this.open ? "true" : "false"}
                              @click=${() => this.open = !this.open}
                          >
                              <span>${this.text("common.current_count", { n: current.length })}</span>
                              <span>${this.text(this.open ? "common.hide" : "common.show")}</span>
                          </button>` : A}
            </ha-card>
        `;
  }
  /** The whole card as one line, opening to the rows up to date and those out of reach, by group. */
  folded(title, current, unreachable) {
    const summary = unreachable > 0 ? this.text("common.current_unreachable", { n: unreachable }) : this.text("common.all_current_count", { n: current });
    return b2`<ha-card style=${this.heightStyle()}>
            <button class="one" aria-expanded=${this.open ? "true" : "false"} @click=${() => this.open = !this.open}>
                <ha-icon class="ok" icon="mdi:check-circle-outline"></ha-icon>
                <span class="one-title">${title}</span>
                <span class="one-sum">${summary}</span>
                <ha-icon class="chev" icon=${this.open ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
            </button>
            <div class="list">
                ${this.fold(this.open, b2`<div class="cols">${this.groupList.map((group) => this.quietGroup(group))}</div>`)}
            </div>
        </ha-card>`;
  }
  /** A group while nothing waits: its rows up to date, then its line of those out of reach. */
  quietGroup(group) {
    const current = group.rows.filter((r6) => !r6.unreachable);
    const unreachable = group.rows.filter((r6) => r6.unreachable);
    if (group.rows.length === 0) {
      return A;
    }
    return b2`<div class="group">
            ${group.name ? b2`<div class="grp-h">${group.name}<span class="n">${current.length}</span></div>` : A}
            ${current.length > 0 ? b2`<div class="grp-body">${keyed(current, (r6) => this.currentRow(r6))}</div>` : A}
            ${this.unreachableLine(group, unreachable)}
        </div>`;
  }
  /** A group while updates wait: its bunches and single rows, its line of those out of reach, and when opened, the rest. */
  waitingGroup(group, shown, busy) {
    const mine = group.rows.map((r6) => shown.get(r6.entity_id));
    const active = mine.filter((s5) => s5.status !== "pending" || s5.row.pending);
    const unreachable = group.rows.filter((r6) => r6.unreachable && !this.installs.has(r6.entity_id));
    const current = mine.filter((s5) => !active.includes(s5) && !s5.row.unreachable).map((s5) => s5.row);
    const rest = b2`<div class="grp-body">${keyed(current, (r6) => this.currentRow(r6))}</div>`;
    const header = group.name ? b2`<div class="grp-h">${group.name}</div>` : A;
    const quiet = active.length === 0 && unreachable.length === 0;
    if (quiet && current.length === 0) {
      return A;
    }
    const { bunches, singles } = bunchesOf(active.map((s5) => s5.row));
    const byId = new Map(active.map((s5) => [s5.row.entity_id, s5]));
    return this.fold(
      !quiet || this.open,
      b2`<div class="group">
                ${header}
                ${c4(
        bunches,
        (bunch) => bunch.key,
        (bunch) => this.bunch(group, bunch, byId, busy)
      )}
                ${singles.length > 0 ? b2`<div class="grp-body">${keyed(singles, (r6) => this.waitingRow(byId.get(r6.entity_id), busy))}</div>` : A}
                ${current.length > 0 ? this.fold(quiet || this.open, rest) : A} ${this.unreachableLine(group, unreachable)}
            </div>`
    );
  }
  bunch(group, bunch, byId, busy) {
    const key = `${group.key}\0${bunch.key}`;
    const isOpen = this.opened.has(key);
    const statuses = bunch.rows.map((r6) => byId.get(r6.entity_id).status);
    const runs = bunch.rows.map((r6) => byId.get(r6.entity_id)).filter((s5) => s5.install?.by === "run");
    let pill = A;
    if (this.running && runs.length > 0) {
      const done = runs.filter((s5) => s5.status === "done").length;
      const kind = statuses.includes("running") ? "running" : done === runs.length ? "done" : "off";
      pill = b2`<span class="pill ${kind}">
                ${statuses.includes("running") ? b2`<ha-icon class="spin" icon="mdi:sync"></ha-icon>` : A}${done}/${runs.length}
            </span>`;
    } else if (statuses.includes("running")) {
      pill = this.pill("running");
    } else if (statuses.includes("failed")) {
      pill = this.pill("failed");
    }
    return b2`
            <button class="sum" aria-expanded=${isOpen ? "true" : "false"} @click=${() => this.toggle(key)}>
                <ha-icon class="chev" icon=${isOpen ? "mdi:chevron-down" : "mdi:chevron-right"}></ha-icon>
                <span class="info">
                    <span class="name">${bunch.software}<span class="count">${bunch.rows.length}</span></span>
                    ${this.versions(bunch.from, bunch.latest)}
                </span>
                <span class="end">${pill}</span>
            </button>
            ${this.fold(isOpen, b2`<div class="grp-body">${keyed(bunch.rows, (r6) => this.waitingRow(byId.get(r6.entity_id), busy))}</div>`)}
        `;
  }
  waitingRow(shown, busy) {
    const { row, status, install } = shown;
    const offerInstall = row.canInstall && !row.unreachable && !this.running && (status === "pending" || status === "failed");
    const label = this.text("common.install", { name: row.name });
    return b2`
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
                    ${offerInstall ? b2`<button
                                  class="install"
                                  ?disabled=${busy}
                                  title=${label}
                                  aria-label=${label}
                                  @click=${(e6) => this.install(e6, row)}
                              >
                                  <ha-icon icon="mdi:arrow-up"></ha-icon>
                              </button>` : (
      // A failed row that can't be tried again, as its device is away, says so where its button would be.
      status === "running" || status === "done" || status === "failed" ? this.pill(status) : A
    )}
                </div>
            </div>
            ${status === "failed" ? b2`<div class="errline">${install?.error || this.text("common.not_installed", { version: row.installed })}</div>` : A}
        `;
  }
  currentRow(row) {
    return b2`<div
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
  unreachableLine(group, rows) {
    if (rows.length === 0) {
      return A;
    }
    const key = `${group.key}\0unreachable`;
    const isOpen = this.opened.has(key);
    return b2`
            <button class="off-line" aria-expanded=${isOpen ? "true" : "false"} @click=${() => this.toggle(key)}>
                <ha-icon icon="mdi:lan-disconnect"></ha-icon>
                <span class="grow">${this.text("common.unreachable_count", { n: rows.length })}</span>
                <span>${this.text(isOpen ? "common.hide" : "common.show")}</span>
            </button>
            ${this.fold(
      isOpen,
      b2`<div class="grp-body muted">
                    ${keyed(
        rows,
        (row) => b2`<div
                                class="row sib"
                                role="button"
                                tabindex="0"
                                @click=${() => this.moreInfo(row.entity_id)}
                                @keydown=${this.onKey(row.entity_id)}
                            >
                                <div class="info">
                                    <div class="name">${row.name}</div>
                                    ${row.latest && row.latest !== row.installed ? this.versions(row.installed, row.latest) : A}
                                </div>
                                <div class="end"><span class="off-state">${this.text("status.unreachable")}</span></div>
                            </div>`
      )}
                </div>`
    )}
        `;
  }
  /** Content that slides open and shut. A shut one stays in the page, so the change can be animated. */
  fold(isOpen, content) {
    return b2`<div class="fold ${isOpen ? "open" : ""}" ?inert=${!isOpen}>
            <div class="fold-in">${content}</div>
        </div>`;
  }
  versions(from, to) {
    return b2`<span class="ver">${from ? `${from} \u2192 ` : "\u2192 "}<span class="new">${to}</span></span>`;
  }
  pill(status) {
    return b2`<span class="pill ${status}">
            ${status === "running" ? b2`<ha-icon class="spin" icon="mdi:sync"></ha-icon>` : A}${this.text(`status.${status}`)}
        </span>`;
  }
  /** One line under the title: what is installing, what failed, or how much is waiting. */
  statusLine(active, runs) {
    const names = (status) => active.filter((s5) => s5.status === status).map((s5) => s5.row.name).join(", ");
    const progress = this.running && runs.length > 0 ? this.text("common.progress", { done: runs.filter((i7) => i7.doneAt !== void 0).length, n: runs.length }) : "";
    if (names("running")) {
      return [this.text("common.updating", { name: names("running") }), progress].filter(Boolean).join(" \xB7 ");
    }
    if (this.running) {
      return [this.text("common.update_all_running"), progress].filter(Boolean).join(" \xB7 ");
    }
    if (names("failed")) {
      return this.text("common.failed", { name: names("failed") });
    }
    const pending = active.filter((s5) => s5.row.pending).length;
    return pending > 0 ? this.text("common.pending_count", { n: pending }) : this.text("common.all_updated");
  }
  /** A thin bar with a segment per row of the run, coloured by how it is going. */
  progress(runs) {
    const done = runs.filter((i7) => i7.doneAt !== void 0).length;
    const running = [...this.installs.entries()].some(
      ([id, i7]) => i7.by === "run" && i7.doneAt === void 0 && this.hass?.states[id]?.attributes.in_progress
    );
    return b2`<div class="bar" role="presentation">
            ${runs.map((_2, index) => b2`<span class="seg ${index < done ? "done" : index === done && running ? "running" : ""}"></span>`)}
        </div>`;
  }
  /**
   * A row as shown, with how its install goes. A finished one reads from the version it moved from to the one it has.
   * One the card follows that has no versions while it is away reads as it did when its install started, so it stays
   * in its bunch too.
   */
  shown(row) {
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
  toggle(key) {
    const opened = new Set(this.opened);
    if (!opened.delete(key)) {
      opened.add(key);
    }
    this.opened = opened;
  }
  /** The card's height: the grid rows of a sections view when set there, otherwise up to `max_height`. */
  heightStyle() {
    const rows = this.config?.grid_options?.rows;
    if (this.layout === "grid" && typeof rows === "number") {
      return "height: 100%";
    }
    return this.config?.max_height ? `max-height: ${this.config.max_height}px` : "";
  }
  async install(event, row) {
    event.stopPropagation();
    if (!this.hass) {
      return;
    }
    this.installs = new Map(this.installs).set(row.entity_id, { ...startOf(row), by: "row" });
    this.now = Date.now();
    let error;
    try {
      await this.hass.callService("update", "install", {}, { entity_id: row.entity_id });
    } catch (e6) {
      error = e6 instanceof Error ? e6.message : String(e6?.message ?? e6);
    }
    const install = this.installs.get(row.entity_id);
    if (install?.by === "row") {
      this.installs = new Map(this.installs).set(row.entity_id, { ...install, settled: Date.now(), error });
    }
  }
  /** Runs a configured action the way the dashboard runs any card's, confirmation and all. */
  act(action) {
    this.dispatchEvent(
      new CustomEvent("hass-action", { detail: { config: { tap_action: action }, action: "tap" }, bubbles: true, composed: true })
    );
  }
  stop(script) {
    this.act({
      action: "perform-action",
      perform_action: "script.turn_off",
      target: { entity_id: script },
      confirmation: { text: this.text("common.stop_confirm") }
    });
  }
  onKey(entityId) {
    return (event) => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        this.moreInfo(entityId);
      }
    };
  }
  moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
  text(key, values = {}) {
    return translate(this.language(), key).replace(
      /\{(\w+)\}/g,
      (match, name) => name in values ? String(values[name]) : match
    );
  }
  language() {
    return this.hass?.locale?.language ?? this.hass?.language ?? browserLanguage();
  }
  static get styles() {
    return i`
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

            .list {
                flex: 1 1 auto;
                min-height: 0;
                overflow-y: auto;
                overscroll-behavior: contain;
                scrollbar-width: thin;
            }

            .cols {
                padding: 6px 0 4px;
            }

            .fold {
                display: grid;
                grid-template-rows: 0fr;
                min-width: 0;
                transition: grid-template-rows 0.2s ease;
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
                background: linear-gradient(var(--divider-color, rgba(0, 0, 0, 0.12)), var(--divider-color, rgba(0, 0, 0, 0.12))) no-repeat
                    left var(--uc-inset) top 0 / calc(100% - var(--uc-inset) - 12px) 1px;
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

            /* The whole card as one line while nothing waits. */
            .one {
                flex: none;
                display: flex;
                align-items: center;
                gap: 12px;
                width: 100%;
                box-sizing: border-box;
                padding: 12px 12px 12px 16px;
            }

            .one .ok {
                flex: none;
                color: var(--success-color, #43a047);
            }

            .one-title {
                flex: 1 1 auto;
                min-width: 0;
                font-size: 16px;
                overflow-wrap: anywhere;
            }

            .one-sum {
                font-size: 12.5px;
                color: var(--secondary-text-color);
                text-align: right;
            }

            /* A narrow card gives the rows the room its indents would take, and the title the room of the button's text. */
            @container (max-width: 300px) {
                .hd,
                .row,
                .sum,
                .one,
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

                .one {
                    flex-wrap: wrap;
                    row-gap: 2px;
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

            /* A wide group has room for a waiting row's versions beside its name. */
            @container (min-width: 600px) {
                .row:not(.sib) .info,
                .sum .info {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 16px;
                }

                .row:not(.sib) .ver,
                .sum .ver {
                    text-align: right;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .spin {
                    animation: none;
                }

                .fold {
                    transition: none;
                }
            }
        `;
  }
};
__decorateClass([
  n4({ attribute: false })
], UpdatesCard.prototype, "hass", 2);
__decorateClass([
  n4({ attribute: false })
], UpdatesCard.prototype, "layout", 2);
__decorateClass([
  r5()
], UpdatesCard.prototype, "config", 2);
__decorateClass([
  r5()
], UpdatesCard.prototype, "open", 2);
__decorateClass([
  r5()
], UpdatesCard.prototype, "opened", 2);
__decorateClass([
  r5()
], UpdatesCard.prototype, "installs", 2);
__decorateClass([
  r5()
], UpdatesCard.prototype, "now", 2);
UpdatesCard = __decorateClass([
  t3("updates-card")
], UpdatesCard);
export {
  UpdatesCard
};
