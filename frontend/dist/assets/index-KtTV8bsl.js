/*!
 * @license
 * three-text v0.6.2
 * Copyright © 2025-2026 Jeremy Tribby, Countertype LLC
 * SPDX-License-Identifier: MIT
 */
// Cached flag check at module load time for zero-cost logging
const isLogEnabled = (() => {
    if (typeof window !== 'undefined' && window.THREE_TEXT_LOG) {
        return true;
    }
    if (typeof globalThis !== 'undefined' &&
        globalThis.process?.env?.THREE_TEXT_LOG === 'true') {
        return true;
    }
    return false;
})();
class Logger {
    warn(message, ...args) {
        console.warn(message, ...args);
    }
    error(message, ...args) {
        console.error(message, ...args);
    }
    log(message, ...args) {
        isLogEnabled && console.log(message, ...args);
    }
}
const logger = new Logger();

class PerformanceLogger {
    constructor() {
        this.metrics = [];
        this.activeTimers = new Map();
    }
    start(name, metadata) {
        // Early exit if disabled - no metric collection
        if (!isLogEnabled)
            return;
        const startTime = performance.now();
        // Generate unique key for nested timing support
        const timerKey = `${name}_${startTime}`;
        this.activeTimers.set(timerKey, startTime);
        this.metrics.push({
            name,
            startTime,
            metadata
        });
    }
    end(name) {
        // Early exit if disabled
        if (!isLogEnabled)
            return null;
        const endTime = performance.now();
        // Find the most recent matching timer by scanning backwards
        let timerKey;
        let startTime;
        for (const [key, time] of Array.from(this.activeTimers.entries()).reverse()) {
            if (key.startsWith(`${name}_`)) {
                timerKey = key;
                startTime = time;
                break;
            }
        }
        if (startTime === undefined || !timerKey) {
            logger.warn(`Performance timer "${name}" was not started`);
            return null;
        }
        const duration = endTime - startTime;
        this.activeTimers.delete(timerKey);
        // Find the metric in reverse order (most recent first)
        for (let i = this.metrics.length - 1; i >= 0; i--) {
            const metric = this.metrics[i];
            if (metric.name === name &&
                metric.startTime === startTime &&
                !metric.endTime) {
                metric.endTime = endTime;
                metric.duration = duration;
                break;
            }
        }
        console.log(`${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }
    getSummary() {
        if (!isLogEnabled)
            return {};
        const summary = {};
        for (const metric of this.metrics) {
            if (!metric.duration)
                continue;
            const existing = summary[metric.name];
            if (existing) {
                existing.count++;
                existing.totalDuration += metric.duration;
                existing.avgDuration = existing.totalDuration / existing.count;
                existing.lastDuration = metric.duration;
            }
            else {
                summary[metric.name] = {
                    count: 1,
                    avgDuration: metric.duration,
                    totalDuration: metric.duration,
                    lastDuration: metric.duration
                };
            }
        }
        return summary;
    }
    printSummary() {
        if (!isLogEnabled)
            return;
        const summary = this.getSummary();
        console.table(summary);
        console.log('Operations:', Object.keys(summary).sort().join(', '));
    }
    printBaseline() {
        if (!isLogEnabled)
            return;
        const summary = this.getSummary();
        Object.entries(summary).forEach(([name, stats]) => {
            console.log(`BASELINE ${name}: ${stats.avgDuration.toFixed(2)}ms avg (${stats.count} calls)`);
        });
    }
    clear() {
        if (!isLogEnabled)
            return;
        this.metrics.length = 0;
        this.activeTimers.clear();
    }
    time(name, fn, metadata) {
        if (!isLogEnabled)
            return fn();
        this.start(name, metadata);
        try {
            return fn();
        }
        finally {
            this.end(name);
        }
    }
    async timeAsync(name, fn, metadata) {
        if (!isLogEnabled)
            return fn();
        this.start(name, metadata);
        try {
            return await fn();
        }
        finally {
            this.end(name);
        }
    }
}
// Create a single instance
// When debug is disabled, all methods return immediately with minimal overhead
const perfLogger = new PerformanceLogger();

// TeX defaults
const DEFAULT_TOLERANCE = 800;
const DEFAULT_PRETOLERANCE = 100;
const DEFAULT_EMERGENCY_STRETCH = 0;
// In TeX, interword spacing is defined by font parameters (fontdimen):
// - fontdimen 2: interword space
// - fontdimen 3: interword stretch
// - fontdimen 4: interword shrink
// - fontdimen 7: extra space (for sentence endings)
//
// For Computer Modern, stretch = 1/2 space, shrink = 1/3 space,
// which has become the default for OpenType fonts in modern
// TeX implementations
const SPACE_STRETCH_RATIO = 0.5; // stretch = 50% of space width (fontdimen 3 / fontdimen 2)
const SPACE_SHRINK_RATIO = 1 / 3; // shrink = 33% of space width (fontdimen 4 / fontdimen 2)

// Knuth-Plass line breaking with Liang hyphenation
// References: break.lua (SILE), tex.web (TeX), linebreak.c (LuaTeX), pTeX, xeCJK
var ItemType;
(function (ItemType) {
    ItemType[ItemType["BOX"] = 0] = "BOX";
    ItemType[ItemType["GLUE"] = 1] = "GLUE";
    ItemType[ItemType["PENALTY"] = 2] = "PENALTY";
    ItemType[ItemType["DISCRETIONARY"] = 3] = "DISCRETIONARY"; // hyphenation point with pre/post/no-break forms
})(ItemType || (ItemType = {}));
// TeX fitness classes (tex.web lines 16099-16105)
var FitnessClass;
(function (FitnessClass) {
    FitnessClass[FitnessClass["VERY_LOOSE"] = 0] = "VERY_LOOSE";
    FitnessClass[FitnessClass["LOOSE"] = 1] = "LOOSE";
    FitnessClass[FitnessClass["DECENT"] = 2] = "DECENT";
    FitnessClass[FitnessClass["TIGHT"] = 3] = "TIGHT"; // lines shrinking 0.5 to 1.0 of their shrinkability
})(FitnessClass || (FitnessClass = {}));
// Active node management with Map for lookup by (position, fitness)
class ActiveNodeList {
    constructor() {
        this.nodesByKey = new Map();
        this.activeList = [];
    }
    getKey(position, fitness) {
        return (position << 2) | fitness;
    }
    // Insert or update node - returns true if node was added/updated
    insert(node) {
        const key = this.getKey(node.position, node.fitness);
        const existing = this.nodesByKey.get(key);
        if (existing) {
            // Update existing if new one is better
            if (node.totalDemerits < existing.totalDemerits) {
                existing.totalDemerits = node.totalDemerits;
                existing.previous = node.previous;
                existing.hyphenated = node.hyphenated;
                existing.line = node.line;
                existing.cumWidth = node.cumWidth;
                existing.cumStretch = node.cumStretch;
                existing.cumShrink = node.cumShrink;
                return true;
            }
            return false;
        }
        // Add new node
        node.active = true;
        node.activeIndex = this.activeList.length;
        this.activeList.push(node);
        this.nodesByKey.set(key, node);
        return true;
    }
    deactivate(node) {
        if (!node.active)
            return;
        node.active = false;
        const idx = node.activeIndex;
        const lastIdx = this.activeList.length - 1;
        if (idx !== lastIdx) {
            const lastNode = this.activeList[lastIdx];
            this.activeList[idx] = lastNode;
            lastNode.activeIndex = idx;
        }
        this.activeList.pop();
    }
    getActive() {
        return this.activeList;
    }
    size() {
        return this.activeList.length;
    }
}
// TeX parameters (tex.web lines 4934-4936, 4997-4999)
const DEFAULT_HYPHEN_PENALTY = 50; // \hyphenpenalty
const DEFAULT_EX_HYPHEN_PENALTY = 50; // \exhyphenpenalty
const DEFAULT_DOUBLE_HYPHEN_DEMERITS = 10000; // \doublehyphendemerits
const DEFAULT_FINAL_HYPHEN_DEMERITS = 5000; // \finalhyphendemerits
const DEFAULT_LINE_PENALTY = 10; // \linepenalty
const DEFAULT_FITNESS_DIFF_DEMERITS = 10000; // \adjdemerits
const DEFAULT_LEFT_HYPHEN_MIN = 2; // \lefthyphenmin
const DEFAULT_RIGHT_HYPHEN_MIN = 3; // \righthyphenmin
// TeX special values (tex.web lines 2335, 3258, 3259)
const INF_BAD = 10000; // inf_bad - infinitely bad badness
const INFINITY_PENALTY = 10000; // inf_penalty - never break here
const EJECT_PENALTY = -10000; // eject_penalty - force break here
// Retry increment when no breakpoints found
const EMERGENCY_STRETCH_INCREMENT = 0.1;
class LineBreak {
    // TeX: badness function (tex.web lines 2337-2348)
    // Computes badness = 100 * (t/s)³ where t=adjustment, s=stretchability
    // Simplified from TeX's fixed-point integer arithmetic to floating-point
    //
    // Returns INF_BAD+1 for overfull boxes so they're rejected even when
    // threshold=INF_BAD in emergency pass
    static badness(t, s) {
        if (t === 0)
            return 0;
        if (s <= 0)
            return INF_BAD + 1;
        const r = Math.abs(t / s);
        if (r > 10)
            return INF_BAD + 1;
        return Math.min(Math.round(100 * r ** 3), INF_BAD);
    }
    // TeX fitness classification (tex.web lines 16099-16105, 16799-16812)
    // TeX uses badness thresholds 12 and 99, which correspond to ratios ~0.5 and ~1.0
    // We use ratio directly since we compute it anyway. Well, and because SILE does
    // it this way. Thanks Simon :)
    static fitnessClass(ratio) {
        if (ratio < -0.5)
            return FitnessClass.TIGHT; // shrinking significantly
        if (ratio < 0.5)
            return FitnessClass.DECENT; // normal
        if (ratio < 1)
            return FitnessClass.LOOSE; // stretching 0.5-1.0
        return FitnessClass.VERY_LOOSE; // stretching > 1.0
    }
    static findHyphenationPoints(word, language = 'en-us', availablePatterns, lefthyphenmin = DEFAULT_LEFT_HYPHEN_MIN, righthyphenmin = DEFAULT_RIGHT_HYPHEN_MIN) {
        let patternTrie;
        if (availablePatterns && availablePatterns[language]) {
            patternTrie = availablePatterns[language];
        }
        else {
            return [];
        }
        if (!patternTrie)
            return [];
        const lowerWord = word.toLowerCase();
        const paddedWord = `.${lowerWord}.`;
        const points = new Array(paddedWord.length).fill(0);
        for (let i = 0; i < paddedWord.length; i++) {
            let node = patternTrie;
            for (let j = i; j < paddedWord.length; j++) {
                const char = paddedWord[j];
                if (!node.children || !node.children[char])
                    break;
                node = node.children[char];
                if (node.patterns) {
                    for (let k = 0; k < node.patterns.length; k++) {
                        const pos = i + k;
                        if (pos < points.length) {
                            points[pos] = Math.max(points[pos], node.patterns[k]);
                        }
                    }
                }
            }
        }
        const hyphenPoints = [];
        for (let i = 2; i < paddedWord.length - 2; i++) {
            if (points[i] % 2 === 1) {
                hyphenPoints.push(i - 1);
            }
        }
        return hyphenPoints.filter((pos) => pos >= lefthyphenmin && word.length - pos >= righthyphenmin);
    }
    static itemizeText(text, measureText, measureTextWidths, hyphenate = false, language = 'en-us', availablePatterns, lefthyphenmin = DEFAULT_LEFT_HYPHEN_MIN, righthyphenmin = DEFAULT_RIGHT_HYPHEN_MIN, context, lineWidth) {
        const items = [];
        items.push(...this.itemizeParagraph(text, measureText, measureTextWidths, hyphenate, language, availablePatterns, lefthyphenmin, righthyphenmin, context, lineWidth));
        // Final glue and penalty
        items.push({
            type: ItemType.GLUE,
            width: 0,
            stretch: 10000000,
            shrink: 0,
            text: '',
            originIndex: text.length
        });
        items.push({
            type: ItemType.PENALTY,
            width: 0,
            penalty: EJECT_PENALTY,
            text: '',
            originIndex: text.length
        });
        return items;
    }
    static isCJK(char) {
        const code = char.codePointAt(0);
        if (code === undefined)
            return false;
        return ((code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
            (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
            (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
            (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
            (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
            (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Extension E
            (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
            (code >= 0x3040 && code <= 0x309f) || // Hiragana
            (code >= 0x30a0 && code <= 0x30ff) || // Katakana
            (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
            (code >= 0x1100 && code <= 0x11ff) || // Hangul Jamo
            (code >= 0x3130 && code <= 0x318f) || // Hangul Compatibility Jamo
            (code >= 0xa960 && code <= 0xa97f) || // Hangul Jamo Extended-A
            (code >= 0xd7b0 && code <= 0xd7ff) || // Hangul Jamo Extended-B
            (code >= 0xffa0 && code <= 0xffdc) // Halfwidth Hangul
        );
    }
    // Closing punctuation - no line break before (UAX #14 CL, JIS X 4051)
    static isCJClosingPunctuation(char) {
        const code = char.charCodeAt(0);
        return (code === 0x3001 || // 、
            code === 0x3002 || // 。
            code === 0xff0c || // ，
            code === 0xff0e || // ．
            code === 0xff1a || // ：
            code === 0xff1b || // ；
            code === 0xff01 || // ！
            code === 0xff1f || // ？
            code === 0xff09 || // ）
            code === 0x3011 || // 】
            code === 0xff5d || // ｝
            code === 0x300d || // 」
            code === 0x300f || // 』
            code === 0x3009 || // 〉
            code === 0x300b || // 》
            code === 0x3015 || // 〕
            code === 0x3017 || // 〗
            code === 0x3019 || // 〙
            code === 0x301b || // 〛
            code === 0x30fc || // ー
            code === 0x2014 || // —
            code === 0x2026 || // …
            code === 0x2025 // ‥
        );
    }
    // Opening punctuation - no line break after (UAX #14 OP, JIS X 4051)
    static isCJOpeningPunctuation(char) {
        const code = char.charCodeAt(0);
        return (code === 0xff08 || // （
            code === 0x3010 || // 【
            code === 0xff5b || // ｛
            code === 0x300c || // 「
            code === 0x300e || // 『
            code === 0x3008 || // 〈
            code === 0x300a || // 《
            code === 0x3014 || // 〔
            code === 0x3016 || // 〖
            code === 0x3018 || // 〘
            code === 0x301a // 〚
        );
    }
    static isCJPunctuation(char) {
        return (this.isCJClosingPunctuation(char) || this.isCJOpeningPunctuation(char));
    }
    static itemizeCJKText(text, measureText, measureTextWidths, context, startOffset = 0, glueParams) {
        const items = [];
        const chars = Array.from(text);
        const widths = measureTextWidths ? measureTextWidths(text) : null;
        let textPosition = startOffset;
        let glueWidth, glueStretch, glueShrink;
        if (glueParams) {
            glueWidth = glueParams.width;
            glueStretch = glueParams.stretch;
            glueShrink = glueParams.shrink;
        }
        else {
            const baseCharWidth = measureText('字');
            glueWidth = 0;
            glueStretch = baseCharWidth * 0.04;
            glueShrink = baseCharWidth * 0.04;
        }
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const nextChar = i < chars.length - 1 ? chars[i + 1] : null;
            if (/\s/.test(char)) {
                const width = widths
                    ? (widths[i] ?? measureText(char))
                    : measureText(char);
                items.push({
                    type: ItemType.GLUE,
                    width,
                    stretch: width * SPACE_STRETCH_RATIO,
                    shrink: width * SPACE_SHRINK_RATIO,
                    text: char,
                    originIndex: textPosition
                });
                textPosition += char.length;
                continue;
            }
            items.push({
                type: ItemType.BOX,
                width: widths ? (widths[i] ?? measureText(char)) : measureText(char),
                text: char,
                originIndex: textPosition
            });
            textPosition += char.length;
            if (nextChar && !/\s/.test(nextChar)) {
                let canBreak = true;
                if (this.isCJClosingPunctuation(nextChar))
                    canBreak = false;
                if (this.isCJOpeningPunctuation(char))
                    canBreak = false;
                const isPunctPair = this.isCJPunctuation(char) && this.isCJPunctuation(nextChar);
                if (canBreak && !isPunctPair) {
                    items.push({
                        type: ItemType.GLUE,
                        width: glueWidth,
                        stretch: glueStretch,
                        shrink: glueShrink,
                        text: '',
                        originIndex: textPosition
                    });
                }
            }
        }
        return items;
    }
    static itemizeParagraph(text, measureText, measureTextWidths, hyphenate, language, availablePatterns, lefthyphenmin, righthyphenmin, context, lineWidth) {
        const items = [];
        const chars = Array.from(text);
        // Inter-character glue for CJK justification
        // Matches pTeX's default \kanjiskip behavior
        let cjkGlueParams;
        const getCjkGlueParams = () => {
            if (!cjkGlueParams) {
                const baseCharWidth = measureText('字');
                cjkGlueParams = {
                    width: 0,
                    stretch: baseCharWidth * 0.04,
                    shrink: baseCharWidth * 0.04
                };
            }
            return cjkGlueParams;
        };
        let buffer = '';
        let bufferStart = 0;
        let bufferScript = null;
        let textPosition = 0;
        const flushBuffer = () => {
            if (buffer.length === 0)
                return;
            if (bufferScript === 'cjk') {
                items.push(...this.itemizeCJKText(buffer, measureText, measureTextWidths, context, bufferStart, getCjkGlueParams()));
            }
            else {
                items.push(...this.itemizeWordBased(buffer, bufferStart, measureText, hyphenate, language, availablePatterns, lefthyphenmin, righthyphenmin, context, lineWidth));
            }
            buffer = '';
            bufferScript = null;
        };
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const isCJKChar = this.isCJK(char);
            const currentScript = isCJKChar ? 'cjk' : 'word';
            if (bufferScript !== null && bufferScript !== currentScript) {
                flushBuffer();
                bufferStart = textPosition;
            }
            if (bufferScript === null) {
                bufferScript = currentScript;
                bufferStart = textPosition;
            }
            buffer += char;
            textPosition += char.length;
        }
        flushBuffer();
        return items;
    }
    static itemizeWordBased(text, startOffset, measureText, hyphenate, language, availablePatterns, lefthyphenmin, righthyphenmin, context, lineWidth) {
        const items = [];
        const tokens = text.match(/\S+|\s+/g) || [];
        let currentIndex = 0;
        for (const token of tokens) {
            const tokenStartIndex = startOffset + currentIndex;
            if (/\s+/.test(token)) {
                const width = measureText(token);
                items.push({
                    type: ItemType.GLUE,
                    width,
                    stretch: width * SPACE_STRETCH_RATIO,
                    shrink: width * SPACE_SHRINK_RATIO,
                    text: token,
                    originIndex: tokenStartIndex
                });
                currentIndex += token.length;
            }
            else {
                if (lineWidth && token.includes('-') && !token.includes('\u00AD')) {
                    const tokenWidth = measureText(token);
                    if (tokenWidth > lineWidth) {
                        // Break long hyphenated tokens into characters (break-all behavior)
                        const chars = Array.from(token);
                        for (let i = 0; i < chars.length; i++) {
                            items.push({
                                type: ItemType.BOX,
                                width: measureText(chars[i]),
                                text: chars[i],
                                originIndex: tokenStartIndex + i
                            });
                            if (i < chars.length - 1) {
                                items.push({
                                    type: ItemType.PENALTY,
                                    width: 0,
                                    penalty: 5000,
                                    originIndex: tokenStartIndex + i + 1
                                });
                            }
                        }
                        currentIndex += token.length;
                        continue;
                    }
                }
                const segments = token.split(/(-)/);
                let segmentIndex = tokenStartIndex;
                for (const segment of segments) {
                    if (!segment)
                        continue;
                    if (segment === '-') {
                        items.push({
                            type: ItemType.DISCRETIONARY,
                            width: measureText('-'),
                            preBreak: '-',
                            postBreak: '',
                            noBreak: '-',
                            preBreakWidth: measureText('-'),
                            penalty: context?.exHyphenPenalty ?? DEFAULT_EX_HYPHEN_PENALTY,
                            flagged: true,
                            text: '-',
                            originIndex: segmentIndex
                        });
                        segmentIndex += 1;
                    }
                    else if (segment.includes('\u00AD')) {
                        const parts = segment.split('\u00AD');
                        let runningIndex = 0;
                        for (let k = 0; k < parts.length; k++) {
                            const partText = parts[k];
                            if (partText.length > 0) {
                                items.push({
                                    type: ItemType.BOX,
                                    width: measureText(partText),
                                    text: partText,
                                    originIndex: segmentIndex + runningIndex
                                });
                                runningIndex += partText.length;
                            }
                            if (k < parts.length - 1) {
                                items.push({
                                    type: ItemType.DISCRETIONARY,
                                    width: 0,
                                    preBreak: '-',
                                    postBreak: '',
                                    noBreak: '',
                                    preBreakWidth: measureText('-'),
                                    penalty: context?.hyphenPenalty ?? DEFAULT_HYPHEN_PENALTY,
                                    flagged: true,
                                    text: '',
                                    originIndex: segmentIndex + runningIndex
                                });
                                runningIndex += 1;
                            }
                        }
                    }
                    else if (hyphenate &&
                        segment.length >= lefthyphenmin + righthyphenmin &&
                        /^\p{L}+$/u.test(segment)) {
                        const hyphenPoints = this.findHyphenationPoints(segment, language, availablePatterns, lefthyphenmin, righthyphenmin);
                        if (hyphenPoints.length > 0) {
                            let lastPoint = 0;
                            for (const point of hyphenPoints) {
                                const part = segment.substring(lastPoint, point);
                                items.push({
                                    type: ItemType.BOX,
                                    width: measureText(part),
                                    text: part,
                                    originIndex: segmentIndex + lastPoint
                                });
                                items.push({
                                    type: ItemType.DISCRETIONARY,
                                    width: 0,
                                    preBreak: '-',
                                    postBreak: '',
                                    noBreak: '',
                                    preBreakWidth: measureText('-'),
                                    penalty: context?.hyphenPenalty ?? DEFAULT_HYPHEN_PENALTY,
                                    flagged: true,
                                    text: '',
                                    originIndex: segmentIndex + point
                                });
                                lastPoint = point;
                            }
                            items.push({
                                type: ItemType.BOX,
                                width: measureText(segment.substring(lastPoint)),
                                text: segment.substring(lastPoint),
                                originIndex: segmentIndex + lastPoint
                            });
                        }
                        else {
                            const wordWidth = measureText(segment);
                            if (lineWidth && wordWidth > lineWidth) {
                                // Word longer than line width - break into characters
                                const chars = Array.from(segment);
                                for (let i = 0; i < chars.length; i++) {
                                    items.push({
                                        type: ItemType.BOX,
                                        width: measureText(chars[i]),
                                        text: chars[i],
                                        originIndex: segmentIndex + i
                                    });
                                    if (i < chars.length - 1) {
                                        items.push({
                                            type: ItemType.PENALTY,
                                            width: 0,
                                            penalty: 5000,
                                            originIndex: segmentIndex + i + 1
                                        });
                                    }
                                }
                            }
                            else {
                                items.push({
                                    type: ItemType.BOX,
                                    width: wordWidth,
                                    text: segment,
                                    originIndex: segmentIndex
                                });
                            }
                        }
                    }
                    else {
                        const wordWidth = measureText(segment);
                        if (lineWidth && wordWidth > lineWidth) {
                            // Word longer than line width - break into characters
                            const chars = Array.from(segment);
                            for (let i = 0; i < chars.length; i++) {
                                items.push({
                                    type: ItemType.BOX,
                                    width: measureText(chars[i]),
                                    text: chars[i],
                                    originIndex: segmentIndex + i
                                });
                                if (i < chars.length - 1) {
                                    items.push({
                                        type: ItemType.PENALTY,
                                        width: 0,
                                        penalty: 5000,
                                        originIndex: segmentIndex + i + 1
                                    });
                                }
                            }
                        }
                        else {
                            items.push({
                                type: ItemType.BOX,
                                width: wordWidth,
                                text: segment,
                                originIndex: segmentIndex
                            });
                        }
                    }
                    segmentIndex += segment.length;
                }
                currentIndex += token.length;
            }
        }
        return items;
    }
    // TeX: line_break inner loop (tex.web lines 16169-17256)
    // Finds optimal breakpoints using Knuth-Plass algorithm
    static lineBreak(items, lineWidth, threshold, emergencyStretch, context) {
        const activeNodes = new ActiveNodeList();
        // Start node with zero cumulative width
        activeNodes.insert({
            position: 0,
            line: 0,
            fitness: FitnessClass.DECENT,
            totalDemerits: 0,
            previous: null,
            hyphenated: false,
            active: true,
            activeIndex: 0,
            cumWidth: 0,
            cumStretch: 0,
            cumShrink: 0
        });
        // Cumulative width from paragraph start, representing items[0..i-1]
        let cumWidth = 0;
        let cumStretch = 0;
        let cumShrink = 0;
        // Process each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // Check if this is a legal breakpoint
            const isBreakpoint = (item.type === ItemType.PENALTY &&
                item.penalty < INFINITY_PENALTY) ||
                item.type === ItemType.DISCRETIONARY ||
                (item.type === ItemType.GLUE &&
                    i > 0 &&
                    items[i - 1].type === ItemType.BOX);
            if (!isBreakpoint) {
                // Accumulate width for non-breakpoint items
                if (item.type === ItemType.BOX) {
                    cumWidth += item.width;
                }
                else if (item.type === ItemType.GLUE) {
                    const glue = item;
                    cumWidth += glue.width;
                    cumStretch += glue.stretch;
                    cumShrink += glue.shrink;
                }
                else if (item.type === ItemType.DISCRETIONARY) {
                    cumWidth += item.width;
                }
                continue;
            }
            // Get penalty and flagged status
            let pi = 0;
            let flagged = false;
            if (item.type === ItemType.PENALTY) {
                pi = item.penalty;
                flagged = item.flagged || false;
            }
            else if (item.type === ItemType.DISCRETIONARY) {
                pi = item.penalty;
                flagged = item.flagged || false;
            }
            // Width added at break
            let breakWidth = 0;
            if (item.type === ItemType.DISCRETIONARY) {
                breakWidth = item.preBreakWidth;
            }
            // Best for each fitness class
            const bestNode = [null, null, null, null];
            const bestDemerits = [Infinity, Infinity, Infinity, Infinity];
            // Nodes to deactivate
            const toDeactivate = [];
            // Try each active node as predecessor
            const active = activeNodes.getActive();
            for (let j = 0; j < active.length; j++) {
                const a = active[j];
                // Line width from a to i
                const lineW = cumWidth - a.cumWidth + breakWidth;
                const lineStretch = cumStretch - a.cumStretch;
                const lineShrink = cumShrink - a.cumShrink;
                const shortfall = lineWidth - lineW;
                let ratio;
                if (shortfall > 0) {
                    const effectiveStretch = lineStretch + emergencyStretch;
                    ratio =
                        effectiveStretch > 0 ? shortfall / effectiveStretch : Infinity;
                }
                else if (shortfall < 0) {
                    ratio = lineShrink > 0 ? shortfall / lineShrink : -Infinity;
                }
                else {
                    ratio = 0;
                }
                // Calculate badness
                const bad = this.badness(shortfall, shortfall > 0 ? lineStretch + emergencyStretch : lineShrink);
                // Check feasibility
                if (ratio < -1) {
                    toDeactivate.push(a);
                    continue;
                }
                if (pi !== EJECT_PENALTY && bad > threshold) {
                    continue;
                }
                // Calculate demerits
                let demerits = context.linePenalty + bad;
                if (Math.abs(demerits) >= 10000) {
                    demerits = 100000000;
                }
                else {
                    demerits = demerits * demerits;
                }
                if (pi > 0) {
                    demerits += pi * pi;
                }
                else if (pi > EJECT_PENALTY) {
                    demerits -= pi * pi;
                }
                if (flagged && a.hyphenated) {
                    demerits += context.doubleHyphenDemerits;
                }
                const fitness = this.fitnessClass(ratio);
                if (Math.abs(fitness - a.fitness) > 1) {
                    demerits += context.adjDemerits;
                }
                const totalDemerits = a.totalDemerits + demerits;
                if (totalDemerits < bestDemerits[fitness]) {
                    bestDemerits[fitness] = totalDemerits;
                    bestNode[fitness] = {
                        position: i,
                        line: a.line + 1,
                        fitness,
                        totalDemerits,
                        previous: a,
                        hyphenated: flagged,
                        active: true,
                        activeIndex: -1,
                        cumWidth: cumWidth,
                        cumStretch: cumStretch,
                        cumShrink: cumShrink
                    };
                }
            }
            // Deactivate nodes
            for (const node of toDeactivate) {
                activeNodes.deactivate(node);
            }
            // Insert best nodes
            for (let f = 0; f < 4; f++) {
                if (bestNode[f]) {
                    activeNodes.insert(bestNode[f]);
                }
            }
            if (activeNodes.size() === 0 && pi !== EJECT_PENALTY) {
                return null;
            }
            // Accumulate width after evaluating this breakpoint
            if (item.type === ItemType.BOX) {
                cumWidth += item.width;
            }
            else if (item.type === ItemType.GLUE) {
                const glue = item;
                cumWidth += glue.width;
                cumStretch += glue.stretch;
                cumShrink += glue.shrink;
            }
            else if (item.type === ItemType.DISCRETIONARY) {
                cumWidth += item.width;
            }
        }
        // Find best solution
        let best = null;
        let bestTotal = Infinity;
        for (const node of activeNodes.getActive()) {
            if (node.totalDemerits < bestTotal) {
                bestTotal = node.totalDemerits;
                best = node;
            }
        }
        return best;
    }
    // Main entry point for line breaking
    // Implements the multi-pass approach similar to TeX's line_break (tex.web lines 16054-17067)
    // 1. First pass without hyphenation (pretolerance)
    // 2. Second pass with hyphenation (tolerance)
    // 3. Emergency stretch passes with increasing stretchability
    static breakText(options) {
        if (!options.text || options.text.length === 0) {
            return [];
        }
        perfLogger.start('LineBreak.breakText', {
            textLength: options.text.length,
            width: options.width,
            align: options.align || 'left',
            hyphenate: options.hyphenate || false
        });
        const { text, width, align = 'left', direction = 'ltr', hyphenate = false, language = 'en-us', respectExistingBreaks = true, measureText, measureTextWidths, hyphenationPatterns, unitsPerEm, letterSpacing = 0, tolerance = DEFAULT_TOLERANCE, pretolerance = DEFAULT_PRETOLERANCE, emergencyStretch = DEFAULT_EMERGENCY_STRETCH, autoEmergencyStretch, lefthyphenmin = DEFAULT_LEFT_HYPHEN_MIN, righthyphenmin = DEFAULT_RIGHT_HYPHEN_MIN, linepenalty = DEFAULT_LINE_PENALTY, adjdemerits = DEFAULT_FITNESS_DIFF_DEMERITS, hyphenpenalty = DEFAULT_HYPHEN_PENALTY, exhyphenpenalty = DEFAULT_EX_HYPHEN_PENALTY, doublehyphendemerits = DEFAULT_DOUBLE_HYPHEN_DEMERITS, finalhyphendemerits = DEFAULT_FINAL_HYPHEN_DEMERITS } = options;
        // Handle multiple paragraphs
        if (respectExistingBreaks && text.includes('\n')) {
            const paragraphs = text.split('\n');
            const allLines = [];
            let currentOriginOffset = 0;
            for (const paragraph of paragraphs) {
                if (paragraph.length === 0) {
                    allLines.push({
                        text: '',
                        originalStart: currentOriginOffset,
                        originalEnd: currentOriginOffset,
                        xOffset: 0,
                        isLastLine: true,
                        naturalWidth: 0,
                        endedWithHyphen: false
                    });
                }
                else {
                    const paragraphLines = this.breakText({
                        ...options,
                        text: paragraph,
                        respectExistingBreaks: false
                    });
                    paragraphLines.forEach((line) => {
                        line.originalStart += currentOriginOffset;
                        line.originalEnd += currentOriginOffset;
                    });
                    allLines.push(...paragraphLines);
                }
                currentOriginOffset += paragraph.length + 1;
            }
            perfLogger.end('LineBreak.breakText');
            return allLines;
        }
        let useHyphenation = hyphenate;
        if (useHyphenation &&
            (!hyphenationPatterns || !hyphenationPatterns[language])) {
            logger.warn(`Hyphenation patterns for ${language} not available`);
            useHyphenation = false;
        }
        let initialEmergencyStretch = emergencyStretch;
        if (autoEmergencyStretch !== undefined && width) {
            initialEmergencyStretch = width * autoEmergencyStretch;
        }
        const context = {
            linePenalty: linepenalty,
            adjDemerits: adjdemerits,
            doubleHyphenDemerits: doublehyphendemerits,
            finalHyphenDemerits: finalhyphendemerits,
            hyphenPenalty: hyphenpenalty,
            exHyphenPenalty: exhyphenpenalty,
            currentAlign: align,
            unitsPerEm,
            letterSpacingFU: unitsPerEm ? letterSpacing * unitsPerEm : 0
        };
        if (!width || width === Infinity) {
            const measuredWidth = measureText(text);
            perfLogger.end('LineBreak.breakText');
            return [
                {
                    text,
                    originalStart: 0,
                    originalEnd: text.length - 1,
                    xOffset: 0,
                    isLastLine: true,
                    naturalWidth: measuredWidth,
                    endedWithHyphen: false
                }
            ];
        }
        // First pass: without hyphenation
        let items = this.itemizeText(text, measureText, measureTextWidths, false, language, hyphenationPatterns, lefthyphenmin, righthyphenmin, context, width);
        let best = this.lineBreak(items, width, pretolerance, 0, context);
        // Second pass: with hyphenation
        if (!best && useHyphenation) {
            items = this.itemizeText(text, measureText, measureTextWidths, true, language, hyphenationPatterns, lefthyphenmin, righthyphenmin, context, width);
            best = this.lineBreak(items, width, tolerance, 0, context);
        }
        // Third pass: with emergency stretch, retry with increasing amounts
        if (!best) {
            const MAX_EMERGENCY_ITERATIONS = 5;
            for (let i = 0; i < MAX_EMERGENCY_ITERATIONS && !best; i++) {
                const currentStretch = initialEmergencyStretch + i * width * EMERGENCY_STRETCH_INCREMENT;
                best = this.lineBreak(items, width, tolerance, currentStretch, context);
                // Fourth pass: high threshold with current stretch
                if (!best) {
                    best = this.lineBreak(items, width, INF_BAD, currentStretch, context);
                }
            }
        }
        if (best) {
            const breakpoints = [];
            let node = best;
            while (node && node.position > 0) {
                breakpoints.unshift(node.position);
                node = node.previous;
            }
            perfLogger.end('LineBreak.breakText');
            return this.postLineBreak(text, items, breakpoints, width, align, direction, context);
        }
        perfLogger.end('LineBreak.breakText');
        return [
            {
                text,
                originalStart: 0,
                originalEnd: text.length - 1,
                xOffset: 0,
                adjustmentRatio: 0,
                isLastLine: true,
                naturalWidth: measureText(text),
                endedWithHyphen: false
            }
        ];
    }
    // TeX: post_line_break (tex.web lines 17260-17448)
    // Creates the actual lines from the computed breakpoints
    static postLineBreak(text, items, breakpoints, lineWidth, align, direction, context) {
        if (breakpoints.length === 0) {
            return [
                {
                    text,
                    originalStart: 0,
                    originalEnd: text.length - 1,
                    xOffset: 0
                }
            ];
        }
        const lines = [];
        let lineStart = 0;
        for (let i = 0; i < breakpoints.length; i++) {
            const breakpoint = breakpoints[i];
            const willHaveFinalLine = breakpoints[breakpoints.length - 1] + 1 < items.length - 1;
            const isLastLine = willHaveFinalLine
                ? false
                : i === breakpoints.length - 1;
            const lineTextParts = [];
            let originalStart = -1;
            let originalEnd = -1;
            let naturalWidth = 0;
            let totalStretch = 0;
            let totalShrink = 0;
            for (let j = lineStart; j < breakpoint; j++) {
                const item = items[j];
                if ((item.type === ItemType.PENALTY && !item.text) ||
                    (item.type === ItemType.DISCRETIONARY &&
                        !item.noBreak)) {
                    continue;
                }
                if (item.originIndex !== undefined) {
                    if (originalStart === -1 || item.originIndex < originalStart)
                        originalStart = item.originIndex;
                    const textLength = item.text ? item.text.length : 0;
                    const itemEnd = item.originIndex + textLength - 1;
                    if (itemEnd > originalEnd)
                        originalEnd = itemEnd;
                }
                if (item.text) {
                    lineTextParts.push(item.text);
                }
                else if (item.type === ItemType.DISCRETIONARY) {
                    const disc = item;
                    if (disc.noBreak)
                        lineTextParts.push(disc.noBreak);
                }
                naturalWidth += item.width;
                if (item.type === ItemType.GLUE) {
                    totalStretch += item.stretch;
                    totalShrink += item.shrink;
                }
            }
            const breakItem = items[breakpoint];
            let endedWithHyphen = false;
            if (breakpoint < items.length) {
                if (breakItem.type === ItemType.PENALTY &&
                    breakItem.flagged) {
                    lineTextParts.push('-');
                    naturalWidth += breakItem.width;
                    endedWithHyphen = true;
                    if (breakItem.originIndex !== undefined)
                        originalEnd = breakItem.originIndex - 1;
                }
                else if (breakItem.type === ItemType.DISCRETIONARY) {
                    const disc = breakItem;
                    if (disc.preBreak) {
                        lineTextParts.push(disc.preBreak);
                        naturalWidth += disc.preBreakWidth;
                        endedWithHyphen = disc.flagged || false;
                        if (breakItem.originIndex !== undefined)
                            originalEnd = breakItem.originIndex - 1;
                    }
                }
            }
            const lineText = lineTextParts.join('');
            if (context?.letterSpacingFU && naturalWidth !== 0) {
                naturalWidth -= context.letterSpacingFU;
            }
            let xOffset = 0;
            let adjustmentRatio = 0;
            let effectiveAlign = align;
            if (align === 'justify' && isLastLine) {
                effectiveAlign = direction === 'rtl' ? 'right' : 'left';
            }
            if (effectiveAlign === 'center') {
                xOffset = (lineWidth - naturalWidth) / 2;
            }
            else if (effectiveAlign === 'right') {
                xOffset = lineWidth - naturalWidth;
            }
            else if (effectiveAlign === 'justify' && !isLastLine) {
                const shortfall = lineWidth - naturalWidth;
                if (shortfall > 0 && totalStretch > 0) {
                    adjustmentRatio = shortfall / totalStretch;
                }
                else if (shortfall < 0 && totalShrink > 0) {
                    adjustmentRatio = shortfall / totalShrink;
                }
            }
            lines.push({
                text: lineText,
                originalStart,
                originalEnd,
                xOffset,
                adjustmentRatio,
                isLastLine: false,
                naturalWidth,
                endedWithHyphen
            });
            lineStart = breakpoint + 1;
        }
        // Handle remaining content
        if (lineStart < items.length - 1) {
            const finalLineTextParts = [];
            let finalOriginalStart = -1;
            let finalOriginalEnd = -1;
            let finalNaturalWidth = 0;
            for (let j = lineStart; j < items.length - 1; j++) {
                const item = items[j];
                if (item.type === ItemType.PENALTY)
                    continue;
                if (item.originIndex !== undefined) {
                    if (finalOriginalStart === -1 ||
                        item.originIndex < finalOriginalStart) {
                        finalOriginalStart = item.originIndex;
                    }
                    if (item.originIndex > finalOriginalEnd) {
                        finalOriginalEnd = item.originIndex;
                    }
                }
                if (item.text)
                    finalLineTextParts.push(item.text);
                finalNaturalWidth += item.width;
            }
            if (context?.letterSpacingFU && finalNaturalWidth !== 0) {
                finalNaturalWidth -= context.letterSpacingFU;
            }
            let finalXOffset = 0;
            let finalEffectiveAlign = align;
            if (align === 'justify') {
                finalEffectiveAlign = direction === 'rtl' ? 'right' : 'left';
            }
            if (finalEffectiveAlign === 'center') {
                finalXOffset = (lineWidth - finalNaturalWidth) / 2;
            }
            else if (finalEffectiveAlign === 'right') {
                finalXOffset = lineWidth - finalNaturalWidth;
            }
            lines.push({
                text: finalLineTextParts.join(''),
                originalStart: finalOriginalStart,
                originalEnd: finalOriginalEnd,
                xOffset: finalXOffset,
                adjustmentRatio: 0,
                isLastLine: true,
                naturalWidth: finalNaturalWidth,
                endedWithHyphen: false
            });
            if (lines.length > 1)
                lines[lines.length - 2].isLastLine = false;
            lines[lines.length - 1].isLastLine = true;
        }
        else if (lines.length > 0) {
            lines[lines.length - 1].isLastLine = true;
        }
        return lines;
    }
}

// Memoize conversion per feature-object identity to avoid rebuilding the same
// comma-separated string on every HarfBuzz shape call
const featureStringCache = new WeakMap();
// Convert feature objects to HarfBuzz comma-separated format
function convertFontFeaturesToString(features) {
    if (!features || Object.keys(features).length === 0) {
        return undefined;
    }
    const cached = featureStringCache.get(features);
    if (cached !== undefined) {
        return cached ?? undefined;
    }
    const featureStrings = [];
    // Preserve insertion order of the input object
    // (The public API/tests expect this to be stable and predictable)
    for (const [tag, value] of Object.entries(features)) {
        if (!/^[a-zA-Z0-9]{4}$/.test(tag)) {
            logger.warn(`Invalid OpenType feature tag: "${tag}". Tags must be exactly 4 alphanumeric characters.`);
            continue;
        }
        if (value === false || value === 0) {
            featureStrings.push(`${tag}=0`);
        }
        else if (value === true || value === 1) {
            featureStrings.push(tag);
        }
        else if (typeof value === 'number' && value > 1) {
            featureStrings.push(`${tag}=${Math.floor(value)}`);
        }
        else {
            logger.warn(`Invalid value for feature "${tag}": ${value}. Expected boolean or positive number.`);
        }
    }
    const result = featureStrings.length > 0 ? featureStrings.join(',') : undefined;
    featureStringCache.set(features, result ?? null);
    return result;
}

class TextMeasurer {
    // Shape once and return per-codepoint widths aligned with Array.from(text)
    // Groups glyph advances by HarfBuzz cluster (cl)
    // Includes trailing per-glyph letter spacing like measureTextWidth
    static measureTextWidths(loadedFont, text, letterSpacing = 0) {
        const chars = Array.from(text);
        if (chars.length === 0)
            return [];
        // HarfBuzz clusters are UTF-16 code unit indices
        const startToCharIndex = new Map();
        let codeUnitIndex = 0;
        for (let i = 0; i < chars.length; i++) {
            startToCharIndex.set(codeUnitIndex, i);
            codeUnitIndex += chars[i].length;
        }
        const widths = new Array(chars.length).fill(0);
        const buffer = loadedFont.hb.createBuffer();
        try {
            buffer.addText(text);
            buffer.guessSegmentProperties();
            const featuresString = convertFontFeaturesToString(loadedFont.fontFeatures);
            loadedFont.hb.shape(loadedFont.font, buffer, featuresString);
            const glyphInfos = buffer.json(loadedFont.font);
            const letterSpacingInFontUnits = letterSpacing * loadedFont.upem;
            for (let i = 0; i < glyphInfos.length; i++) {
                const glyph = glyphInfos[i];
                const cl = glyph.cl ?? 0;
                let charIndex = startToCharIndex.get(cl);
                // Fallback if cl lands mid-codepoint
                if (charIndex === undefined) {
                    // Find the closest start <= cl
                    for (let back = cl; back >= 0; back--) {
                        const candidate = startToCharIndex.get(back);
                        if (candidate !== undefined) {
                            charIndex = candidate;
                            break;
                        }
                    }
                }
                if (charIndex === undefined)
                    continue;
                widths[charIndex] += glyph.ax;
                if (letterSpacingInFontUnits !== 0) {
                    widths[charIndex] += letterSpacingInFontUnits;
                }
            }
            return widths;
        }
        finally {
            buffer.destroy();
        }
    }
    static measureTextWidth(loadedFont, text, letterSpacing = 0) {
        const buffer = loadedFont.hb.createBuffer();
        buffer.addText(text);
        buffer.guessSegmentProperties();
        const featuresString = convertFontFeaturesToString(loadedFont.fontFeatures);
        loadedFont.hb.shape(loadedFont.font, buffer, featuresString);
        const glyphInfos = buffer.json(loadedFont.font);
        const letterSpacingInFontUnits = letterSpacing * loadedFont.upem;
        let totalWidth = 0;
        glyphInfos.forEach((glyph) => {
            totalWidth += glyph.ax;
            if (letterSpacingInFontUnits !== 0) {
                totalWidth += letterSpacingInFontUnits;
            }
        });
        buffer.destroy();
        return totalWidth;
    }
}

class TextLayout {
    constructor(loadedFont) {
        this.loadedFont = loadedFont;
    }
    computeLines(options) {
        const { text, width, align, direction, hyphenate, language, respectExistingBreaks, tolerance, pretolerance, emergencyStretch, autoEmergencyStretch, hyphenationPatterns, lefthyphenmin, righthyphenmin, linepenalty, adjdemerits, hyphenpenalty, exhyphenpenalty, doublehyphendemerits, letterSpacing } = options;
        let lines;
        if (width) {
            // Line breaking uses a measureText function that already includes letterSpacing,
            // so widths passed into LineBreak.breakText account for tracking
            lines = LineBreak.breakText({
                text,
                width,
                align,
                direction,
                hyphenate,
                language,
                respectExistingBreaks,
                tolerance,
                pretolerance,
                emergencyStretch,
                autoEmergencyStretch,
                hyphenationPatterns,
                lefthyphenmin,
                righthyphenmin,
                linepenalty,
                adjdemerits,
                hyphenpenalty,
                exhyphenpenalty,
                doublehyphendemerits,
                unitsPerEm: this.loadedFont.upem,
                letterSpacing,
                measureText: (textToMeasure) => TextMeasurer.measureTextWidth(this.loadedFont, textToMeasure, letterSpacing // Letter spacing included in width measurements
                ),
                measureTextWidths: (textToMeasure) => TextMeasurer.measureTextWidths(this.loadedFont, textToMeasure, letterSpacing)
            });
        }
        else {
            // No width specified, just split on newlines
            const linesArray = text.split('\n');
            lines = [];
            let currentIndex = 0;
            for (const line of linesArray) {
                const originalEnd = line.length === 0 ? currentIndex : currentIndex + line.length - 1;
                lines.push({
                    text: line,
                    originalStart: currentIndex,
                    originalEnd,
                    xOffset: 0
                });
                currentIndex += line.length + 1;
            }
        }
        return { lines };
    }
    applyAlignment(vertices, options) {
        const { offset, adjustedBounds } = this.computeAlignmentOffset(options);
        if (offset !== 0) {
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] += offset;
            }
        }
        return { offset, adjustedBounds };
    }
    computeAlignmentOffset(options) {
        const { width, align, planeBounds } = options;
        let offset = 0;
        const adjustedBounds = {
            min: { ...planeBounds.min },
            max: { ...planeBounds.max }
        };
        if (width && (align === 'center' || align === 'right')) {
            const lineWidth = planeBounds.max.x - planeBounds.min.x;
            if (align === 'center') {
                offset = (width - lineWidth) / 2 - planeBounds.min.x;
            }
            else {
                offset = width - planeBounds.max.x;
            }
        }
        if (offset !== 0) {
            adjustedBounds.min.x += offset;
            adjustedBounds.max.x += offset;
        }
        return { offset, adjustedBounds };
    }
}

// Font file signature constants
const FONT_SIGNATURE_TRUE_TYPE = 0x00010000;
const FONT_SIGNATURE_OPEN_TYPE_CFF = 0x4f54544f; // 'OTTO'
const FONT_SIGNATURE_WOFF = 0x774f4646; // 'wOFF'
const FONT_SIGNATURE_WOFF2 = 0x774f4632; // 'wOF2'
// Table Tags
const TABLE_TAG_HEAD = 0x68656164; // 'head'
const TABLE_TAG_HHEA = 0x68686561; // 'hhea'
const TABLE_TAG_OS2 = 0x4f532f32; // 'OS/2'
const TABLE_TAG_FVAR = 0x66766172; // 'fvar'
const TABLE_TAG_STAT = 0x53544154; // 'STAT'
const TABLE_TAG_NAME = 0x6e616d65; // 'name'
const TABLE_TAG_CFF = 0x43464620; // 'CFF '
const TABLE_TAG_CFF2 = 0x43464632; // 'CFF2'
const TABLE_TAG_GSUB = 0x47535542; // 'GSUB'
const TABLE_TAG_GPOS = 0x47504f53; // 'GPOS'

// SFNT table directory
function parseTableDirectory(view) {
    const numTables = view.getUint16(4);
    const tableRecordsStart = 12;
    const tables = new Map();
    for (let i = 0; i < numTables; i++) {
        const recordOffset = tableRecordsStart + i * 16;
        // Guard against corrupt buffers that report more tables than exist
        if (recordOffset + 16 > view.byteLength) {
            break;
        }
        const tag = view.getUint32(recordOffset);
        const checksum = view.getUint32(recordOffset + 4);
        const offset = view.getUint32(recordOffset + 8);
        const length = view.getUint32(recordOffset + 12);
        tables.set(tag, { tag, checksum, offset, length });
    }
    return tables;
}

// OpenType tag prefixes as uint16 for bitwise comparison
const TAG_SS_PREFIX = 0x7373; // 'ss'
const TAG_CV_PREFIX = 0x6376; // 'cv'
const utf16beDecoder = new TextDecoder('utf-16be');
class FontMetadataExtractor {
    static extractMetadata(fontBuffer) {
        if (!fontBuffer || fontBuffer.byteLength < 12) {
            throw new Error('Invalid font buffer: too small to be a valid font file');
        }
        const view = new DataView(fontBuffer);
        const sfntVersion = view.getUint32(0);
        const validSignatures = [
            FONT_SIGNATURE_TRUE_TYPE,
            FONT_SIGNATURE_OPEN_TYPE_CFF
        ];
        if (!validSignatures.includes(sfntVersion)) {
            throw new Error(`Invalid font format. Expected TTF/OTF/WOFF/WOFF2, got signature: 0x${sfntVersion.toString(16)}`);
        }
        const tableDirectory = parseTableDirectory(view);
        const isCFF = tableDirectory.has(TABLE_TAG_CFF) || tableDirectory.has(TABLE_TAG_CFF2);
        const headTableOffset = tableDirectory.get(TABLE_TAG_HEAD)?.offset ?? 0;
        const hheaTableOffset = tableDirectory.get(TABLE_TAG_HHEA)?.offset ?? 0;
        const os2TableOffset = tableDirectory.get(TABLE_TAG_OS2)?.offset ?? 0;
        const fvarTableOffset = tableDirectory.get(TABLE_TAG_FVAR)?.offset ?? 0;
        const statTableOffset = tableDirectory.get(TABLE_TAG_STAT)?.offset ?? 0;
        const nameTableOffset = tableDirectory.get(TABLE_TAG_NAME)?.offset ?? 0;
        const unitsPerEm = headTableOffset
            ? view.getUint16(headTableOffset + 18)
            : 1000;
        let hheaMetrics = null;
        if (hheaTableOffset) {
            hheaMetrics = {
                ascender: view.getInt16(hheaTableOffset + 4),
                descender: view.getInt16(hheaTableOffset + 6),
                lineGap: view.getInt16(hheaTableOffset + 8)
            };
        }
        let os2Metrics = null;
        if (os2TableOffset) {
            os2Metrics = {
                typoAscender: view.getInt16(os2TableOffset + 68),
                typoDescender: view.getInt16(os2TableOffset + 70),
                typoLineGap: view.getInt16(os2TableOffset + 72),
                winAscent: view.getUint16(os2TableOffset + 74),
                winDescent: view.getUint16(os2TableOffset + 76)
            };
        }
        // Extract axis names only for variable fonts (fvar table present) with STAT table
        let axisNames = null;
        if (fvarTableOffset && statTableOffset && nameTableOffset) {
            axisNames = this.extractAxisNames(view, statTableOffset, nameTableOffset);
        }
        return {
            isCFF,
            unitsPerEm,
            hheaAscender: hheaMetrics?.ascender || null,
            hheaDescender: hheaMetrics?.descender || null,
            hheaLineGap: hheaMetrics?.lineGap || null,
            typoAscender: os2Metrics?.typoAscender || null,
            typoDescender: os2Metrics?.typoDescender || null,
            typoLineGap: os2Metrics?.typoLineGap || null,
            winAscent: os2Metrics?.winAscent || null,
            winDescent: os2Metrics?.winDescent || null,
            axisNames
        };
    }
    static extractFeatureTags(fontBuffer) {
        const view = new DataView(fontBuffer);
        const tableDirectory = parseTableDirectory(view);
        const gsubTableOffset = tableDirectory.get(TABLE_TAG_GSUB)?.offset ?? 0;
        const gposTableOffset = tableDirectory.get(TABLE_TAG_GPOS)?.offset ?? 0;
        const nameTableOffset = tableDirectory.get(TABLE_TAG_NAME)?.offset ?? 0;
        const features = new Set();
        const featureNames = {};
        try {
            if (gsubTableOffset) {
                const gsubData = this.extractFeatureDataFromTable(view, gsubTableOffset, nameTableOffset);
                gsubData.features.forEach((f) => features.add(f));
                Object.assign(featureNames, gsubData.names);
            }
            if (gposTableOffset) {
                const gposData = this.extractFeatureDataFromTable(view, gposTableOffset, nameTableOffset);
                gposData.features.forEach((f) => features.add(f));
                Object.assign(featureNames, gposData.names);
            }
        }
        catch (e) {
            return undefined;
        }
        const featureArray = Array.from(features).sort();
        if (featureArray.length === 0)
            return undefined;
        return {
            tags: featureArray,
            names: Object.keys(featureNames).length > 0 ? featureNames : {}
        };
    }
    static extractFeatureDataFromTable(view, tableOffset, nameTableOffset) {
        const featureListOffset = view.getUint16(tableOffset + 6);
        const featureListStart = tableOffset + featureListOffset;
        const featureCount = view.getUint16(featureListStart);
        const features = [];
        const names = {};
        for (let i = 0; i < featureCount; i++) {
            const recordOffset = featureListStart + 2 + i * 6;
            const tag = String.fromCharCode(view.getUint8(recordOffset), view.getUint8(recordOffset + 1), view.getUint8(recordOffset + 2), view.getUint8(recordOffset + 3));
            features.push(tag);
            // Extract feature name for stylistic sets and character variants
            if (/^(ss\d{2}|cv\d{2})$/.test(tag) && nameTableOffset) {
                const featureOffset = view.getUint16(recordOffset + 4);
                const featureTableStart = featureListStart + featureOffset;
                // Feature table structure:
                // uint16 FeatureParams offset
                // uint16 LookupCount
                // uint16[LookupCount] LookupListIndex
                const featureParamsOffset = view.getUint16(featureTableStart);
                // FeatureParams for ss features:
                // uint16 Version (should be 0)
                // uint16 UINameID
                if (featureParamsOffset !== 0) {
                    const paramsStart = featureTableStart + featureParamsOffset;
                    const version = view.getUint16(paramsStart);
                    if (version === 0) {
                        const nameID = view.getUint16(paramsStart + 2);
                        const name = this.getNameFromNameTable(view, nameTableOffset, nameID);
                        if (name) {
                            names[tag] = name;
                        }
                    }
                }
            }
        }
        return { features, names };
    }
    static extractAxisNames(view, statOffset, nameOffset) {
        try {
            const majorVersion = view.getUint16(statOffset);
            if (majorVersion < 1)
                return null;
            const designAxisSize = view.getUint16(statOffset + 4);
            const designAxisCount = view.getUint16(statOffset + 6);
            const designAxisOffset = view.getUint32(statOffset + 8);
            const axisNames = {};
            // Read each design axis record (size specified by designAxisSize)
            for (let i = 0; i < designAxisCount; i++) {
                const axisRecordOffset = statOffset + designAxisOffset + i * designAxisSize;
                const axisTag = String.fromCharCode(view.getUint8(axisRecordOffset), view.getUint8(axisRecordOffset + 1), view.getUint8(axisRecordOffset + 2), view.getUint8(axisRecordOffset + 3));
                const axisNameID = view.getUint16(axisRecordOffset + 4);
                const name = this.getNameFromNameTable(view, nameOffset, axisNameID);
                if (name) {
                    axisNames[axisTag] = name;
                }
            }
            return Object.keys(axisNames).length > 0 ? axisNames : null;
        }
        catch (e) {
            return null;
        }
    }
    static getNameFromNameTable(view, nameOffset, nameID) {
        try {
            const count = view.getUint16(nameOffset + 2);
            const stringOffset = view.getUint16(nameOffset + 4);
            for (let i = 0; i < count; i++) {
                const recordOffset = nameOffset + 6 + i * 12;
                const platformID = view.getUint16(recordOffset);
                const encodingID = view.getUint16(recordOffset + 2);
                const languageID = view.getUint16(recordOffset + 4);
                const recordNameID = view.getUint16(recordOffset + 6);
                const length = view.getUint16(recordOffset + 8);
                const offset = view.getUint16(recordOffset + 10);
                if (recordNameID !== nameID)
                    continue;
                // Accept Unicode platform or Windows US English
                if (platformID !== 0 && !(platformID === 3 && languageID === 0x0409)) {
                    continue;
                }
                const stringStart = nameOffset + stringOffset + offset;
                const bytes = new Uint8Array(view.buffer, stringStart, length);
                if (platformID === 0 || (platformID === 3 && encodingID === 1)) {
                    let str = '';
                    for (let j = 0; j < bytes.length; j += 2) {
                        str += String.fromCharCode((bytes[j] << 8) | bytes[j + 1]);
                    }
                    return str;
                }
                return new TextDecoder('ascii').decode(bytes);
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }
    static extractAll(fontBuffer) {
        if (!fontBuffer || fontBuffer.byteLength < 12) {
            throw new Error('Invalid font buffer: too small to be a valid font file');
        }
        const view = new DataView(fontBuffer);
        const sfntVersion = view.getUint32(0);
        const validSignatures = [
            FONT_SIGNATURE_TRUE_TYPE,
            FONT_SIGNATURE_OPEN_TYPE_CFF
        ];
        if (!validSignatures.includes(sfntVersion)) {
            throw new Error(`Invalid font format. Expected TTF/OTF/WOFF/WOFF2, got signature: 0x${sfntVersion.toString(16)}`);
        }
        const tableDirectory = parseTableDirectory(view);
        const nameTableOffset = tableDirectory.get(TABLE_TAG_NAME)?.offset ?? 0;
        const nameIndex = nameTableOffset
            ? this.buildNameIndex(view, nameTableOffset)
            : null;
        const metrics = this.extractMetricsWithIndex(view, tableDirectory, nameIndex);
        const features = this.extractFeaturesWithIndex(view, tableDirectory, nameIndex);
        return { metrics, features };
    }
    // Index name records by nameID; prefers Unicode (platform 0) or Windows US English
    static buildNameIndex(view, nameOffset) {
        const index = new Map();
        const count = view.getUint16(nameOffset + 2);
        const stringOffset = view.getUint16(nameOffset + 4);
        for (let i = 0; i < count; i++) {
            const recordOffset = nameOffset + 6 + i * 12;
            const platformID = view.getUint16(recordOffset);
            const encodingID = view.getUint16(recordOffset + 2);
            const languageID = view.getUint16(recordOffset + 4);
            const nameID = view.getUint16(recordOffset + 6);
            const length = view.getUint16(recordOffset + 8);
            const offset = view.getUint16(recordOffset + 10);
            if (platformID === 0 || (platformID === 3 && languageID === 0x0409)) {
                if (!index.has(nameID)) {
                    index.set(nameID, {
                        offset: nameOffset + stringOffset + offset,
                        length,
                        platformID,
                        encodingID
                    });
                }
            }
        }
        return index;
    }
    static getNameFromIndex(view, nameIndex, nameID) {
        if (!nameIndex)
            return null;
        const record = nameIndex.get(nameID);
        if (!record)
            return null;
        try {
            const bytes = new Uint8Array(view.buffer, record.offset, record.length);
            // UTF-16BE for Unicode/Windows platform with encoding 1
            if (record.platformID === 0 ||
                (record.platformID === 3 && record.encodingID === 1)) {
                return utf16beDecoder.decode(bytes);
            }
            // ASCII fallback
            return new TextDecoder('ascii').decode(bytes);
        }
        catch {
            return null;
        }
    }
    static extractMetricsWithIndex(view, tableDirectory, nameIndex) {
        const isCFF = tableDirectory.has(TABLE_TAG_CFF) || tableDirectory.has(TABLE_TAG_CFF2);
        const headTableOffset = tableDirectory.get(TABLE_TAG_HEAD)?.offset ?? 0;
        const hheaTableOffset = tableDirectory.get(TABLE_TAG_HHEA)?.offset ?? 0;
        const os2TableOffset = tableDirectory.get(TABLE_TAG_OS2)?.offset ?? 0;
        const fvarTableOffset = tableDirectory.get(TABLE_TAG_FVAR)?.offset ?? 0;
        const statTableOffset = tableDirectory.get(TABLE_TAG_STAT)?.offset ?? 0;
        const unitsPerEm = headTableOffset
            ? view.getUint16(headTableOffset + 18)
            : 1000;
        let hheaMetrics = null;
        if (hheaTableOffset) {
            hheaMetrics = {
                ascender: view.getInt16(hheaTableOffset + 4),
                descender: view.getInt16(hheaTableOffset + 6),
                lineGap: view.getInt16(hheaTableOffset + 8)
            };
        }
        let os2Metrics = null;
        if (os2TableOffset) {
            os2Metrics = {
                typoAscender: view.getInt16(os2TableOffset + 68),
                typoDescender: view.getInt16(os2TableOffset + 70),
                typoLineGap: view.getInt16(os2TableOffset + 72),
                winAscent: view.getUint16(os2TableOffset + 74),
                winDescent: view.getUint16(os2TableOffset + 76)
            };
        }
        let axisNames = null;
        if (fvarTableOffset && statTableOffset && nameIndex) {
            axisNames = this.extractAxisNamesWithIndex(view, statTableOffset, nameIndex);
        }
        return {
            isCFF,
            unitsPerEm,
            hheaAscender: hheaMetrics?.ascender || null,
            hheaDescender: hheaMetrics?.descender || null,
            hheaLineGap: hheaMetrics?.lineGap || null,
            typoAscender: os2Metrics?.typoAscender || null,
            typoDescender: os2Metrics?.typoDescender || null,
            typoLineGap: os2Metrics?.typoLineGap || null,
            winAscent: os2Metrics?.winAscent || null,
            winDescent: os2Metrics?.winDescent || null,
            axisNames
        };
    }
    static extractAxisNamesWithIndex(view, statOffset, nameIndex) {
        try {
            const majorVersion = view.getUint16(statOffset);
            if (majorVersion < 1)
                return null;
            const designAxisSize = view.getUint16(statOffset + 4);
            const designAxisCount = view.getUint16(statOffset + 6);
            const designAxisOffset = view.getUint32(statOffset + 8);
            const axisNames = {};
            for (let i = 0; i < designAxisCount; i++) {
                const axisRecordOffset = statOffset + designAxisOffset + i * designAxisSize;
                const axisTag = String.fromCharCode(view.getUint8(axisRecordOffset), view.getUint8(axisRecordOffset + 1), view.getUint8(axisRecordOffset + 2), view.getUint8(axisRecordOffset + 3));
                const axisNameID = view.getUint16(axisRecordOffset + 4);
                const name = this.getNameFromIndex(view, nameIndex, axisNameID);
                if (name) {
                    axisNames[axisTag] = name;
                }
            }
            return Object.keys(axisNames).length > 0 ? axisNames : null;
        }
        catch {
            return null;
        }
    }
    static extractFeaturesWithIndex(view, tableDirectory, nameIndex) {
        const gsubTableOffset = tableDirectory.get(TABLE_TAG_GSUB)?.offset ?? 0;
        const gposTableOffset = tableDirectory.get(TABLE_TAG_GPOS)?.offset ?? 0;
        // Tags stored as uint32 during iteration, converted to strings at end
        const featureTags = new Set();
        const featureNames = {};
        try {
            if (gsubTableOffset) {
                this.extractFeatureData(view, gsubTableOffset, nameIndex, featureTags, featureNames);
            }
            if (gposTableOffset) {
                this.extractFeatureData(view, gposTableOffset, nameIndex, featureTags, featureNames);
            }
        }
        catch {
            return undefined;
        }
        if (featureTags.size === 0)
            return undefined;
        // Numeric sort preserves alphabetical order for big-endian tags
        const sortedTags = Array.from(featureTags).sort((a, b) => a - b);
        const featureArray = sortedTags.map(this.tagToString);
        return {
            tags: featureArray,
            names: Object.keys(featureNames).length > 0 ? featureNames : {}
        };
    }
    static extractFeatureData(view, tableOffset, nameIndex, featureTags, featureNames) {
        const featureListOffset = view.getUint16(tableOffset + 6);
        const featureListStart = tableOffset + featureListOffset;
        const featureCount = view.getUint16(featureListStart);
        for (let i = 0; i < featureCount; i++) {
            const recordOffset = featureListStart + 2 + i * 6;
            const tagBytes = view.getUint32(recordOffset);
            featureTags.add(tagBytes);
            // Stylistic sets (ss01-ss20) and character variants (cv01-cv99) may have UI names
            const prefix = (tagBytes >> 16) & 0xffff;
            if (!nameIndex)
                continue;
            if (prefix !== TAG_SS_PREFIX && prefix !== TAG_CV_PREFIX)
                continue;
            const d1 = (tagBytes >> 8) & 0xff;
            const d2 = tagBytes & 0xff;
            if (d1 < 0x30 || d1 > 0x39 || d2 < 0x30 || d2 > 0x39)
                continue;
            const featureOffset = view.getUint16(recordOffset + 4);
            const featureTableStart = featureListStart + featureOffset;
            const featureParamsOffset = view.getUint16(featureTableStart);
            if (featureParamsOffset === 0)
                continue;
            const paramsStart = featureTableStart + featureParamsOffset;
            const version = view.getUint16(paramsStart);
            if (version !== 0)
                continue;
            const nameID = view.getUint16(paramsStart + 2);
            const name = this.getNameFromIndex(view, nameIndex, nameID);
            if (name) {
                const tag = String.fromCharCode((tagBytes >> 24) & 0xff, (tagBytes >> 16) & 0xff, (tagBytes >> 8) & 0xff, tagBytes & 0xff);
                featureNames[tag] = name;
            }
        }
    }
    static tagToString(tag) {
        return String.fromCharCode((tag >> 24) & 0xff, (tag >> 16) & 0xff, (tag >> 8) & 0xff, tag & 0xff);
    }
    // Metric priority: typo > hhea > win > fallback (ignoring line gap per Google's approach)
    static getVerticalMetrics(metrics) {
        if (metrics.typoAscender !== null && metrics.typoDescender !== null) {
            return {
                ascender: metrics.typoAscender,
                descender: metrics.typoDescender,
                lineGap: 0
            };
        }
        if (metrics.hheaAscender !== null && metrics.hheaDescender !== null) {
            return {
                ascender: metrics.hheaAscender,
                descender: metrics.hheaDescender,
                lineGap: 0
            };
        }
        if (metrics.winAscent !== null && metrics.winDescent !== null) {
            return {
                ascender: metrics.winAscent,
                descender: -metrics.winDescent, // winDescent is typically positive
                lineGap: 0
            };
        }
        // Last resort - default based on UPM
        return {
            ascender: Math.round(metrics.unitsPerEm * 0.8),
            descender: -Math.round(metrics.unitsPerEm * 0.2),
            lineGap: 0
        };
    }
    static getFontMetrics(metrics) {
        const verticalMetrics = FontMetadataExtractor.getVerticalMetrics(metrics);
        return {
            ascender: verticalMetrics.ascender,
            descender: verticalMetrics.descender,
            lineGap: verticalMetrics.lineGap,
            unitsPerEm: metrics.unitsPerEm,
            naturalLineHeight: verticalMetrics.ascender - verticalMetrics.descender
        };
    }
}

let woff2Decoder = null;
function setWoff2Decoder(decoder) {
    woff2Decoder = decoder;
}
// Uses DecompressionStream to decompress WOFF (WOFF is just zlib compressed TTF/OTF so we can use deflate)
class WoffConverter {
    static detectFormat(buffer) {
        if (buffer.byteLength < 4) {
            return 'ttf/otf';
        }
        const view = new DataView(buffer);
        const signature = view.getUint32(0);
        if (signature === FONT_SIGNATURE_WOFF) {
            return 'woff';
        }
        if (signature === FONT_SIGNATURE_WOFF2) {
            return 'woff2';
        }
        return 'ttf/otf';
    }
    static async decompressWoff(woffBuffer) {
        const view = new DataView(woffBuffer);
        const data = new Uint8Array(woffBuffer);
        // WOFF Header structure:
        // Offset  Size  Description
        // 0       4     signature (0x774F4646 'wOFF')
        // 4       4     flavor (TTF = 0x00010000, CFF = 0x4F54544F)
        // 8       4     length (total size)
        // 12      2     numTables
        // 14      2     reserved
        // 16      4     totalSfntSize (size of uncompressed font)
        // 20      2     majorVersion
        // 22      2     minorVersion
        // 24      4     metaOffset
        // 28      4     metaLength
        // 32      4     metaOrigLength
        // 36      4     privOffset
        // 40      4     privLength
        const signature = view.getUint32(0);
        if (signature !== FONT_SIGNATURE_WOFF) {
            throw new Error('Not a valid WOFF font');
        }
        const flavor = view.getUint32(4);
        const numTables = view.getUint16(12);
        const totalSfntSize = view.getUint32(16);
        // Check for DecompressionStream support
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('WOFF fonts require DecompressionStream API (Chrome 80+, Firefox 113+, Safari 16.4+). ' +
                'Please use TTF/OTF fonts or upgrade your browser.');
        }
        // Create the output buffer for the TTF/OTF font
        const sfntData = new Uint8Array(totalSfntSize);
        const sfntView = new DataView(sfntData.buffer);
        // Write SFNT header. The flavor (0x00010000 for TrueType, 0x4F54544F for CFF)
        // determines glyph winding order and will be detected by FontMetadataExtractor.
        sfntView.setUint32(0, flavor);
        sfntView.setUint16(4, numTables); // numTables
        const searchRange = 2 ** Math.floor(Math.log2(numTables)) * 16;
        sfntView.setUint16(6, searchRange);
        sfntView.setUint16(8, Math.floor(Math.log2(numTables)));
        sfntView.setUint16(10, numTables * 16 - searchRange);
        let sfntOffset = 12 + numTables * 16; // Start of table data
        const tableDirectory = [];
        // Read WOFF table directory
        for (let i = 0; i < numTables; i++) {
            const tableOffset = 44 + i * 20;
            tableDirectory.push({
                tag: view.getUint32(tableOffset),
                offset: view.getUint32(tableOffset + 4),
                length: view.getUint32(tableOffset + 8), // compressed length
                origLength: view.getUint32(tableOffset + 12),
                checksum: view.getUint32(tableOffset + 16)
            });
        }
        // Sort tables by tag (required for SFNT)
        tableDirectory.sort((a, b) => a.tag - b.tag);
        // Tables are independent, decompress in parallel
        const decompressedTables = await Promise.all(tableDirectory.map(async (table) => {
            if (table.length === table.origLength) {
                return data.subarray(table.offset, table.offset + table.length);
            }
            const compressedData = data.subarray(table.offset, table.offset + table.length);
            const decompressed = await WoffConverter.decompressZlib(compressedData);
            if (decompressed.byteLength !== table.origLength) {
                throw new Error(`Decompression failed: expected ${table.origLength} bytes, got ${decompressed.byteLength}`);
            }
            return new Uint8Array(decompressed);
        }));
        // Write SFNT table directory and table data
        for (let i = 0; i < numTables; i++) {
            const table = tableDirectory[i];
            const dirOffset = 12 + i * 16;
            sfntView.setUint32(dirOffset, table.tag);
            sfntView.setUint32(dirOffset + 4, table.checksum);
            sfntView.setUint32(dirOffset + 8, sfntOffset);
            sfntView.setUint32(dirOffset + 12, table.origLength);
            sfntData.set(decompressedTables[i], sfntOffset);
            // Add padding to 4-byte boundary
            sfntOffset += table.origLength;
            const padding = (4 - (table.origLength % 4)) % 4;
            sfntOffset += padding;
        }
        logger.log('WOFF font decompressed successfully');
        return sfntData.buffer.slice(0, sfntOffset);
    }
    static async decompressWoff2(woff2Buffer) {
        const view = new DataView(woff2Buffer);
        const signature = view.getUint32(0);
        if (signature !== FONT_SIGNATURE_WOFF2) {
            throw new Error('Not a valid WOFF2 font');
        }
        if (!woff2Decoder) {
            throw new Error('WOFF2 fonts require enabling the decoder. Add to your code:\n' +
                "  import { woff2Decode } from 'woff-lib/woff2/decode';\n" +
                '  Text.enableWoff2(woff2Decode);');
        }
        const decoded = await woff2Decoder(woff2Buffer);
        logger.log('WOFF2 font decompressed successfully');
        return decoded.buffer;
    }
    static async decompressZlib(compressedData) {
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(compressedData);
                controller.close();
            }
        }).pipeThrough(new DecompressionStream('deflate'));
        const response = new Response(stream);
        return response.arrayBuffer();
    }
}

class FontLoader {
    constructor(getHarfBuzzInstance) {
        this.getHarfBuzzInstance = getHarfBuzzInstance;
    }
    async loadFont(fontBuffer, fontVariations) {
        perfLogger.start('FontLoader.loadFont', {
            bufferSize: fontBuffer.byteLength
        });
        if (!fontBuffer || fontBuffer.byteLength < 12) {
            throw new Error('Invalid font buffer: too small to be a valid font file');
        }
        // Check if this is a WOFF font and decompress if needed
        const format = WoffConverter.detectFormat(fontBuffer);
        if (format === 'woff') {
            logger.log('WOFF font detected, decompressing...');
            fontBuffer = await WoffConverter.decompressWoff(fontBuffer);
        }
        else if (format === 'woff2') {
            logger.log('WOFF2 font detected, decompressing...');
            fontBuffer = await WoffConverter.decompressWoff2(fontBuffer);
        }
        const view = new DataView(fontBuffer);
        const sfntVersion = view.getUint32(0);
        const validSignatures = [
            FONT_SIGNATURE_TRUE_TYPE,
            FONT_SIGNATURE_OPEN_TYPE_CFF
        ];
        if (!validSignatures.includes(sfntVersion)) {
            throw new Error(`Invalid font format. Expected TTF/OTF/WOFF/WOFF2, got signature: 0x${sfntVersion.toString(16)}`);
        }
        const { hb, module } = await this.getHarfBuzzInstance();
        try {
            const fontBlob = hb.createBlob(new Uint8Array(fontBuffer));
            const face = hb.createFace(fontBlob, 0);
            const font = hb.createFont(face);
            if (fontVariations) {
                font.setVariations(fontVariations);
            }
            const axisInfos = face.getAxisInfos();
            const isVariable = Object.keys(axisInfos).length > 0;
            const { metrics, features: featureData } = FontMetadataExtractor.extractAll(fontBuffer);
            // Merge axis names from STAT table with HarfBuzz axis info
            let variationAxes = undefined;
            if (isVariable && axisInfos) {
                variationAxes = {};
                for (const [tag, info] of Object.entries(axisInfos)) {
                    variationAxes[tag] = {
                        ...info,
                        name: metrics.axisNames?.[tag] || null
                    };
                }
            }
            return {
                hb,
                fontBlob,
                face,
                font,
                module,
                upem: metrics.unitsPerEm,
                metrics,
                fontVariations,
                isVariable,
                variationAxes,
                availableFeatures: featureData?.tags,
                featureNames: featureData?.names,
                _buffer: fontBuffer // For stable font ID generation
            };
        }
        catch (error) {
            logger.error('Failed to load font:', error);
            throw error;
        }
        finally {
            perfLogger.end('FontLoader.loadFont');
        }
    }
    static destroyFont(loadedFont) {
        try {
            if (loadedFont.font && typeof loadedFont.font.destroy === 'function') {
                loadedFont.font.destroy();
            }
            if (loadedFont.face && typeof loadedFont.face.destroy === 'function') {
                loadedFont.face.destroy();
            }
            if (loadedFont.fontBlob &&
                typeof loadedFont.fontBlob.destroy === 'function') {
                loadedFont.fontBlob.destroy();
            }
        }
        catch (error) {
            logger.error('Error destroying font resources:', error);
        }
    }
}

const SAFE_LANGUAGE_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,16})*$/i;
// Built-in patterns shipped with three-text (matches files in src/hyphenation/*)
// Note: GPL-licensed patterns (cs, id, mk, sr-cyrl) are excluded for MIT compatibility
const BUILTIN_PATTERN_LANGUAGES = new Set([
    'af',
    'as',
    'be',
    'bg',
    'bn',
    'ca',
    'cy',
    'da',
    'de-1996',
    'el-monoton',
    'el-polyton',
    'en-gb',
    'en-us',
    'eo',
    'es',
    'et',
    'eu',
    'fi',
    'fr',
    'fur',
    'ga',
    'gl',
    'gu',
    'hi',
    'hr',
    'hsb',
    'hu',
    'hy',
    'ia',
    'is',
    'it',
    'ka',
    'kmr',
    'kn',
    'la',
    'lt',
    'lv',
    'ml',
    'mn-cyrl',
    'mr',
    'mul-ethi',
    'nb',
    'nl',
    'nn',
    'oc',
    'or',
    'pa',
    'pl',
    'pms',
    'pt',
    'rm',
    'ro',
    'ru',
    'sa',
    'sh-cyrl',
    'sh-latn',
    'sk',
    'sl',
    'sq',
    'sv',
    'ta',
    'te',
    'th',
    'tk',
    'tr',
    'uk',
    'zh-latn-pinyin'
]);
async function loadPattern(language, patternsPath) {
    if (!SAFE_LANGUAGE_RE.test(language)) {
        throw new Error(`Invalid hyphenation language code "${language}". Expected e.g. "en-us".`);
    }
    // When no patternsPath is provided, we only allow the built-in set shipped with
    // three-text to avoid accidental arbitrary imports / path traversal
    if (!patternsPath && !BUILTIN_PATTERN_LANGUAGES.has(language)) {
        throw new Error(`Unsupported hyphenation language "${language}". ` +
            `Use a built-in language (e.g. "en-us") or register patterns via Text.registerPattern("${language}", pattern).`);
    }
    {
        // In ESM build, use dynamic imports
        try {
            if (patternsPath) {
                const module = await import(
                /* @vite-ignore */ `${patternsPath}${language}.js`);
                return module.default;
            }
            else if (typeof import.meta?.url === 'string') {
                // Use import.meta.url to resolve relative to this module's location
                const baseUrl = new URL('.', import.meta.url).href;
                const patternUrl = new URL(`./patterns/${language}.js`, baseUrl).href;
                const module = await import(/* @vite-ignore */ patternUrl);
                return module.default;
            }
            else {
                // Fallback for environments without import.meta.url
                const module = await import(
                /* @vite-ignore */ `./patterns/${language}.js`);
                return module.default;
            }
        }
        catch (error) {
            throw new Error(`Failed to load hyphenation patterns for ${language}. Consider using static imports: import pattern from 'three-text/patterns/${language}'; Text.registerPattern('${language}', pattern);`);
        }
    }
}

// 2D Vector
class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    clone() {
        return new Vec2(this.x, this.y);
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    divide(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.divide(len);
        }
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    distanceToSquared(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }
    equals(v) {
        return this.x === v.x && this.y === v.y;
    }
    angle() {
        return Math.atan2(this.y, this.x);
    }
}
// 3D Vector
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    clone() {
        return new Vec3(this.x, this.y, this.z);
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }
    divide(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.divide(len);
        }
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    distanceToSquared(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }
    equals(v) {
        return this.x === v.x && this.y === v.y && this.z === v.z;
    }
}

class TextShaper {
    constructor(loadedFont) {
        this.cachedSpaceWidth = new Map();
        this.loadedFont = loadedFont;
    }
    shapeLines(lineInfos, scaledLineHeight, letterSpacing, align, direction, color, originalText) {
        perfLogger.start('TextShaper.shapeLines', {
            lineCount: lineInfos.length
        });
        try {
            const clustersByLine = [];
            lineInfos.forEach((lineInfo, lineIndex) => {
                const clusters = this.shapeLineIntoClusters(lineInfo, lineIndex, scaledLineHeight, letterSpacing, align, direction);
                clustersByLine.push(clusters);
            });
            return clustersByLine;
        }
        finally {
            perfLogger.end('TextShaper.shapeLines');
        }
    }
    shapeLineIntoClusters(lineInfo, lineIndex, scaledLineHeight, letterSpacing, align, direction) {
        const buffer = this.loadedFont.hb.createBuffer();
        if (direction === 'rtl') {
            buffer.setDirection('rtl');
        }
        buffer.addText(lineInfo.text);
        buffer.guessSegmentProperties();
        const featuresString = convertFontFeaturesToString(this.loadedFont.fontFeatures);
        this.loadedFont.hb.shape(this.loadedFont.font, buffer, featuresString);
        const glyphInfos = buffer.json(this.loadedFont.font);
        buffer.destroy();
        const clusters = [];
        let currentClusterGlyphs = [];
        let clusterTextChars = [];
        let clusterStartX = 0;
        let clusterStartY = 0;
        let cursorX = lineInfo.xOffset;
        let cursorY = -lineIndex * scaledLineHeight;
        const cursorZ = 0;
        // Apply letter spacing after each glyph to match width measurements used during line breaking
        const letterSpacingFU = letterSpacing * this.loadedFont.upem;
        const spaceAdjustment = this.calculateSpaceAdjustment(lineInfo, align, letterSpacing);
        const cjkAdjustment = this.calculateCJKAdjustment(lineInfo, align);
        const lineText = lineInfo.text;
        const lineTextLength = lineText.length;
        const glyphCount = glyphInfos.length;
        let nextCharIsCJK;
        for (let i = 0; i < glyphCount; i++) {
            const glyph = glyphInfos[i];
            const charIndex = glyph.cl;
            const char = lineText[charIndex];
            const charCode = char.charCodeAt(0);
            const isWhitespace = charCode === 32 || charCode === 9 || charCode === 10 || charCode === 13;
            // Inserted hyphens inherit the color of the last character in the word
            if (lineInfo.endedWithHyphen &&
                charIndex === lineTextLength - 1 &&
                char === '-') {
                glyph.absoluteTextIndex = lineInfo.originalEnd;
            }
            else {
                glyph.absoluteTextIndex = lineInfo.originalStart + charIndex;
            }
            glyph.lineIndex = lineIndex;
            // Cluster boundaries are based on whitespace only.
            // Coloring is applied later via vertex colors and must never affect shaping/kerning.
            if (isWhitespace) {
                if (currentClusterGlyphs.length > 0) {
                    clusters.push({
                        text: clusterTextChars.join(''),
                        glyphs: currentClusterGlyphs,
                        position: new Vec3(clusterStartX, clusterStartY, cursorZ)
                    });
                    currentClusterGlyphs = [];
                    clusterTextChars = [];
                }
            }
            const absoluteGlyphX = cursorX + glyph.dx;
            const absoluteGlyphY = cursorY + glyph.dy;
            if (!isWhitespace) {
                if (currentClusterGlyphs.length === 0) {
                    clusterStartX = absoluteGlyphX;
                    clusterStartY = absoluteGlyphY;
                }
                glyph.x = absoluteGlyphX - clusterStartX;
                glyph.y = absoluteGlyphY - clusterStartY;
                currentClusterGlyphs.push(glyph);
                clusterTextChars.push(char);
            }
            cursorX += glyph.ax;
            cursorY += glyph.ay;
            if (letterSpacingFU !== 0 && i < glyphCount - 1) {
                cursorX += letterSpacingFU;
            }
            if (isWhitespace) {
                cursorX += spaceAdjustment;
            }
            // CJK glue adjustment (must match exactly where LineBreak adds glue)
            if (cjkAdjustment !== 0 && i < glyphCount - 1 && !isWhitespace) {
                const nextGlyph = glyphInfos[i + 1];
                const nextChar = lineText[nextGlyph.cl];
                const isCJK = nextCharIsCJK !== undefined ? nextCharIsCJK : LineBreak.isCJK(char);
                nextCharIsCJK = nextChar ? LineBreak.isCJK(nextChar) : false;
                if (isCJK && nextCharIsCJK) {
                    let shouldApply = true;
                    if (LineBreak.isCJClosingPunctuation(nextChar)) {
                        shouldApply = false;
                    }
                    if (LineBreak.isCJOpeningPunctuation(char)) {
                        shouldApply = false;
                    }
                    if (LineBreak.isCJPunctuation(char) &&
                        LineBreak.isCJPunctuation(nextChar)) {
                        shouldApply = false;
                    }
                    if (shouldApply) {
                        cursorX += cjkAdjustment;
                    }
                }
            }
            else {
                nextCharIsCJK = undefined;
            }
        }
        if (currentClusterGlyphs.length > 0) {
            clusters.push({
                text: clusterTextChars.join(''),
                glyphs: currentClusterGlyphs,
                position: new Vec3(clusterStartX, clusterStartY, cursorZ)
            });
        }
        return clusters;
    }
    calculateSpaceAdjustment(lineInfo, align, letterSpacing) {
        let spaceAdjustment = 0;
        if (lineInfo.adjustmentRatio !== undefined &&
            align === 'justify' &&
            !lineInfo.isLastLine) {
            let naturalSpaceWidth = this.cachedSpaceWidth.get(letterSpacing);
            if (naturalSpaceWidth === undefined) {
                naturalSpaceWidth = TextMeasurer.measureTextWidth(this.loadedFont, ' ', letterSpacing);
                this.cachedSpaceWidth.set(letterSpacing, naturalSpaceWidth);
            }
            const width = naturalSpaceWidth;
            const stretchFactor = SPACE_STRETCH_RATIO;
            const shrinkFactor = SPACE_SHRINK_RATIO;
            if (lineInfo.adjustmentRatio > 0) {
                spaceAdjustment = lineInfo.adjustmentRatio * width * stretchFactor;
            }
            else if (lineInfo.adjustmentRatio < 0) {
                spaceAdjustment = lineInfo.adjustmentRatio * width * shrinkFactor;
            }
        }
        return spaceAdjustment;
    }
    calculateCJKAdjustment(lineInfo, align) {
        if (lineInfo.adjustmentRatio === undefined ||
            align !== 'justify' ||
            lineInfo.isLastLine) {
            return 0;
        }
        const baseCharWidth = this.loadedFont.upem;
        const glueStretch = baseCharWidth * 0.04;
        const glueShrink = baseCharWidth * 0.04;
        if (lineInfo.adjustmentRatio > 0) {
            return lineInfo.adjustmentRatio * glueStretch;
        }
        else if (lineInfo.adjustmentRatio < 0) {
            return lineInfo.adjustmentRatio * glueShrink;
        }
        return 0;
    }
}

// Fetch with fs fallback for Electron file:// and Node.js environments
async function loadBinary(filePath) {
    try {
        const res = await fetch(filePath);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.arrayBuffer();
    }
    catch (fetchError) {
        const req = globalThis.require;
        if (typeof req !== 'function') {
            throw new Error(`Failed to fetch ${filePath}: ${fetchError}`);
        }
        try {
            const fs = req('fs');
            const nodePath = req('path');
            // file:// URLs need path resolution relative to the HTML document
            let resolvedPath = filePath;
            if (typeof window !== 'undefined' &&
                window.location?.protocol === 'file:') {
                const dir = nodePath.dirname(window.location.pathname);
                resolvedPath = nodePath.join(dir, filePath);
            }
            const buffer = fs.readFileSync(resolvedPath);
            if (buffer instanceof ArrayBuffer)
                return buffer;
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
        catch (fsError) {
            throw new Error(`Failed to load ${filePath}: fetch failed (${fetchError}), fs.readFileSync failed (${fsError})`);
        }
    }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var hb = {exports: {}};

var fs = {};
const readFileSync = (...args) => {
  const req = typeof globalThis !== 'undefined' ? globalThis.require : undefined;
  if (typeof req === 'function') {
    return req('fs').readFileSync(...args);
  }
  throw new Error('fs not available in this environment');
};

var fs$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: fs,
    readFileSync: readFileSync
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(fs$1);

(function (module, exports) {
	var createHarfBuzz=(()=>{var _scriptName=typeof document!="undefined"?document.currentScript?.src:undefined;return async function(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof WorkerGlobalScope!="undefined";var ENVIRONMENT_IS_NODE=typeof process=="object"&&process.versions?.node&&process.type!="renderer";var quit_=(status,toThrow)=>{throw toThrow};if(typeof __filename!="undefined"){_scriptName=__filename;}else if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href;}var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_NODE){var fs=require$$0;scriptDirectory=(typeof __dirname!=="undefined"?__dirname+"/":"");readBinary=filename=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename);return ret};readAsync=async(filename,binary=true)=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename,binary?undefined:"utf8");return ret};if(process.argv.length>1){process.argv[1].replace(/\\/g,"/");}process.argv.slice(2);quit_=(status,toThrow)=>{process.exitCode=status;throw toThrow};}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href;}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)};}readAsync=async url=>{if(isFileURI(url)){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){resolve(xhr.response);return}reject(xhr.status);};xhr.onerror=reject;xhr.send(null);})}var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)};}}else;console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;var EXITSTATUS;var isFileURI=filename=>filename.startsWith("file://");var readyPromiseResolve,readyPromiseReject;var wasmMemory;var HEAPU8;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=new Int8Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);Module["HEAP32"]=new Int32Array(b);Module["HEAPU32"]=new Uint32Array(b);Module["HEAPF32"]=new Float32Array(b);new BigInt64Array(b);new BigUint64Array(b);}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift());}}callRuntimeCallbacks(onPreRuns);}function initRuntime(){runtimeInitialized=true;wasmExports["__wasm_call_ctors"]();}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift());}}callRuntimeCallbacks(onPostRuns);}var runDependencies=0;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;Module["monitorRunDependencies"]?.(runDependencies);}function removeRunDependency(id){runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback();}}}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){return locateFile("hb.wasm")}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw "both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason);}}async function instantiateAsync(binary,binaryFile,imports){if(!binary&&!isFileURI(binaryFile)&&!ENVIRONMENT_IS_NODE){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation");}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){return {env:wasmImports,wasi_snapshot_preview1:wasmImports}}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;Module["wasmExports"]=wasmExports;wasmMemory=wasmExports["memory"];Module["wasmMemory"]=wasmMemory;updateMemoryViews();wasmTable=wasmExports["__indirect_function_table"];assignWasmExports(wasmExports);removeRunDependency();return wasmExports}addRunDependency();function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(mod,inst)=>{resolve(receiveInstance(mod));});})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status;}}var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module);}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var noExitRuntime=true;var __abort_js=()=>abort("");var runtimeKeepaliveCounter=0;var __emscripten_runtime_keepalive_clear=()=>{noExitRuntime=false;runtimeKeepaliveCounter=0;};var timers={};var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e);};var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true;}quit_(code,new ExitStatus(code));};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status);};var _exit=exitJS;var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS);}catch(e){handleException(e);}}};var callUserCallback=func=>{if(ABORT){return}try{func();maybeExit();}catch(e){handleException(e);}};var _emscripten_get_now=()=>performance.now();var __setitimer_js=(which,timeout_ms)=>{if(timers[which]){clearTimeout(timers[which].id);delete timers[which];}if(!timeout_ms)return 0;var id=setTimeout(()=>{delete timers[which];callUserCallback(()=>__emscripten_timeout(which,_emscripten_get_now()));},timeout_ms);timers[which]={id,timeout_ms};return 0};var getHeapMax=()=>2147483648;var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var uleb128EncodeWithLen=arr=>{const n=arr.length;return [n%128|128,n>>7,...arr]};var wasmTypeCodes={i:127,p:127,j:126,f:125,d:124,e:111};var generateTypePack=types=>uleb128EncodeWithLen(Array.from(types,type=>{var code=wasmTypeCodes[type];return code}));var convertJsFunctionToWasm=(func,sig)=>{var bytes=Uint8Array.of(0,97,115,109,1,0,0,0,1,...uleb128EncodeWithLen([1,96,...generateTypePack(sig.slice(1)),...generateTypePack(sig[0]==="v"?"":sig[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(bytes);var instance=new WebAssembly.Instance(module,{e:{f:func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var wasmTable;var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i);}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length);}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}return wasmTable["grow"](1)};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func);}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped);}functionsInTableMap.set(func,ret);return ret};var removeFunction=index=>{functionsInTableMap.delete(getWasmTableEntry(index));setWasmTableEntry(index,null);freeTableIndexes.push(index);};{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["print"])Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])Module["arguments"];if(Module["thisProgram"])Module["thisProgram"];}Module["wasmMemory"]=wasmMemory;Module["wasmExports"]=wasmExports;Module["addFunction"]=addFunction;Module["removeFunction"]=removeFunction;var __emscripten_timeout;function assignWasmExports(wasmExports){Module["_hb_blob_create"]=wasmExports["hb_blob_create"];Module["_hb_blob_destroy"]=wasmExports["hb_blob_destroy"];Module["_hb_blob_get_length"]=wasmExports["hb_blob_get_length"];Module["_hb_blob_get_data"]=wasmExports["hb_blob_get_data"];Module["_hb_buffer_serialize_glyphs"]=wasmExports["hb_buffer_serialize_glyphs"];Module["_hb_buffer_create"]=wasmExports["hb_buffer_create"];Module["_hb_buffer_destroy"]=wasmExports["hb_buffer_destroy"];Module["_hb_buffer_get_content_type"]=wasmExports["hb_buffer_get_content_type"];Module["_hb_buffer_set_direction"]=wasmExports["hb_buffer_set_direction"];Module["_hb_buffer_set_script"]=wasmExports["hb_buffer_set_script"];Module["_hb_buffer_set_language"]=wasmExports["hb_buffer_set_language"];Module["_hb_buffer_set_flags"]=wasmExports["hb_buffer_set_flags"];Module["_hb_buffer_set_cluster_level"]=wasmExports["hb_buffer_set_cluster_level"];Module["_hb_buffer_get_length"]=wasmExports["hb_buffer_get_length"];Module["_hb_buffer_get_glyph_infos"]=wasmExports["hb_buffer_get_glyph_infos"];Module["_hb_buffer_get_glyph_positions"]=wasmExports["hb_buffer_get_glyph_positions"];Module["_hb_glyph_info_get_glyph_flags"]=wasmExports["hb_glyph_info_get_glyph_flags"];Module["_hb_buffer_guess_segment_properties"]=wasmExports["hb_buffer_guess_segment_properties"];Module["_hb_buffer_add_utf8"]=wasmExports["hb_buffer_add_utf8"];Module["_hb_buffer_add_utf16"]=wasmExports["hb_buffer_add_utf16"];Module["_hb_buffer_set_message_func"]=wasmExports["hb_buffer_set_message_func"];Module["_hb_language_from_string"]=wasmExports["hb_language_from_string"];Module["_hb_script_from_string"]=wasmExports["hb_script_from_string"];Module["_hb_version"]=wasmExports["hb_version"];Module["_hb_version_string"]=wasmExports["hb_version_string"];Module["_hb_feature_from_string"]=wasmExports["hb_feature_from_string"];Module["_malloc"]=wasmExports["malloc"];Module["_free"]=wasmExports["free"];Module["_hb_draw_funcs_set_move_to_func"]=wasmExports["hb_draw_funcs_set_move_to_func"];Module["_hb_draw_funcs_set_line_to_func"]=wasmExports["hb_draw_funcs_set_line_to_func"];Module["_hb_draw_funcs_set_quadratic_to_func"]=wasmExports["hb_draw_funcs_set_quadratic_to_func"];Module["_hb_draw_funcs_set_cubic_to_func"]=wasmExports["hb_draw_funcs_set_cubic_to_func"];Module["_hb_draw_funcs_set_close_path_func"]=wasmExports["hb_draw_funcs_set_close_path_func"];Module["_hb_draw_funcs_create"]=wasmExports["hb_draw_funcs_create"];Module["_hb_draw_funcs_destroy"]=wasmExports["hb_draw_funcs_destroy"];Module["_hb_face_create"]=wasmExports["hb_face_create"];Module["_hb_face_destroy"]=wasmExports["hb_face_destroy"];Module["_hb_face_reference_table"]=wasmExports["hb_face_reference_table"];Module["_hb_face_get_upem"]=wasmExports["hb_face_get_upem"];Module["_hb_face_collect_unicodes"]=wasmExports["hb_face_collect_unicodes"];Module["_hb_font_draw_glyph"]=wasmExports["hb_font_draw_glyph"];Module["_hb_font_glyph_to_string"]=wasmExports["hb_font_glyph_to_string"];Module["_hb_font_create"]=wasmExports["hb_font_create"];Module["_hb_font_set_variations"]=wasmExports["hb_font_set_variations"];Module["_hb_font_destroy"]=wasmExports["hb_font_destroy"];Module["_hb_font_set_scale"]=wasmExports["hb_font_set_scale"];Module["_hb_set_create"]=wasmExports["hb_set_create"];Module["_hb_set_destroy"]=wasmExports["hb_set_destroy"];Module["_hb_ot_var_get_axis_infos"]=wasmExports["hb_ot_var_get_axis_infos"];Module["_hb_set_get_population"]=wasmExports["hb_set_get_population"];Module["_hb_set_next_many"]=wasmExports["hb_set_next_many"];Module["_hb_shape"]=wasmExports["hb_shape"];__emscripten_timeout=wasmExports["_emscripten_timeout"];}var wasmImports={_abort_js:__abort_js,_emscripten_runtime_keepalive_clear:__emscripten_runtime_keepalive_clear,_setitimer_js:__setitimer_js,emscripten_resize_heap:_emscripten_resize_heap,proc_exit:_proc_exit};var wasmExports=await createWasm();function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();postRun();}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun();},1);}else {doRun();}}function preInit(){if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()();}}}preInit();run();if(runtimeInitialized){moduleRtn=Module;}else {moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject;});}
return moduleRtn}})();{module.exports=createHarfBuzz;module.exports.default=createHarfBuzz;} 
} (hb));

var hbExports = hb.exports;
var createHarfBuzz = /*@__PURE__*/getDefaultExportFromCjs(hbExports);

var hbjs$2 = {exports: {}};

function hbjs(Module) {

  var exports = Module.wasmExports;
  var utf8Decoder = new TextDecoder("utf8");
  let addFunction = Module.addFunction;
  let removeFunction = Module.removeFunction;

  var freeFuncPtr = addFunction(function (ptr) { exports.free(ptr); }, 'vi');

  var HB_MEMORY_MODE_WRITABLE = 2;
  var HB_SET_VALUE_INVALID = -1;
  var HB_BUFFER_CONTENT_TYPE_GLYPHS = 2;
  var DONT_STOP = 0;
  var GSUB_PHASE = 1;
  var GPOS_PHASE = 2;

  function hb_tag(s) {
    return (
      (s.charCodeAt(0) & 0xFF) << 24 |
      (s.charCodeAt(1) & 0xFF) << 16 |
      (s.charCodeAt(2) & 0xFF) <<  8 |
      (s.charCodeAt(3) & 0xFF) <<  0
    );
  }

  var HB_BUFFER_SERIALIZE_FORMAT_JSON	= hb_tag('JSON');
  var HB_BUFFER_SERIALIZE_FLAG_NO_GLYPH_NAMES	= 4;

  function _hb_untag(tag) {
    return [
      String.fromCharCode((tag >> 24) & 0xFF),
      String.fromCharCode((tag >> 16) & 0xFF),
      String.fromCharCode((tag >>  8) & 0xFF),
      String.fromCharCode((tag >>  0) & 0xFF)
    ].join('');
  }

  function _buffer_flag(s) {
    if (s == "BOT") { return 0x1; }
    if (s == "EOT") { return 0x2; }
    if (s == "PRESERVE_DEFAULT_IGNORABLES") { return 0x4; }
    if (s == "REMOVE_DEFAULT_IGNORABLES") { return 0x8; }
    if (s == "DO_NOT_INSERT_DOTTED_CIRCLE") { return 0x10; }
    if (s == "PRODUCE_UNSAFE_TO_CONCAT") { return 0x40; }
    return 0x0;
  }

  /**
  * Create an object representing a Harfbuzz blob.
  * @param {string} blob A blob of binary data (usually the contents of a font file).
  **/
  function createBlob(blob) {
    var blobPtr = exports.malloc(blob.byteLength);
    Module.HEAPU8.set(new Uint8Array(blob), blobPtr);
    var ptr = exports.hb_blob_create(blobPtr, blob.byteLength, HB_MEMORY_MODE_WRITABLE, blobPtr, freeFuncPtr);
    return {
      ptr: ptr,
      /**
      * Free the object.
      */
      destroy: function () { exports.hb_blob_destroy(ptr); }
    };
  }

  /**
   * Return the typed array of HarfBuzz set contents.
   * @param {number} setPtr Pointer of set
   * @returns {Uint32Array} Typed array instance
   */
  function typedArrayFromSet(setPtr) {
    const setCount = exports.hb_set_get_population(setPtr);
    const arrayPtr = exports.malloc(setCount << 2);
    const arrayOffset = arrayPtr >> 2;
    const array = Module.HEAPU32.subarray(arrayOffset, arrayOffset + setCount);
    Module.HEAPU32.set(array, arrayOffset);
    exports.hb_set_next_many(setPtr, HB_SET_VALUE_INVALID, arrayPtr, setCount);
    return array;
  }

  /**
  * Create an object representing a Harfbuzz face.
  * @param {object} blob An object returned from `createBlob`.
  * @param {number} index The index of the font in the blob. (0 for most files,
  *  or a 0-indexed font number if the `blob` came form a TTC/OTC file.)
  **/
  function createFace(blob, index) {
    var ptr = exports.hb_face_create(blob.ptr, index);
    const upem = exports.hb_face_get_upem(ptr);
    return {
      ptr: ptr,
      upem,
      /**
       * Return the binary contents of an OpenType table.
       * @param {string} table Table name
       */
      reference_table: function(table) {
        var blob = exports.hb_face_reference_table(ptr, hb_tag(table));
        var length = exports.hb_blob_get_length(blob);
        if (!length) { return; }
        var blobptr = exports.hb_blob_get_data(blob, null);
        var table_string = Module.HEAPU8.subarray(blobptr, blobptr+length);
        return table_string;
      },
      /**
       * Return variation axis infos
       */
      getAxisInfos: function() {
        var axis = exports.malloc(64 * 32);
        var c = exports.malloc(4);
        Module.HEAPU32[c / 4] = 64;
        exports.hb_ot_var_get_axis_infos(ptr, 0, c, axis);
        var result = {};
        Array.from({ length: Module.HEAPU32[c / 4] }).forEach(function (_, i) {
          result[_hb_untag(Module.HEAPU32[axis / 4 + i * 8 + 1])] = {
            min: Module.HEAPF32[axis / 4 + i * 8 + 4],
            default: Module.HEAPF32[axis / 4 + i * 8 + 5],
            max: Module.HEAPF32[axis / 4 + i * 8 + 6]
          };
        });
        exports.free(c);
        exports.free(axis);
        return result;
      },
      /**
       * Return unicodes the face supports
       */
      collectUnicodes: function() {
        var unicodeSetPtr = exports.hb_set_create();
        exports.hb_face_collect_unicodes(ptr, unicodeSetPtr);
        var result = typedArrayFromSet(unicodeSetPtr);
        exports.hb_set_destroy(unicodeSetPtr);
        return result;
      },
      /**
       * Free the object.
       */
      destroy: function () {
        exports.hb_face_destroy(ptr);
      },
    };
  }

  var pathBuffer = "";

  var nameBufferSize = 256; // should be enough for most glyphs
  var nameBuffer = exports.malloc(nameBufferSize); // permanently allocated

  /**
  * Create an object representing a Harfbuzz font.
  * @param {object} blob An object returned from `createFace`.
  **/
  function createFont(face) {
    var ptr = exports.hb_font_create(face.ptr);
    var drawFuncsPtr = null;
    var moveToPtr = null;
    var lineToPtr = null;
    var cubicToPtr = null;
    var quadToPtr = null;
    var closePathPtr = null;

    /**
    * Return a glyph as an SVG path string.
    * @param {number} glyphId ID of the requested glyph in the font.
    **/
    function glyphToPath(glyphId) {
      if (!drawFuncsPtr) {
        var moveTo = function (dfuncs, draw_data, draw_state, to_x, to_y, user_data) {
          pathBuffer += `M${to_x},${to_y}`;
        };
        var lineTo = function (dfuncs, draw_data, draw_state, to_x, to_y, user_data) {
          pathBuffer += `L${to_x},${to_y}`;
        };
        var cubicTo = function (dfuncs, draw_data, draw_state, c1_x, c1_y, c2_x, c2_y, to_x, to_y, user_data) {
          pathBuffer += `C${c1_x},${c1_y} ${c2_x},${c2_y} ${to_x},${to_y}`;
        };
        var quadTo = function (dfuncs, draw_data, draw_state, c_x, c_y, to_x, to_y, user_data) {
          pathBuffer += `Q${c_x},${c_y} ${to_x},${to_y}`;
        };
        var closePath = function (dfuncs, draw_data, draw_state, user_data) {
          pathBuffer += 'Z';
        };

        moveToPtr = addFunction(moveTo, 'viiiffi');
        lineToPtr = addFunction(lineTo, 'viiiffi');
        cubicToPtr = addFunction(cubicTo, 'viiiffffffi');
        quadToPtr = addFunction(quadTo, 'viiiffffi');
        closePathPtr = addFunction(closePath, 'viiii');
        drawFuncsPtr = exports.hb_draw_funcs_create();
        exports.hb_draw_funcs_set_move_to_func(drawFuncsPtr, moveToPtr, 0, 0);
        exports.hb_draw_funcs_set_line_to_func(drawFuncsPtr, lineToPtr, 0, 0);
        exports.hb_draw_funcs_set_cubic_to_func(drawFuncsPtr, cubicToPtr, 0, 0);
        exports.hb_draw_funcs_set_quadratic_to_func(drawFuncsPtr, quadToPtr, 0, 0);
        exports.hb_draw_funcs_set_close_path_func(drawFuncsPtr, closePathPtr, 0, 0);
      }

      pathBuffer = "";
      exports.hb_font_draw_glyph(ptr, glyphId, drawFuncsPtr, 0);
      return pathBuffer;
    }

    /**
     * Return glyph name.
     * @param {number} glyphId ID of the requested glyph in the font.
     **/
    function glyphName(glyphId) {
      exports.hb_font_glyph_to_string(
        ptr,
        glyphId,
        nameBuffer,
        nameBufferSize
      );
      var array = Module.HEAPU8.subarray(nameBuffer, nameBuffer + nameBufferSize);
      return utf8Decoder.decode(array.slice(0, array.indexOf(0)));
    }

    return {
      ptr: ptr,
      glyphName: glyphName,
      glyphToPath: glyphToPath,
      /**
      * Return a glyph as a JSON path string
      * based on format described on https://svgwg.org/specs/paths/#InterfaceSVGPathSegment
      * @param {number} glyphId ID of the requested glyph in the font.
      **/
      glyphToJson: function (glyphId) {
        var path = glyphToPath(glyphId);
        return path.replace(/([MLQCZ])/g, '|$1 ').split('|').filter(function (x) { return x.length; }).map(function (x) {
          var row = x.split(/[ ,]/g);
          return { type: row[0], values: row.slice(1).filter(function (x) { return x.length; }).map(function (x) { return +x; }) };
        });
      },
      /**
      * Set the font's scale factor, affecting the position values returned from
      * shaping.
      * @param {number} xScale Units to scale in the X dimension.
      * @param {number} yScale Units to scale in the Y dimension.
      **/
      setScale: function (xScale, yScale) {
        exports.hb_font_set_scale(ptr, xScale, yScale);
      },
      /**
       * Set the font's variations.
       * @param {object} variations Dictionary of variations to set
       **/
      setVariations: function (variations) {
        var entries = Object.entries(variations);
        var vars = exports.malloc(8 * entries.length);
        entries.forEach(function (entry, i) {
          Module.HEAPU32[vars / 4 + i * 2 + 0] = hb_tag(entry[0]);
          Module.HEAPF32[vars / 4 + i * 2 + 1] = entry[1];
        });
        exports.hb_font_set_variations(ptr, vars, entries.length);
        exports.free(vars);
      },
      /**
      * Free the object.
      */
      destroy: function () {
        exports.hb_font_destroy(ptr);
        if (drawFuncsPtr) {
          exports.hb_draw_funcs_destroy(drawFuncsPtr);
          drawFuncsPtr = null;
          removeFunction(moveToPtr);
          removeFunction(lineToPtr);
          removeFunction(cubicToPtr);
          removeFunction(quadToPtr);
          removeFunction(closePathPtr);
        }
      }
    };
  }

  /**
  * Use when you know the input range should be ASCII.
  * Faster than encoding to UTF-8
  **/
  function createAsciiString(text) {
    var ptr = exports.malloc(text.length + 1);
    for (let i = 0; i < text.length; ++i) {
      const char = text.charCodeAt(i);
      if (char > 127) throw new Error('Expected ASCII text');
      Module.HEAPU8[ptr + i] = char;
    }
    Module.HEAPU8[ptr + text.length] = 0;
    return {
      ptr: ptr,
      length: text.length,
      free: function () { exports.free(ptr); }
    };
  }

  function createJsString(text) {
    const ptr = exports.malloc(text.length * 2);
    const words = new Uint16Array(Module.wasmMemory.buffer, ptr, text.length);
    for (let i = 0; i < words.length; ++i) words[i] = text.charCodeAt(i);
    return {
      ptr: ptr,
      length: words.length,
      free: function () { exports.free(ptr); }
    };
  }

  /**
  * Create an object representing a Harfbuzz buffer.
  **/
  function createBuffer() {
    var ptr = exports.hb_buffer_create();
    return {
      ptr: ptr,
      /**
      * Add text to the buffer.
      * @param {string} text Text to be added to the buffer.
      **/
      addText: function (text) {
        const str = createJsString(text);
        exports.hb_buffer_add_utf16(ptr, str.ptr, str.length, 0, str.length);
        str.free();
      },
      /**
      * Set buffer script, language and direction.
      *
      * This needs to be done before shaping.
      **/
      guessSegmentProperties: function () {
        return exports.hb_buffer_guess_segment_properties(ptr);
      },
      /**
      * Set buffer direction explicitly.
      * @param {string} direction: One of "ltr", "rtl", "ttb" or "btt"
      */
      setDirection: function (dir) {
        exports.hb_buffer_set_direction(ptr, {
          ltr: 4,
          rtl: 5,
          ttb: 6,
          btt: 7
        }[dir] || 0);
      },
      /**
      * Set buffer flags explicitly.
      * @param {string[]} flags: A list of strings which may be either:
      * "BOT"
      * "EOT"
      * "PRESERVE_DEFAULT_IGNORABLES"
      * "REMOVE_DEFAULT_IGNORABLES"
      * "DO_NOT_INSERT_DOTTED_CIRCLE"
      * "PRODUCE_UNSAFE_TO_CONCAT"
      */
      setFlags: function (flags) {
        var flagValue = 0;
        flags.forEach(function (s) {
          flagValue |= _buffer_flag(s);
        });

        exports.hb_buffer_set_flags(ptr,flagValue);
      },
      /**
      * Set buffer language explicitly.
      * @param {string} language: The buffer language
      */
      setLanguage: function (language) {
        var str = createAsciiString(language);
        exports.hb_buffer_set_language(ptr, exports.hb_language_from_string(str.ptr,-1));
        str.free();
      },
      /**
      * Set buffer script explicitly.
      * @param {string} script: The buffer script
      */
      setScript: function (script) {
        var str = createAsciiString(script);
        exports.hb_buffer_set_script(ptr, exports.hb_script_from_string(str.ptr,-1));
        str.free();
      },

      /**
      * Set the Harfbuzz clustering level.
      *
      * Affects the cluster values returned from shaping.
      * @param {number} level: Clustering level. See the Harfbuzz manual chapter
      * on Clusters.
      **/
      setClusterLevel: function (level) {
        exports.hb_buffer_set_cluster_level(ptr, level);
      },
      /**
      * Return the buffer contents as a JSON object.
      *
      * After shaping, this function will return an array of glyph information
      * objects. Each object will have the following attributes:
      *
      *   - g: The glyph ID
      *   - cl: The cluster ID
      *   - ax: Advance width (width to advance after this glyph is painted)
      *   - ay: Advance height (height to advance after this glyph is painted)
      *   - dx: X displacement (adjustment in X dimension when painting this glyph)
      *   - dy: Y displacement (adjustment in Y dimension when painting this glyph)
      *   - flags: Glyph flags like `HB_GLYPH_FLAG_UNSAFE_TO_BREAK` (0x1)
      **/
      json: function () {
        var length = exports.hb_buffer_get_length(ptr);
        var result = [];
        var infosPtr = exports.hb_buffer_get_glyph_infos(ptr, 0);
        var infosPtr32 = infosPtr / 4;
        var positionsPtr32 = exports.hb_buffer_get_glyph_positions(ptr, 0) / 4;
        var infos = Module.HEAPU32.subarray(infosPtr32, infosPtr32 + 5 * length);
        var positions = Module.HEAP32.subarray(positionsPtr32, positionsPtr32 + 5 * length);
        for (var i = 0; i < length; ++i) {
          result.push({
            g: infos[i * 5 + 0],
            cl: infos[i * 5 + 2],
            ax: positions[i * 5 + 0],
            ay: positions[i * 5 + 1],
            dx: positions[i * 5 + 2],
            dy: positions[i * 5 + 3],
            flags: exports.hb_glyph_info_get_glyph_flags(infosPtr + i * 20)
          });
        }
        return result;
      },
      /**
      * Free the object.
      */
      destroy: function () { exports.hb_buffer_destroy(ptr); }
    };
  }

  /**
  * Shape a buffer with a given font.
  *
  * This returns nothing, but modifies the buffer.
  *
  * @param {object} font: A font returned from `createFont`
  * @param {object} buffer: A buffer returned from `createBuffer` and suitably
  *   prepared.
  * @param {object} features: A string of comma-separated OpenType features to apply.
  */
  function shape(font, buffer, features) {
    var featuresPtr = 0;
    var featuresLen = 0;
    if (features) {
      features = features.split(",");
      featuresPtr = exports.malloc(16 * features.length);
      features.forEach(function (feature, i) {
        var str = createAsciiString(feature);
        if (exports.hb_feature_from_string(str.ptr, -1, featuresPtr + featuresLen * 16))
          featuresLen++;
        str.free();
      });
    }

    exports.hb_shape(font.ptr, buffer.ptr, featuresPtr, featuresLen);
    if (featuresPtr)
      exports.free(featuresPtr);
  }

  /**
  * Shape a buffer with a given font, returning a JSON trace of the shaping process.
  *
  * This function supports "partial shaping", where the shaping process is
  * terminated after a given lookup ID is reached. If the user requests the function
  * to terminate shaping after an ID in the GSUB phase, GPOS table lookups will be
  * processed as normal.
  *
  * @param {object} font: A font returned from `createFont`
  * @param {object} buffer: A buffer returned from `createBuffer` and suitably
  *   prepared.
  * @param {object} features: A string of comma-separated OpenType features to apply.
  * @param {number} stop_at: A lookup ID at which to terminate shaping.
  * @param {number} stop_phase: Either 0 (don't terminate shaping), 1 (`stop_at`
      refers to a lookup ID in the GSUB table), 2 (`stop_at` refers to a lookup
      ID in the GPOS table).
  */
  function shapeWithTrace(font, buffer, features, stop_at, stop_phase) {
    var trace = [];
    var currentPhase = DONT_STOP;
    var stopping = false;

    var traceBufLen = 1024 * 1024;
    var traceBufPtr = exports.malloc(traceBufLen);

    var traceFunc = function (bufferPtr, fontPtr, messagePtr, user_data) {
      var message = utf8Decoder.decode(Module.HEAPU8.subarray(messagePtr, Module.HEAPU8.indexOf(0, messagePtr)));
      if (message.startsWith("start table GSUB"))
        currentPhase = GSUB_PHASE;
      else if (message.startsWith("start table GPOS"))
        currentPhase = GPOS_PHASE;

      if (currentPhase != stop_phase)
        stopping = false;

      if (stop_phase != DONT_STOP && currentPhase == stop_phase && message.startsWith("end lookup " + stop_at))
        stopping = true;

      if (stopping)
        return 0;

      exports.hb_buffer_serialize_glyphs(
        bufferPtr,
        0, exports.hb_buffer_get_length(bufferPtr),
        traceBufPtr, traceBufLen, 0,
        fontPtr,
        HB_BUFFER_SERIALIZE_FORMAT_JSON,
        HB_BUFFER_SERIALIZE_FLAG_NO_GLYPH_NAMES);

      trace.push({
        m: message,
        t: JSON.parse(utf8Decoder.decode(Module.HEAPU8.subarray(traceBufPtr, Module.HEAPU8.indexOf(0, traceBufPtr)))),
        glyphs: exports.hb_buffer_get_content_type(bufferPtr) == HB_BUFFER_CONTENT_TYPE_GLYPHS,
      });

      return 1;
    };

    var traceFuncPtr = addFunction(traceFunc, 'iiiii');
    exports.hb_buffer_set_message_func(buffer.ptr, traceFuncPtr, 0, 0);
    shape(font, buffer, features);
    exports.free(traceBufPtr);
    removeFunction(traceFuncPtr);

    return trace;
  }

  function version() {
    var versionPtr = exports.malloc(12);
    exports.hb_version(versionPtr, versionPtr + 4, versionPtr + 8);
    var version = {
      major: Module.HEAPU32[versionPtr / 4],
      minor: Module.HEAPU32[(versionPtr + 4) / 4],
      micro: Module.HEAPU32[(versionPtr + 8) / 4],
    };
    exports.free(versionPtr);
    return version;
  }

  function version_string() {
    var versionPtr = exports.hb_version_string();
    var version = utf8Decoder.decode(Module.HEAPU8.subarray(versionPtr, Module.HEAPU8.indexOf(0, versionPtr)));
    return version;
  }

  return {
    createBlob: createBlob,
    createFace: createFace,
    createFont: createFont,
    createBuffer: createBuffer,
    shape: shape,
    shapeWithTrace: shapeWithTrace,
    version: version,
    version_string: version_string,
  };
}

// Should be replaced with something more reliable
try {
  hbjs$2.exports = hbjs;
} catch (e) {}

var hbjsExports = hbjs$2.exports;
var hbjs$1 = /*@__PURE__*/getDefaultExportFromCjs(hbjsExports);

let harfbuzzPromise = null;
let wasmPath = null;
let wasmBuffer = null;
const HarfBuzzLoader = {
    setWasmPath(path) {
        wasmPath = path;
        wasmBuffer = null; // Clear buffer if path is set
        harfbuzzPromise = null;
    },
    setWasmBuffer(buffer) {
        wasmBuffer = buffer;
        wasmPath = null; // Clear path if buffer is set
        harfbuzzPromise = null;
    },
    async getHarfBuzz() {
        if (harfbuzzPromise) {
            return harfbuzzPromise;
        }
        harfbuzzPromise = new Promise(async (resolve, reject) => {
            try {
                const moduleConfig = {};
                if (wasmBuffer) {
                    moduleConfig.wasmBinary = wasmBuffer;
                }
                else if (wasmPath) {
                    moduleConfig.wasmBinary = await loadBinary(wasmPath);
                }
                else {
                    throw new Error('HarfBuzz WASM path or buffer must be set before initialization.');
                }
                const hbModule = await createHarfBuzz(moduleConfig);
                const hb = hbjs$1(hbModule);
                const module = {
                    addFunction: hbModule.addFunction,
                    exports: hbModule.wasmExports,
                    removeFunction: hbModule.removeFunction
                };
                resolve({ hb, module });
            }
            catch (error) {
                reject(new Error(`Failed to initialize HarfBuzz: ${error}`));
            }
        });
        return harfbuzzPromise;
    }
};

const DEFAULT_MAX_TEXT_LENGTH = 100000;
const DEFAULT_FONT_SIZE = 72;
class Text {
    static { this.patternCache = new Map(); }
    static { this.hbInitPromise = null; }
    static { this.fontCache = new Map(); }
    static { this.fontLoadPromises = new Map(); }
    static { this.fontRefCounts = new Map(); }
    static { this.fontCacheMemoryBytes = 0; }
    static { this.maxFontCacheMemoryBytes = Infinity; }
    static { this.fontIdCounter = 0; }
    static enableWoff2(decoder) {
        setWoff2Decoder(decoder);
    }
    static stableStringify(obj) {
        const keys = Object.keys(obj).sort();
        let result = '';
        for (let i = 0; i < keys.length; i++) {
            if (i > 0)
                result += ',';
            result += keys[i] + ':' + obj[keys[i]];
        }
        return result;
    }
    constructor() {
        this.currentFontId = '';
        if (!Text.hbInitPromise) {
            Text.hbInitPromise = HarfBuzzLoader.getHarfBuzz();
        }
        this.fontLoader = new FontLoader(() => Text.hbInitPromise);
    }
    static setHarfBuzzPath(path) {
        HarfBuzzLoader.setWasmPath(path);
        Text.hbInitPromise = null;
    }
    static setHarfBuzzBuffer(wasmBuffer) {
        HarfBuzzLoader.setWasmBuffer(wasmBuffer);
        Text.hbInitPromise = null;
    }
    static init() {
        if (!Text.hbInitPromise) {
            Text.hbInitPromise = HarfBuzzLoader.getHarfBuzz();
        }
        return Text.hbInitPromise;
    }
    static async create(options) {
        if (!options.font) {
            throw new Error('Font is required. Specify options.font as a URL string or ArrayBuffer.');
        }
        if (!Text.hbInitPromise) {
            Text.hbInitPromise = HarfBuzzLoader.getHarfBuzz();
        }
        const { loadedFont, fontKey } = await Text.resolveFont(options);
        const text = new Text();
        text.setLoadedFont(loadedFont, fontKey);
        const result = await text.createLayout(options);
        const update = async (newOptions) => {
            const mergedOptions = { ...options };
            for (const key in newOptions) {
                const value = newOptions[key];
                if (value !== undefined) {
                    mergedOptions[key] = value;
                }
            }
            if (newOptions.font !== undefined ||
                newOptions.fontVariations !== undefined ||
                newOptions.fontFeatures !== undefined) {
                const { loadedFont: newLoadedFont, fontKey: newFontKey } = await Text.resolveFont(mergedOptions);
                text.setLoadedFont(newLoadedFont, newFontKey);
                text.resetHelpers();
            }
            options = mergedOptions;
            const newResult = await text.createLayout(options);
            return {
                ...newResult,
                getLoadedFont: () => text.getLoadedFont(),
                measureTextWidth: (textString, letterSpacing) => text.measureTextWidth(textString, letterSpacing),
                update,
                dispose: () => text.destroy()
            };
        };
        return {
            ...result,
            getLoadedFont: () => text.getLoadedFont(),
            measureTextWidth: (textString, letterSpacing) => text.measureTextWidth(textString, letterSpacing),
            update,
            dispose: () => text.destroy()
        };
    }
    static retainFont(fontKey) {
        Text.fontRefCounts.set(fontKey, (Text.fontRefCounts.get(fontKey) ?? 0) + 1);
    }
    static releaseFont(fontKey, loadedFont) {
        const nextCount = (Text.fontRefCounts.get(fontKey) ?? 0) - 1;
        if (nextCount > 0) {
            Text.fontRefCounts.set(fontKey, nextCount);
            return;
        }
        Text.fontRefCounts.delete(fontKey);
        // Cached fonts stay alive while present in the cache. If a font has been
        // evicted, destroy it once the last live handle releases it.
        if (!Text.fontCache.has(fontKey)) {
            FontLoader.destroyFont(loadedFont);
        }
    }
    static async resolveFont(options) {
        const baseFontKey = typeof options.font === 'string'
            ? options.font
            : `buffer-${Text.generateFontContentHash(options.font)}`;
        let fontKey = baseFontKey;
        if (options.fontVariations) {
            fontKey += `_var_${Text.stableStringify(options.fontVariations)}`;
        }
        if (options.fontFeatures) {
            fontKey += `_feat_${Text.stableStringify(options.fontFeatures)}`;
        }
        let loadedFont = Text.fontCache.get(fontKey);
        if (!loadedFont) {
            let loadPromise = Text.fontLoadPromises.get(fontKey);
            if (!loadPromise) {
                loadPromise = Text.loadAndCacheFont(fontKey, options.font, options.fontVariations, options.fontFeatures).finally(() => {
                    Text.fontLoadPromises.delete(fontKey);
                });
                Text.fontLoadPromises.set(fontKey, loadPromise);
            }
            loadedFont = await loadPromise;
        }
        Text.retainFont(fontKey);
        return { loadedFont, fontKey };
    }
    static async loadAndCacheFont(fontKey, font, fontVariations, fontFeatures) {
        const tempText = new Text();
        await tempText.loadFont(font, fontVariations, fontFeatures);
        const loadedFont = tempText.getLoadedFont();
        Text.fontCache.set(fontKey, loadedFont);
        Text.trackFontCacheAdd(loadedFont);
        Text.enforceFontCacheMemoryLimit();
        return loadedFont;
    }
    static trackFontCacheAdd(loadedFont) {
        const size = loadedFont._buffer?.byteLength ?? 0;
        Text.fontCacheMemoryBytes += size;
    }
    static trackFontCacheRemove(fontKey) {
        const font = Text.fontCache.get(fontKey);
        if (!font)
            return;
        const size = font._buffer?.byteLength ?? 0;
        Text.fontCacheMemoryBytes -= size;
        if (Text.fontCacheMemoryBytes < 0)
            Text.fontCacheMemoryBytes = 0;
    }
    static enforceFontCacheMemoryLimit() {
        if (Text.maxFontCacheMemoryBytes === Infinity)
            return;
        while (Text.fontCacheMemoryBytes > Text.maxFontCacheMemoryBytes &&
            Text.fontCache.size > 0) {
            const firstKey = Text.fontCache.keys().next().value;
            if (firstKey === undefined)
                break;
            const font = Text.fontCache.get(firstKey);
            Text.trackFontCacheRemove(firstKey);
            Text.fontCache.delete(firstKey);
            if ((Text.fontRefCounts.get(firstKey) ?? 0) <= 0 && font) {
                FontLoader.destroyFont(font);
            }
        }
    }
    static generateFontContentHash(buffer) {
        if (buffer) {
            const view = new Uint8Array(buffer);
            let hash = 2166136261;
            const samplePoints = Math.min(32, view.length);
            const step = Math.floor(view.length / samplePoints);
            for (let i = 0; i < samplePoints; i++) {
                const index = i * step;
                hash ^= view[index];
                hash = Math.imul(hash, 16777619);
            }
            hash ^= view.length;
            hash = Math.imul(hash, 16777619);
            return (hash >>> 0).toString(36);
        }
        else {
            return `c${++Text.fontIdCounter}`;
        }
    }
    setLoadedFont(loadedFont, fontKey) {
        if (this.loadedFont && this.loadedFont !== loadedFont) {
            this.releaseCurrentFont();
        }
        this.loadedFont = loadedFont;
        this.currentFontCacheKey = fontKey;
        const contentHash = Text.generateFontContentHash(loadedFont._buffer);
        this.currentFontId = `font_${contentHash}`;
        if (loadedFont.fontVariations) {
            this.currentFontId += `_var_${Text.stableStringify(loadedFont.fontVariations)}`;
        }
        if (loadedFont.fontFeatures) {
            this.currentFontId += `_feat_${Text.stableStringify(loadedFont.fontFeatures)}`;
        }
    }
    releaseCurrentFont() {
        if (!this.loadedFont)
            return;
        const currentFont = this.loadedFont;
        const currentFontKey = this.currentFontCacheKey;
        try {
            if (currentFontKey) {
                Text.releaseFont(currentFontKey, currentFont);
            }
            else {
                FontLoader.destroyFont(currentFont);
            }
        }
        catch (error) {
            logger.warn('Error destroying HarfBuzz objects:', error);
        }
        finally {
            this.loadedFont = undefined;
            this.currentFontCacheKey = undefined;
            this.textLayout = undefined;
            this.textShaper = undefined;
        }
    }
    async loadFont(fontSrc, fontVariations, fontFeatures) {
        perfLogger.start('Text.loadFont', {
            fontSrc: typeof fontSrc === 'string' ? fontSrc : `buffer(${fontSrc.byteLength})`
        });
        if (!Text.hbInitPromise) {
            Text.hbInitPromise = HarfBuzzLoader.getHarfBuzz();
        }
        await Text.hbInitPromise;
        const fontBuffer = typeof fontSrc === 'string' ? await loadBinary(fontSrc) : fontSrc;
        try {
            if (this.loadedFont) {
                this.destroy();
            }
            this.loadedFont = await this.fontLoader.loadFont(fontBuffer, fontVariations);
            if (fontFeatures) {
                this.loadedFont.fontFeatures = fontFeatures;
            }
            const contentHash = Text.generateFontContentHash(fontBuffer);
            this.currentFontId = `font_${contentHash}`;
            if (fontVariations) {
                this.currentFontId += `_var_${Text.stableStringify(fontVariations)}`;
            }
            if (fontFeatures) {
                this.currentFontId += `_feat_${Text.stableStringify(fontFeatures)}`;
            }
        }
        catch (error) {
            logger.error('Failed to load font:', error);
            throw error;
        }
        finally {
            perfLogger.end('Text.loadFont');
        }
    }
    async createLayout(options) {
        perfLogger.start('Text.createLayout', {
            textLength: options.text.length,
            size: options.size || DEFAULT_FONT_SIZE,
            hasLayout: !!options.layout
        });
        try {
            if (!this.loadedFont) {
                throw new Error('Font not loaded. Use Text.create() with a font option.');
            }
            const updatedOptions = await this.prepareHyphenation(options);
            this.validateOptions(updatedOptions);
            options = updatedOptions;
            this.updateFontVariations(options);
            this.loadedFont.font.setScale(this.loadedFont.upem, this.loadedFont.upem);
            if (!this.textShaper) {
                this.textShaper = new TextShaper(this.loadedFont);
            }
            const layoutData = this.prepareLayout(options);
            const clustersByLine = this.textShaper.shapeLines(layoutData.lines, layoutData.scaledLineHeight, layoutData.letterSpacing, layoutData.align, layoutData.direction, options.color, options.text);
            return {
                clustersByLine,
                layoutData,
                options,
                loadedFont: this.loadedFont,
                fontId: this.currentFontId
            };
        }
        finally {
            perfLogger.end('Text.createLayout');
        }
    }
    async prepareHyphenation(options) {
        if (options.layout?.hyphenate !== false && options.layout?.width) {
            const language = options.layout?.language || 'en-us';
            if (!options.layout?.hyphenationPatterns?.[language]) {
                try {
                    if (!Text.patternCache.has(language)) {
                        const pattern = await loadPattern(language, options.layout?.patternsPath);
                        Text.patternCache.set(language, pattern);
                    }
                    return {
                        ...options,
                        layout: {
                            ...options.layout,
                            hyphenationPatterns: {
                                ...options.layout?.hyphenationPatterns,
                                [language]: Text.patternCache.get(language)
                            }
                        }
                    };
                }
                catch (error) {
                    logger.warn(`Failed to load patterns for ${language}: ${error}`);
                    return {
                        ...options,
                        layout: {
                            ...options.layout,
                            hyphenate: false
                        }
                    };
                }
            }
        }
        return options;
    }
    validateOptions(options) {
        if (!options.text) {
            throw new Error('Text content is required');
        }
        const maxLength = options.maxTextLength ?? DEFAULT_MAX_TEXT_LENGTH;
        if (options.text.length > maxLength) {
            throw new Error(`Text exceeds ${maxLength} character limit`);
        }
    }
    updateFontVariations(options) {
        if (options.fontVariations && this.loadedFont) {
            if (Text.stableStringify(options.fontVariations) !==
                Text.stableStringify(this.loadedFont.fontVariations || {})) {
                this.loadedFont.font.setVariations(options.fontVariations);
                this.loadedFont.fontVariations = options.fontVariations;
            }
        }
    }
    prepareLayout(options) {
        if (!this.loadedFont) {
            throw new Error('Font not loaded. Use Text.create() with a font option');
        }
        const { text, size = DEFAULT_FONT_SIZE, depth = 0, lineHeight = 1.0, letterSpacing = 0, layout = {} } = options;
        const { width, direction = 'ltr', align = direction === 'rtl' ? 'right' : 'left', respectExistingBreaks = true, hyphenate = true, language = 'en-us', tolerance = DEFAULT_TOLERANCE, pretolerance = DEFAULT_PRETOLERANCE, emergencyStretch = DEFAULT_EMERGENCY_STRETCH, autoEmergencyStretch, hyphenationPatterns, lefthyphenmin, righthyphenmin, linepenalty, adjdemerits, hyphenpenalty, exhyphenpenalty, doublehyphendemerits } = layout;
        const fontUnitsPerPixel = this.loadedFont.upem / size;
        let widthInFontUnits;
        if (width !== undefined) {
            widthInFontUnits = width * fontUnitsPerPixel;
        }
        const rawDepthInFontUnits = depth * fontUnitsPerPixel;
        const minExtrudeDepth = this.loadedFont.upem * 0.000025;
        const depthInFontUnits = rawDepthInFontUnits <= 0
            ? 0
            : Math.max(rawDepthInFontUnits, minExtrudeDepth);
        if (!this.textLayout) {
            this.textLayout = new TextLayout(this.loadedFont);
        }
        const layoutResult = this.textLayout.computeLines({
            text,
            width: widthInFontUnits,
            align,
            direction,
            hyphenate,
            language,
            respectExistingBreaks,
            tolerance,
            pretolerance,
            emergencyStretch,
            autoEmergencyStretch,
            hyphenationPatterns,
            lefthyphenmin,
            righthyphenmin,
            linepenalty,
            adjdemerits,
            hyphenpenalty,
            exhyphenpenalty,
            doublehyphendemerits,
            letterSpacing
        });
        const metrics = FontMetadataExtractor.getVerticalMetrics(this.loadedFont.metrics);
        const fontLineHeight = metrics.ascender - metrics.descender;
        const scaledLineHeight = fontLineHeight * lineHeight;
        return {
            lines: layoutResult.lines,
            scaledLineHeight,
            letterSpacing,
            align,
            direction,
            depth: depthInFontUnits,
            size,
            pixelsPerFontUnit: 1 / fontUnitsPerPixel
        };
    }
    getFontMetrics() {
        if (!this.loadedFont) {
            throw new Error('Font not loaded. Call loadFont() first');
        }
        return FontMetadataExtractor.getFontMetrics(this.loadedFont.metrics);
    }
    static async preloadPatterns(languages, patternsPath) {
        await Promise.all(languages.map(async (language) => {
            if (!Text.patternCache.has(language)) {
                try {
                    const pattern = await loadPattern(language, patternsPath);
                    Text.patternCache.set(language, pattern);
                }
                catch (error) {
                    logger.warn(`Failed to pre-load patterns for ${language}: ${error}`);
                }
            }
        }));
    }
    static registerPattern(language, pattern) {
        Text.patternCache.set(language, pattern);
    }
    static setMaxFontCacheMemoryMB(limitMB) {
        Text.maxFontCacheMemoryBytes =
            limitMB === Infinity
                ? Infinity
                : Math.max(1, Math.floor(limitMB)) * 1024 * 1024;
        Text.enforceFontCacheMemoryLimit();
    }
    getLoadedFont() {
        return this.loadedFont;
    }
    measureTextWidth(text, letterSpacing = 0) {
        if (!this.loadedFont) {
            throw new Error('Font not loaded. Call loadFont() first');
        }
        return TextMeasurer.measureTextWidth(this.loadedFont, text, letterSpacing);
    }
    resetHelpers() {
        this.textShaper = undefined;
        this.textLayout = undefined;
    }
    destroy() {
        if (!this.loadedFont) {
            return;
        }
        this.releaseCurrentFont();
    }
}

// Map-based cache with no eviction policy
class Cache {
    constructor() {
        this.cache = new Map();
    }
    get(key) {
        return this.cache.get(key);
    }
    has(key) {
        return this.cache.has(key);
    }
    set(key, value) {
        this.cache.set(key, value);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    getStats() {
        return {
            size: this.cache.size
        };
    }
}

function getGlyphCacheKey(fontId, glyphId, depth, removeOverlaps) {
    const roundedDepth = Math.round(depth * 1000) / 1000;
    return `${fontId}_${glyphId}_${roundedDepth}_${removeOverlaps}`;
}
const globalGlyphCache = new Cache();
function createGlyphCache() {
    return new Cache();
}
const globalContourCache = new Cache();
const globalWordCache = new Cache();
const globalClusteringCache = new Cache();
const globalOutlineCache = new Cache();

/**
 * @license
 * libtess-ts - TypeScript port of the SGI GLU tessellator
 * Original Code: OpenGL Sample Implementation, Version 1.2.1,
 *   released January 26, 2000. Copyright (c) 1991-2000 Silicon Graphics, Inc.
 * Copyright 2012, Google Inc. All Rights Reserved.
 * Copyright 2026, Countertype LLC. All Rights Reserved.
 * SGI Free Software License B (Version 2.0)
 * http://oss.sgi.com/projects/FreeB/
 */
function t(t,i){return t.s===i.s&&t.t===i.t}function i(t,i){return i.s>t.s||t.s===i.s&&i.t>=t.t}function s(t,i){return i.t>t.t||t.t===i.t&&i.s>=t.s}function e(t){return i(t.h.i,t.i)}function n(t){return i(t.i,t.h.i)}function h(t,i){return Math.abs(t.s-i.s)+Math.abs(t.t-i.t)}function r(t,i,s){let e=i.s-t.s,n=s.s-i.s;return e+n>0?n>e?i.t-t.t+e/(e+n)*(t.t-s.t):i.t-s.t+n/(e+n)*(s.t-t.t):0}function l(t,i,s){let e=i.s-t.s,n=s.s-i.s;return e+n>0?(i.t-s.t)*e+(i.t-t.t)*n:0}function o(t,i,s){let e=i.t-t.t,n=s.t-i.t;return e+n>0?n>e?i.s-t.s+e/(e+n)*(t.s-s.s):i.s-s.s+n/(e+n)*(s.s-t.s):0}function u(t,i,s){let e=i.t-t.t,n=s.t-i.t;return e+n>0?(i.s-s.s)*e+(i.s-t.s)*n:0}function c(t,i,s,e){return (t=0>t?0:t)>(s=0>s?0:s)?e+s/(t+s)*(i-e):0===s?(i+e)/2:i+t/(t+s)*(e-i)}function a(t,s,e){const n=t.event,h=s.l,o=e.l;return h.h.i===n?o.h.i===n?i(h.i,o.i)?0>=l(o.h.i,h.i,o.i):l(h.h.i,o.i,h.i)>=0:0>=l(o.h.i,n,o.i):o.h.i===n?l(h.h.i,n,h.i)>=0:r(h.h.i,n,h.i)>=r(o.h.i,n,o.i)}function f(t){return t.o}function d(t){return t.next}function w(t,i){t.u+=i.u,t.h.u+=i.h.u;}function E(t,i){i.l.N=null,t._.delete(i);}function N(t,i,s){t.A.delete(i.l),i.I=0,i.l=s,s.N=i;}function _(t,i){let s,e=i.l.i;do{i=d(i);}while(i.l.i===e);return i.I&&(s=t.A.connect(f(i).l.h,i.l.O),N(t,i,s),i=d(i)),i}function A(t){let i=t.l.h.i;do{t=d(t);}while(t.l.h.i===i);return t}function I(t,i,s){const e=new Z;return e.l=s,t._.insertBefore(i,e),e.I=0,e.k=0,e.T=0,s.N=e,e}function g(t,i){switch(t.M){case Y.ODD:return !!(1&i);case Y.NONZERO:return 0!==i;case Y.POSITIVE:return i>0;case Y.NEGATIVE:return 0>i;case Y.ABS_GEQ_TWO:return i>=2||-2>=i}throw Error("Invalid winding rule")}function O(t,i){const s=i.l,e=s.D;e.p=i.p,e.L=s,E(t,i);}function k(t,i,s){let e,n=null,h=i,r=i.l;for(;h!==s;){if(h.I=0,n=f(h),e=n.l,e.i!=r.i){if(!n.I){O(t,h);break}e=t.A.connect(r.C.h,e.h),N(t,n,e);}r.C!==e&&(t.A.splice(e.h.O,e),t.A.splice(r,e)),O(t,h),r=n.l,h=n;}return r}function y(t,i,s,e,n,h){let r,l,o,u,c=1;o=s;do{I(t,i,o.h),o=o.C;}while(o!==e);for(null===n&&(n=f(i).l.h.C),l=i,u=n;r=f(l),o=r.l.h,o.i===u.i;)o.C!==u&&(t.A.splice(o.h.O,o),t.A.splice(u.h.O,o)),r.G=l.G-o.u,r.p=g(t,r.G),l.T=1,!c&&D(t,l)&&(w(o,u),E(t,l),t.A.delete(u)),c=0,l=r,u=o;l.T=1,h&&C(t,l);}function T(t,i,s,e,n){i.data=null,t.R&&(rt[0]=i.coords[0],rt[1]=i.coords[1],rt[2]=i.coords[2],i.data=t.R(rt,s,e,t.m)),null===i.data&&(n?(t.v(100156),t.U=1):i.data=s[0]);}function b(t,i,s){t.R&&(ht[0]=i.i.data,ht[1]=s.i.data,ht[2]=null,ht[3]=null,nt[0]=.5,nt[1]=.5,nt[2]=0,nt[3]=0,T(t,i.i,ht,nt,0)),t.A.splice(i,s);}function M(t,i,s,e,n){let r=h(i,t),l=h(s,t),o=.5*l/(r+l),u=.5*r/(r+l);void 0!==e&&void 0!==n&&(e[n]=o,e[n+1]=u),t.coords[0]+=o*i.coords[0]+u*s.coords[0],t.coords[1]+=o*i.coords[1]+u*s.coords[1],t.coords[2]+=o*i.coords[2]+u*s.coords[2];}function D(i,s){let e=f(s);const n=s.l,h=e.l;if(h.i.s>n.i.s||n.i.s===h.i.s&&h.i.t>=n.i.t){if(l(h.h.i,n.i,h.i)>0)return 0;t(n.i,h.i)?n.i!==h.i&&(i.S.delete(n.i.B),b(i,h.h.O,n)):(i.A.V(h.h),i.A.splice(n,h.h.O),s.T=e.T=1);}else {if(0>l(n.h.i,h.i,n.i))return 0;d(s).T=s.T=1,i.A.V(n.h),i.A.splice(h.h.O,n);}return 1}function p(t,i){let s=f(i);const e=i.l,n=s.l;let h;if(n.h.i.s>e.h.i.s||e.h.i.s===n.h.i.s&&n.h.i.t>=e.h.i.t){if(0>l(e.h.i,n.h.i,e.i))return 0;d(i).T=i.T=1,h=t.A.V(e),t.A.splice(n.h,h),h.D.p=i.p;}else {if(l(n.h.i,e.h.i,n.i)>0)return 0;i.T=s.T=1,h=t.A.V(n),t.A.splice(e.O,n.h),h.h.D.p=i.p;}return 1}function L(e,n){let h=f(n),a=n.l,w=h.l;const E=a.i,N=w.i;let I,g,O=a.h.i,b=w.h.i;const p=st||(st=new X);let L,C;if(E===N)return 0;if(I=Math.min(E.t,O.t),g=Math.max(N.t,b.t),I>g)return 0;if(i(E,N)){if(l(b,E,N)>0)return 0}else if(0>l(O,N,E))return 0;return ((t,e,n,h,a)=>{let f,d,w;i(t,e)||(w=t,t=e,e=w),i(n,h)||(w=n,n=h,h=w),i(t,n)||(w=t,t=n,n=w,w=e,e=h,h=w),i(n,e)?i(e,h)?(f=r(t,n,e),d=r(n,e,h),0>f+d&&(f=-f,d=-d),a.s=c(f,n.s,d,e.s)):(f=l(t,n,e),d=-l(t,h,e),0>f+d&&(f=-f,d=-d),a.s=c(f,n.s,d,h.s)):a.s=.5*(n.s+e.s),s(t,e)||(w=t,t=e,e=w),s(n,h)||(w=n,n=h,h=w),s(t,n)||(w=t,t=n,n=w,w=e,e=h,h=w),s(n,e)?s(e,h)?(f=o(t,n,e),d=o(n,e,h),0>f+d&&(f=-f,d=-d),a.t=c(f,n.t,d,e.t)):(f=u(t,n,e),d=-u(t,h,e),0>f+d&&(f=-f,d=-d),a.t=c(f,n.t,d,h.t)):a.t=.5*(n.t+e.t);})(O,E,b,N,p),(e.event.s>p.s||p.s===e.event.s&&e.event.t>=p.t)&&(p.s=e.event.s,p.t=e.event.t),L=N.s>E.s||E.s===N.s&&N.t>=E.t?E:N,(p.s>L.s||L.s===p.s&&p.t>=L.t)&&(p.s=L.s,p.t=L.t),t(p,E)||t(p,N)?(D(e,n),0):!t(O,e.event)&&l(O,e.event,p)>=0||!t(b,e.event)&&0>=l(b,e.event,p)?b===e.event?(e.A.V(a.h),e.A.splice(w.h,a),a=f(n=_(e,n)).l,k(e,f(n),h),y(e,n,a.h.O,a,a,1),1):O===e.event?(e.A.V(w.h),e.A.splice(a.O,w.h.O),h=n,C=f(n=A(n)).l.h.C,h.l=w.h.O,w=k(e,h,null),y(e,n,w.C,a.h.C,C,1),1):(0>l(O,e.event,p)||(d(n).T=n.T=1,e.A.V(a.h),a.i.s=e.event.s,a.i.t=e.event.t),l(b,e.event,p)>0||(n.T=h.T=1,e.A.V(w.h),w.i.s=e.event.s,w.i.t=e.event.t),0):(e.A.V(a.h),e.A.V(w.h),e.A.splice(w.h.O,a),a.i.s=p.s,a.i.t=p.t,a.i.B=e.S.P(a.i),((t,i,s,e,n,h)=>{nt[0]=0,nt[1]=0,nt[2]=0,nt[3]=0,ht[0]=s.data,ht[1]=e.data,ht[2]=n.data,ht[3]=h.data,i.coords[0]=i.coords[1]=i.coords[2]=0,M(i,s,e,nt,0),M(i,n,h,nt,2),T(t,i,ht,nt,1);})(e,a.i,E,O,N,b),d(n).T=n.T=h.T=1,0)}function C(t,i){let s,e,n=f(i);for(;;){for(;n.T;)i=n,n=f(n);if(!i.T&&(n=i,null===(i=d(i))||!i.T))return;if(i.T=0,s=i.l,e=n.l,s.h.i!==e.h.i&&p(t,i)&&(n.I?(E(t,n),t.A.delete(e),n=f(i),e=n.l):i.I&&(E(t,i),t.A.delete(s),s=(i=d(n)).l)),s.i!==e.i)if(s.h.i===e.h.i||i.I||n.I||s.h.i!==t.event&&e.h.i!==t.event)D(t,i);else if(L(t,i))return;s.i===e.i&&s.h.i===e.h.i&&(w(e,s),E(t,i),t.A.delete(s),i=d(n));}}function G(s,n){let h,r,o,u,c,a;const w=et||(et=new Z);w.l=n.L.h,h=s._.search(w),r=f(h),r&&(u=h.l,c=r.l,0!==l(u.h.i,n,u.i)?(o=i(c.h.i,u.h.i)?h:r,h.p||o.I?(a=o===h?s.A.connect(n.L.h,u.O):s.A.connect(c.h.C.h,n.L).h,o.I?N(s,o,a):((t,i)=>{i.G=d(i).G+i.l.u,i.p=g(t,i.G);})(s,I(s,h,a)),R(s,n)):y(s,h,n.L,n.L,null,1)):((i,s,n)=>{let h,r,l,o,u;if(h=s.l,t(h.i,n))b(i,h,n.L);else {if(!t(h.h.i,n))return i.A.V(h.h),s.I&&(i.A.delete(h.C),s.I=0),i.A.splice(n.L,h),void R(i,n);u=f(s=A(s)),l=u.l.h,r=o=l.C,u.I&&(E(i,u),i.A.delete(l),l=r.h.O),i.A.splice(n.L,l),e(r)||(r=null),y(i,s,l.C,o,r,1);}})(s,h,n));}function R(s,e){s.event=e;let n=e.L;for(;null===n.N;)if(n=n.C,n===e.L)return void G(s,e);let h=_(s,n.N),r=f(h);const l=r.l;let o=k(s,r,null);o.C===l?((s,e,n)=>{let h,r=n.C,l=f(e),o=e.l,u=l.l,c=0;o.h.i!==u.h.i&&L(s,e),t(o.i,s.event)&&(s.A.splice(r.h.O,o),r=f(e=_(s,e)).l,k(s,f(e),l),c=1),t(u.i,s.event)&&(s.A.splice(n,u.h.O),n=k(s,l,null),c=1),c?y(s,e,n.C,r,r,1):(h=i(u.i,o.i)?u.h.O:o,h=s.A.connect(n.C.h,h),y(s,e,h,h.C,h.C,0),h.h.N.I=1,C(s,e));})(s,h,o):y(s,h,o.C,l,l,1);}function m(t,i,s,e){const n=new Z;let h=t.A.F();h.i.s=s,h.i.t=e,h.h.i.s=i,h.h.i.t=e,t.event=h.h.i,n.l=h,n.G=0,n.p=0,n.I=0,n.k=1,n.T=0,t._.P(n);}function v(t,i){const s=t.Y;let e=s.next,n=e.coords[0],h=e.coords[1],r=e.coords[2],l=n,o=h,u=r,c=e,a=e,f=e,d=e,w=e,E=e;for(e=s.next;e!==s;e=e.next){const t=e.coords[0],i=e.coords[1],s=e.coords[2];n>t&&(n=t,c=e),t>l&&(l=t,d=e),h>i&&(h=i,a=e),i>o&&(o=i,w=e),r>s&&(r=s,f=e),s>u&&(u=s,E=e);}let N=0,_=l-n;const A=o-h;let I,g;if(A>_&&(N=1,_=A),u-r>_&&(N=2),0===N){if(n>=l)return i[0]=0,i[1]=0,void(i[2]=1);I=c,g=d;}else if(1===N){if(h>=o)return i[0]=0,i[1]=0,void(i[2]=1);I=a,g=w;}else {if(r>=u)return i[0]=0,i[1]=0,void(i[2]=1);I=f,g=E;}const O=I.coords[0]-g.coords[0],k=I.coords[1]-g.coords[1],y=I.coords[2]-g.coords[2];let T=0;for(e=s.next;e!==s;e=e.next){const t=e.coords[0]-g.coords[0],s=e.coords[1]-g.coords[1],n=e.coords[2]-g.coords[2],h=k*n-y*s,r=y*t-O*n,l=O*s-k*t,o=h*h+r*r+l*l;o>T&&(T=o,i[0]=h,i[1]=r,i[2]=l);}T>0||(i[0]=i[1]=i[2]=0,Math.abs(k)>Math.abs(O)?i[Math.abs(y)>Math.abs(k)?2:1]=1:i[Math.abs(y)>Math.abs(O)?2:0]=1);}function x(t,i){let s,e,n,h=t.j,r=t.Y,l=0;for(s=h.next;s!==h;s=s.next)if(n=s.L,n.u>0)do{l+=(n.i.s-n.h.i.s)*(n.i.t+n.h.i.t),n=n.O;}while(n!==s.L);if(0>l){for(e=r.next;e!==r;e=e.next)e.t=-e.t;i[0]=-i[0],i[1]=-i[1],i[2]=-i[2];}}function U(t,i){let s=0;for(let e=i.j.next;e!==i.j;e=e.next)e.p&&(s||(t.H(4),s=1),B(e,t));s&&t.q();}function S(t,i,s,e){0>i.s*(s.t-e.t)+s.s*(e.t-i.t)+e.s*(i.t-s.t)?(t.W(i.data),t.W(e.data),t.W(s.data)):(t.W(i.data),t.W(s.data),t.W(e.data));}function B(t,s){let e=0,n=t.L;do{ot[e++]=n.i,n=n.O;}while(n!==t.L);if(3>e)return;if(3===e)return void S(s,ot[0],ot[1],ot[2]);(t=>{if(t>ut.length){const i=2*t;ut=new Int8Array(i),ct=new Int32Array(i),at=new Int32Array(i);}})(e);let h=0,r=0;for(let t=1;e>t;t++)i(ot[t],ot[h])||(h=t),i(ot[t],ot[r])&&(r=t);if(h===r)return;let l=0;ct[l]=h,ut[l]=1,l++;let o=(h+1)%e,u=(h+e-1)%e;for(;o!==r||u!==r;){let t;t=o===r?0:u===r?1:!i(ot[o],ot[u]),t?(ct[l]=o,ut[l]=1,l++,o=(o+1)%e):(ct[l]=u,ut[l]=0,l++,u=(u+e-1)%e);}ct[l]=r,ut[l]=1,l++;let c=0;at[c++]=0,at[c++]=1;for(let t=2;l-1>t;t++)if(ut[t]!==ut[at[c-1]]){for(;c>1;){const i=at[--c];S(s,ot[ct[t]],ot[ct[i]],ot[ct[at[c-1]]]);}--c,at[c++]=t-1,at[c++]=t;}else {let i=at[--c];for(;c>0;){const e=ot[ct[t]],n=ot[ct[i]],h=ot[ct[at[c-1]]],r=e.s*(n.t-h.t)+n.s*(h.t-e.t)+h.s*(e.t-n.t);if(!(1===ut[t]?0>=r:r>=0))break;S(s,e,n,h),i=at[--c];}at[c++]=i,at[c++]=t;}for(;c>1;){const t=at[--c];S(s,ot[ct[l-1]],ot[ct[t]],ot[ct[at[c-1]]]);}}function V(t,i){let s;for(let e=t.Z.next;e!==t.Z;e=s)s=e.next,e.h.D.p!==e.D.p?e.u=e.D.p?i:-i:t.delete(e);}function P(t,i){let s=0,e=-1;for(let n=i.j.o;n!==i.j;n=n.o){if(!n.p)continue;s||(t.H(4),s=1);let i=n.L;do{{const s=i.h&&i.h.D&&i.h.D.p?0:1;e!==s&&(e=s,t.K(!!e));}t.W(i.i.data),i=i.O;}while(i!==n.L)}s&&t.q();}function F(t,i){for(let s=i.j.next;s!==i.j;s=s.next){if(!s.p)continue;t.H(2);let i=s.L;do{t.W(i.i.data),i=i.O;}while(i!==s.L);t.q();}}var Y,j,H,z;(t=>{t[t.ODD=0]="ODD",t[t.NONZERO=1]="NONZERO",t[t.POSITIVE=2]="POSITIVE",t[t.NEGATIVE=3]="NEGATIVE",t[t.ABS_GEQ_TWO=4]="ABS_GEQ_TWO";})(Y||(Y={})),(t=>{t[t.X=0]="POLYGONS",t[t.J=1]="CONNECTED_POLYGONS",t[t.$=2]="BOUNDARY_CONTOURS";})(j||(j={})),(t=>{t[t.BEGIN=100100]="BEGIN",t[t.EDGE_FLAG=100104]="EDGE_FLAG",t[t.VERTEX=100101]="VERTEX",t[t.END=100102]="END",t[t.ERROR=100103]="ERROR",t[t.COMBINE=100105]="COMBINE",t[t.BEGIN_DATA=100106]="BEGIN_DATA",t[t.EDGE_FLAG_DATA=100110]="EDGE_FLAG_DATA",t[t.VERTEX_DATA=100107]="VERTEX_DATA",t[t.END_DATA=100108]="END_DATA",t[t.ERROR_DATA=100109]="ERROR_DATA",t[t.COMBINE_DATA=100111]="COMBINE_DATA",t[t.WINDING_RULE=100140]="WINDING_RULE",t[t.BOUNDARY_ONLY=100141]="BOUNDARY_ONLY",t[t.TOLERANCE=100142]="TOLERANCE";})(H||(H={})),(t=>{t[t.tt=100151]="MISSING_BEGIN_POLYGON",t[t.it=100152]="MISSING_BEGIN_CONTOUR",t[t.st=100153]="MISSING_END_POLYGON",t[t.et=100154]="MISSING_END_CONTOUR",t[t.nt=100155]="COORD_TOO_LARGE",t[t.ht=100156]="NEED_COMBINE_CALLBACK";})(z||(z={}));class Z{next;o;l=null;G=0;p=0;k=0;T=0;I=0}class K{next;i;h;C;O;D;N=null;u=0}class X{next;o;L;coords=[0,0,0];s=0;t=0;B=0;data=null}class Q{next;o;L;p=0}class J{Y;j;Z;rt;vertexCount=0;constructor(){const t=new X,i=new Q,s=new K,e=new K;t.next=t.o=t,i.next=i.o=i,s.next=s,s.h=e,e.next=e,e.h=s,this.Y=t,this.j=i,this.Z=s,this.rt=e;}lt(t){const i=new K,s=new K,e=t.h.next;return s.next=e,e.h.next=i,i.next=t,t.h.next=s,i.h=s,i.C=i,i.O=s,i.u=0,i.N=null,s.h=i,s.C=s,s.O=i,s.u=0,s.N=null,i}ot(t,i){const s=t.C,e=i.C;s.h.O=i,e.h.O=t,t.C=e,i.C=s;}ut(t,i,s){const e=t,n=s.o;e.o=n,n.next=e,e.next=s,s.o=e,e.L=i,++this.vertexCount;let h=i;do{h.i=e,h=h.C;}while(h!==i)}ct(t,i,s){const e=t,n=s.o;e.o=n,n.next=e,e.next=s,s.o=e,e.L=i,e.p=s.p;let h=i;do{h.D=e,h=h.O;}while(h!==i)}ft(t){const i=t.next,s=t.h.next;i.h.next=s,s.h.next=i;}dt(t,i){const s=t.L;let e=s;do{e.i=i,e=e.C;}while(e!==s);const n=t.o,h=t.next;h.o=n,n.next=h,--this.vertexCount;}wt(t,i){const s=t.L;let e=s;do{e.D=i,e=e.O;}while(e!==s);const n=t.o,h=t.next;h.o=n,n.next=h;}F(){const t=new X,i=new X,s=new Q,e=this.lt(this.Z);return this.ut(t,e,this.Y),this.ut(i,e.h,this.Y),this.ct(s,e,this.j),e}splice(t,i){let s=0,e=0;if(t!==i){if(i.i!==t.i&&(e=1,this.dt(i.i,t.i)),i.D!==t.D&&(s=1,this.wt(i.D,t.D)),this.ot(i,t),!e){const s=new X;this.ut(s,i,t.i),t.i.L=t;}if(!s){const s=new Q;this.ct(s,i,t.D),t.D.L=t;}}}delete(t){const i=t.h;let s=0;if(t.D!==t.h.D&&(s=1,this.wt(t.D,t.h.D)),t.C===t)this.dt(t.i,null);else if(t.h.D.L=t.h.O,t.i.L=t.C,this.ot(t,t.h.O),!s){const i=new Q;this.ct(i,t,t.D);}i.C===i?(this.dt(i.i,null),this.wt(i.D,null)):(t.D.L=i.h.O,i.i.L=i.C,this.ot(i,i.h.O)),this.ft(t);}Et(t){const i=this.lt(t),s=i.h;this.ot(i,t.O),i.i=t.h.i;const e=new X;return this.ut(e,s,i.i),i.D=s.D=t.D,i}V(t){const i=this.Et(t).h;return this.ot(t.h,t.h.h.O),this.ot(t.h,i),t.h.i=i.i,i.h.i.L=i.h,i.h.D=t.h.D,i.u=t.u,i.h.u=t.h.u,i}connect(t,i){let s=0;const e=this.lt(t),n=e.h;if(i.D!==t.D&&(s=1,this.wt(i.D,t.D)),this.ot(e,t.O),this.ot(n,i),e.i=t.h.i,n.i=i.i,e.D=n.D=t.D,t.D.L=n,!s){const i=new Q;this.ct(i,e,t.D);}return e}Nt(t){const i=t.L;let s,e,n,h,r;e=i.O;do{s=e,e=s.O,s.D=null,s.h.D||(s.C===s?this.dt(s.i,null):(s.i.L=s.C,this.ot(s,s.h.O)),n=s.h,n.C===n?this.dt(n.i,null):(n.i.L=n.C,this.ot(n,n.h.O)),this.ft(s));}while(s!=i);h=t.o,r=t.next,r.o=h,h.next=r;}_t(t){let i=t.L,s=0;do{s++,i=i.O;}while(i!==t.L);return s}check(){}}class ${max=0;At;It;gt;Ot=0;kt=0;size=0;constructor(t){this.max=t,this.At=new Int32Array(t+1),this.It=Array(t+1).fill(null),this.gt=new Int32Array(t+1),this.Ot=0,this.At[1]=1,this.It[1]=null;}reset(t){if(t+1>this.max)this.max=t,this.At=new Int32Array(t+1),this.It=Array(t+1).fill(null),this.gt=new Int32Array(t+1);else {const t=this.It;for(let i=1;this.size>=i;i++)t[i]=null;}this.size=0,this.kt=0,this.Ot=0,this.At[1]=1,this.It[1]=null;}yt(t){const i=this.At,s=this.It,e=this.gt;let n=i[t];for(;;){let h=t<<1;if(h>this.size)break;let r=h,l=i[h];if(this.size>=h+1){const t=i[h+1],e=s[t],n=s[l];(n.s>e.s||e.s===n.s&&n.t>=e.t)&&(r=h+1,l=t);}const o=s[n],u=s[l];if(u.s>o.s||o.s===u.s&&u.t>=o.t)break;i[t]=l,e[l]=t,t=r;}i[t]=n,e[n]=t;}Tt(t){const i=this.At,s=this.It,e=this.gt;let n=i[t];for(;;){const h=t>>1;if(0===h)break;const r=i[h],l=s[r],o=s[n];if(o.s>l.s||l.s===o.s&&o.t>=l.t)break;i[t]=r,e[r]=t,t=h;}i[t]=n,e[n]=t;}init(){for(let t=this.size>>1;t>=1;--t)this.yt(t);this.Ot=1;}bt(){return 0===this.size}min(){return 0===this.size?null:this.It[this.At[1]]}P(t){let i,s;if(i=++this.size,2*i>this.max){this.max*=2;const t=new Int32Array(this.max+1),i=new Int32Array(this.max+1),s=Array(this.max+1).fill(null);t.set(this.At),i.set(this.gt);for(let t=0;this.It.length>t;t++)s[t]=this.It[t];this.At=t,this.gt=i,this.It=s;}return 0===this.kt?s=i:(s=this.kt,this.kt=this.gt[s]),this.At[i]=s,this.gt[s]=i,this.It[s]=t,this.Ot&&this.Tt(i),s}Mt(){const t=this.At,i=this.It,s=this.gt;let e=t[1],n=i[e];return this.size>0&&(t[1]=t[this.size],s[t[1]]=1,i[e]=null,s[e]=this.kt,this.kt=e,--this.size,this.size>0&&this.yt(1)),n}delete(t){const i=this.At,s=this.It,e=this.gt;let n;if(n=e[t],i[n]=i[this.size],e[i[n]]=n,--this.size,this.size>=n)if(n>1){const t=s[i[n>>1]],e=s[i[n]];e.s>t.s||t.s===e.s&&e.t>=t.t?this.yt(n):this.Tt(n);}else this.yt(n);s[t]=null,e[t]=this.kt,this.kt=t;}}class tt{Dt;keys;order=null;size=0;max=0;Ot=0;Lt;constructor(t){this.max=t,this.size=0,this.Ot=0,this.Lt=128>=t,this.Dt=new $(t),this.Lt||(this.keys=Array(t).fill(null));}reset(t){this.Dt.reset(t),this.Lt=128>=t,this.Lt||this.keys&&this.max>=t||(this.keys=Array(t).fill(null)),t>this.max&&(this.max=t),this.size=0,this.Ot=0,this.order=null;}P(t){if(this.Lt||this.Ot)return this.Dt.P(t);const i=this.size;if(++this.size>=this.max){const t=this.max;this.max*=2;const i=Array(this.max).fill(null);for(let s=0;t>s;s++)i[s]=this.keys[s];this.keys=i;}return this.keys[i]=t,-(i+1)}init(){if(this.Lt)return this.Ot=1,this.Dt.init(),1;this.order=Array(this.size);for(let t=0;this.size>t;t++)this.order[t]=t;const t=this.keys;return this.order.sort((i,s)=>{const e=t[i],n=t[s];return n.s>e.s?1:e.s>n.s||e.t>n.t?-1:1}),this.max=this.size,this.Ot=1,this.Dt.init(),1}Mt(){if(this.Lt||0===this.size)return this.Dt.Mt();const t=this.keys[this.order[this.size-1]];if(!this.Dt.bt()){const s=this.Dt.min();if(s&&i(s,t))return this.Dt.Mt()}do{--this.size;}while(this.size>0&&null===this.keys[this.order[this.size-1]]);return t}min(){if(this.Lt||0===this.size)return this.Dt.min();const t=this.keys[this.order[this.size-1]];if(!this.Dt.bt()){const s=this.Dt.min();if(s&&i(s,t))return s}return t}delete(t){0>t?this.keys[-(t+1)]=null:this.Dt.delete(t);}bt(){return (this.Lt||0===this.size)&&this.Dt.bt()}}class it{head=new Z;frame;constructor(t){this.frame=t,this.head.next=this.head,this.head.o=this.head;}min(){return this.head.next}max(){return this.head.o}P(t){return this.insertBefore(this.head,t)}search(t){let i=this.head;do{i=i.next;}while(null!==i.l&&!a(this.frame,t,i));return i}insertBefore(t,i){do{t=t.o;}while(null!==t.l&&!a(this.frame,t,i));return i.next=t.next,t.next.o=i,i.o=t,t.next=i,i}delete(t){t.next.o=t.o,t.o.next=t.next;}}let st=null,et=null;const nt=[0,0,0,0],ht=[null,null,null,null],rt=[0,0,0];class lt{static Ct(t,i){t.u+=i.u,t.h.u+=i.h.u;}static Gt(t,s){let h,r,o;if(h=s.L,h.O===h||h.O.O===h)throw Error("Monotone region has degenerate topology");for(;i(h.h.i,h.i);h=h.C.h);for(;i(h.i,h.h.i);h=h.O);for(r=h.C.h;h.O!==r;)if(i(h.h.i,r.i)){for(;r.O!==h&&(e(r.O)||0>=l(r.i,r.h.i,r.O.h.i));)o=t.connect(r.O,r),r=o.h;r=r.C.h;}else {for(;r.O!==h&&(n(h.C.h)||l(h.h.i,h.i,h.C.h.i)>=0);)o=t.connect(h,h.C.h),h=o.h;h=h.O;}if(r.O===h)throw Error("Monotone region has insufficient vertices");for(;r.O.O!==h;)o=t.connect(r.O,r),r=o.h;return 1}static tessellateInterior(t){let i;for(let s=t.j.next;s!==t.j;s=i)i=s.next,s.p&&lt.Gt(t,s);return 1}}let ot=[],ut=new Int8Array(64),ct=new Int32Array(64),at=new Int32Array(64);var ft;(t=>{t[t.Rt=0]="T_DORMANT",t[t.vt=1]="T_IN_POLYGON",t[t.xt=2]="T_IN_CONTOUR";})(ft||(ft={}));class dt{state=ft.Rt;Ut=null;St=0;Bt=0;Vt=1;Pt=0;Ft=0;Yt=0;jt=0;A;Ht=[0,0,0];zt;qt;Wt;Zt;M=Y.ODD;Kt=Y.ODD;_;S;event;Xt;Qt;Jt;$t;ti;ii;R;si;m=null;U=0;gluTessCallback(t,i){const s=i||null;switch(t){case 100100:case 100106:this.Xt=s;break;case 100104:case 100110:this.$t=s,this.flagBoundary=1;break;case 100101:case 100107:this.Qt=s;break;case 100102:case 100108:this.Jt=s;break;case 100103:this.ti=s;break;case 100109:this.ii=s;break;case 100105:case 100111:this.R=s;break;case 100112:this.si=s;break;default:throw Error("GLU_INVALID_ENUM")}}gluTessProperty(t,i){switch(t){case 100140:{const t=i,s=100130>t?t:t-100130;if(0>s||s>4)throw Error("GLU_INVALID_VALUE");this.Kt=t,this.M=s;break}case 100141:this.ei=!!i;break;case 100142:break;default:throw Error("GLU_INVALID_ENUM")}}gluGetTessProperty(t){switch(t){case 100140:return this.Kt;case 100141:return this.ei;case 100142:return 0;default:throw Error("GLU_INVALID_ENUM")}}gluTessNormal(t,i,s){this.Ht[0]=t,this.Ht[1]=i,this.Ht[2]=s,0===s||t||i||(this.Vt=s>0?1:-1);}H(t){this.Xt&&this.Xt(t,this.m);}W(t){this.Qt&&this.Qt(t,this.m);}q(){this.Jt&&this.Jt(this.m);}K(t){this.$t&&this.$t(t,this.m);}v(t){this.ii?this.ii(t,this.m):this.ti&&this.ti(t);}ni(t){if(this.state!==t)for(;this.state!==t;)t>this.state?this.state===ft.Rt?(this.v(100151),this.gluTessBeginPolygon()):this.state===ft.vt&&(this.v(100152),this.gluTessBeginContour()):this.state===ft.xt?(this.v(100154),this.gluTessEndContour()):this.state===ft.vt&&(this.v(100153),this.gluTessEndPolygon());}ei=0;flagBoundary=0;hi(){const t=this.A,i=t.Y,s=this.Ht[0],e=this.Ht[1],n=this.Ht[2];let h,r;if(this.zt||(this.zt=[0,0,0]),this.qt||(this.qt=[0,0,0]),this.Wt||(this.Wt=[0,0]),this.Zt||(this.Zt=[0,0]),h=this.zt,r=this.qt,this.Bt){h[0]=1,h[1]=0,h[2]=0;const t=n>0?1:-1;return r[0]=0,r[1]=t,r[2]=0,this.Wt[0]=this.Pt,this.Wt[1]=this.Yt,this.Zt[0]=this.Ft,void(this.Zt[1]=this.jt)}if(!this.St&&!s&&!e){let s;h[0]=1,h[1]=0,h[2]=0;let e=0;if(n)s=n>0?1:-1;else {const i=[0,0,0];v(t,i),s=i[2]>0?1:-1,e=1;}r[0]=0,r[1]=s,r[2]=0;let l=i.next,o=l.coords[0],u=l.coords[1]*s;l.s=o,l.t=u;let c=o,a=o,f=u,d=u;for(l=l.next;l!==i;l=l.next)o=l.coords[0],u=l.coords[1]*s,l.s=o,l.t=u,c>o?c=o:o>a&&(a=o),f>u?f=u:u>d&&(d=u);return this.Wt[0]=c,this.Zt[0]=a,void(e?(x(t,this.qt),r[1]!==s?(this.Wt[1]=-d,this.Zt[1]=-f):(this.Wt[1]=f,this.Zt[1]=d)):(this.Wt[1]=f,this.Zt[1]=d))}let l=0;const o=[s,e,n];s||e||n||(v(t,o),l=1);const u=(t=>{let i=0;return Math.abs(t[1])>Math.abs(t[0])&&(i=1),Math.abs(t[2])>Math.abs(t[i])&&(i=2),i})(o);h[u]=0,h[(u+1)%3]=1,h[(u+2)%3]=0,r[u]=0,r[(u+1)%3]=0,r[(u+2)%3]=o[u]>0?1:-1;let c=i.next;c.s=c.coords[0]*h[0]+c.coords[1]*h[1]+c.coords[2]*h[2],c.t=c.coords[0]*r[0]+c.coords[1]*r[1]+c.coords[2]*r[2];let a=c.s,f=c.s,d=c.t,w=c.t;for(c=c.next;c!==i;c=c.next){const t=c.coords[0]*h[0]+c.coords[1]*h[1]+c.coords[2]*h[2],i=c.coords[0]*r[0]+c.coords[1]*r[1]+c.coords[2]*r[2];c.s=t,c.t=i,a>t?a=t:t>f&&(f=t),d>i?d=i:i>w&&(w=i);}l&&x(t,this.qt),l&&r[(u+2)%3]!==(o[u]>0?1:-1)?(this.Wt[0]=a,this.Zt[0]=f,this.Wt[1]=-w,this.Zt[1]=-d):(this.Wt[0]=a,this.Zt[0]=f,this.Wt[1]=d,this.Zt[1]=w);}gluTessBeginPolygon(t){this.ni(ft.Rt),this.state=ft.vt,this.U=0,this.A=new J,this.St=0,this.Bt=0!==this.Ht[2]&&!this.Ht[0]&&!this.Ht[1],this.Pt=1/0,this.Ft=-1/0,this.Yt=1/0,this.jt=-1/0,this.m=t;}gluTessBeginContour(){this.ni(ft.vt),this.state=ft.xt,this.Ut=null;}gluTessVertex(t,i){this.ni(ft.xt);let s=t[0],e=t[1],n=t.length>2?t[2]:0,h=0;-1e150>s?(s=-1e150,h=1):s>1e150&&(s=1e150,h=1),-1e150>e?(e=-1e150,h=1):e>1e150&&(e=1e150,h=1),-1e150>n?(n=-1e150,h=1):n>1e150&&(n=1e150,h=1),h&&this.v(100155);let r=this.Ut;if(null===r?(r=this.A.F(),this.A.splice(r,r.h)):(this.A.V(r),r=r.O),r.i.data=i||null,r.i.coords[0]=s,r.i.coords[1]=e,0!==n?(r.i.coords[2]=n,this.St=1,this.Bt=0):r.i.coords[2]=0,this.Bt){r.i.s=s;const t=e*this.Vt;r.i.t=t,this.Pt>s&&(this.Pt=s),s>this.Ft&&(this.Ft=s),this.Yt>t&&(this.Yt=t),t>this.jt&&(this.jt=t);}r.u=1,r.h.u=-1,this.Ut=r;}gluTessEndContour(){this.ni(ft.xt),this.state=ft.vt;}gluTessEndPolygon(){this.ni(ft.vt),this.state=ft.Rt,this.compute(this.M,void 0,0);const t=this.A;this.U||(this.ei?(V(t,1),F(this,t)):this.flagBoundary?(lt.tessellateInterior(t),P(this,t)):U(this,t)),this.si&&this.si(t),this.A=null,this.Ut=null,this.event=null,this.m=null,this._=null;}gluDeleteTess(){this.ni(ft.Rt);}compute(i=Y.ODD,s,e=0){this.state!==ft.Rt&&this.state===ft.vt&&(this.state=ft.Rt),this.A||(this.A=new J),s&&(this.Ht[0]=s[0],this.Ht[1]=s[1],this.Ht[2]=s[2]),this.M=i,this.hi(),function(i,s=1){let e,n;if((i=>{let s,e,n,h=i.A.Z;for(s=h.next;s!==h;s=e)e=s.next,n=s.O,t(s.i,s.h.i)&&s.O.O!==s&&(b(i,n,s),i.A.delete(s),s=n,n=s.O),n.O===s&&(n!==s&&(n!==e&&n!==e.h||(e=e.next),i.A.delete(n)),s!==e&&s!==e.h||(e=e.next),i.A.delete(s));})(i),!(t=>{let i,s,e,n=t.A.vertexCount+8;for(t.S?(t.S.reset(n),i=t.S):i=t.S=new tt(n),e=t.A.Y,s=e.next;s!==e;s=s.next)s.B=i.P(s);return s!==e?0:(i.init(),1)})(i))return 0;for((t=>{t._=new it(t);let i=t.Zt[0]-t.Wt[0],s=t.Zt[1]-t.Wt[1],e=t.Wt[0]-i,n=t.Zt[0]+i,h=t.Zt[1]+s;m(t,e,n,t.Wt[1]-s),m(t,e,n,h);})(i);null!==(e=i.S.Mt());){for(;n=i.S.min(),null!==n&&t(n,e);)n=i.S.Mt(),b(i,e.L,n.L);R(i,e);}i.event=i._.min().l.i,(t=>{let i;for(;null!==(i=t._.min()).l;)E(t,i);})(i),((t,i)=>{let s,e,n;for(s=i.j.next;s!==i.j;s=e)e=s.next,n=s.L,n.O.O===n&&(w(n.C,n),t.A.delete(n));})(i,i.A),s&&i.A.check();}(this,e);}renderBoundary(){this.A&&(V(this.A,1),F(this,this.A));}renderTriangles(t=0){this.A&&(t?(lt.tessellateInterior(this.A),P(this,this.A)):U(this,this.A));}}

class Tessellator {
    process(paths, removeOverlaps = true, isCFF = false, needsExtrusionContours = true) {
        if (paths.length === 0) {
            return { triangles: { vertices: [], indices: [] }, contours: [] };
        }
        const valid = paths.filter((path) => path.points.length >= 3);
        if (valid.length === 0) {
            return { triangles: { vertices: [], indices: [] }, contours: [] };
        }
        logger.log(`Tessellator: removeOverlaps=${removeOverlaps}, processing ${valid.length} paths`);
        return this.tessellate(valid, removeOverlaps, isCFF, needsExtrusionContours);
    }
    processContours(contours, removeOverlaps = true, isCFF = false, needsExtrusionContours = true) {
        if (contours.length === 0) {
            return { triangles: { vertices: [], indices: [] }, contours: [] };
        }
        return this.tessellateContours(contours, removeOverlaps, isCFF, needsExtrusionContours);
    }
    tessellate(paths, removeOverlaps, isCFF, needsExtrusionContours) {
        // libtess expects CCW winding; TTF outer contours are CW
        const needsWindingReversal = !isCFF && !removeOverlaps;
        let originalContours;
        let tessContours;
        if (needsWindingReversal) {
            tessContours = this.pathsToContours(paths, true);
            if (removeOverlaps || needsExtrusionContours) {
                originalContours = this.pathsToContours(paths);
            }
        }
        else {
            originalContours = this.pathsToContours(paths);
            tessContours = originalContours;
        }
        let extrusionContours = needsExtrusionContours
            ? needsWindingReversal
                ? tessContours
                : (originalContours ?? this.pathsToContours(paths))
            : [];
        if (removeOverlaps) {
            logger.log('Two-pass: boundary extraction then triangulation');
            perfLogger.start('Tessellator.boundaryPass', {
                contourCount: tessContours.length
            });
            const boundaryResult = this.performTessellation(originalContours, 'boundary');
            perfLogger.end('Tessellator.boundaryPass');
            if (!boundaryResult) {
                logger.warn('libtess returned empty result from boundary pass');
                return { triangles: { vertices: [], indices: [] }, contours: [] };
            }
            // Boundary pass normalizes winding (outer CCW, holes CW)
            tessContours = this.boundaryToContours(boundaryResult);
            if (needsExtrusionContours) {
                extrusionContours = tessContours;
            }
            logger.log(`Boundary pass created ${tessContours.length} contours. Starting triangulation pass.`);
        }
        else {
            logger.log(`Single-pass triangulation for ${isCFF ? 'CFF' : 'TTF'}`);
        }
        perfLogger.start('Tessellator.triangulationPass', {
            contourCount: tessContours.length
        });
        const triangleResult = this.performTessellation(tessContours, 'triangles');
        perfLogger.end('Tessellator.triangulationPass');
        if (!triangleResult) {
            const warning = removeOverlaps
                ? 'libtess returned empty result from triangulation pass'
                : 'libtess returned empty result from single-pass triangulation';
            logger.warn(warning);
            return {
                triangles: { vertices: [], indices: [] },
                contours: extrusionContours
            };
        }
        return {
            triangles: {
                vertices: triangleResult.vertices,
                indices: triangleResult.indices || []
            },
            contours: extrusionContours,
            contoursAreBoundary: removeOverlaps
        };
    }
    tessellateContours(contours, removeOverlaps, isCFF, needsExtrusionContours) {
        const needsWindingReversal = !isCFF && !removeOverlaps;
        let originalContours;
        let tessContours;
        if (needsWindingReversal) {
            tessContours = this.reverseContours(contours);
            if (removeOverlaps || needsExtrusionContours) {
                originalContours = contours;
            }
        }
        else {
            originalContours = contours;
            tessContours = contours;
        }
        let extrusionContours = needsExtrusionContours
            ? needsWindingReversal
                ? tessContours
                : (originalContours ?? contours)
            : [];
        if (removeOverlaps) {
            logger.log('Two-pass: boundary extraction then triangulation');
            perfLogger.start('Tessellator.boundaryPass', {
                contourCount: tessContours.length
            });
            const boundaryResult = this.performTessellation(originalContours, 'boundary');
            perfLogger.end('Tessellator.boundaryPass');
            if (!boundaryResult) {
                logger.warn('libtess returned empty result from boundary pass');
                return { triangles: { vertices: [], indices: [] }, contours: [] };
            }
            tessContours = this.boundaryToContours(boundaryResult);
            if (needsExtrusionContours) {
                extrusionContours = tessContours;
            }
            logger.log(`Boundary pass created ${tessContours.length} contours. Starting triangulation pass.`);
        }
        else {
            logger.log(`Single-pass triangulation for ${isCFF ? 'CFF' : 'TTF'}`);
        }
        perfLogger.start('Tessellator.triangulationPass', {
            contourCount: tessContours.length
        });
        const triangleResult = this.performTessellation(tessContours, 'triangles');
        perfLogger.end('Tessellator.triangulationPass');
        if (!triangleResult) {
            const warning = removeOverlaps
                ? 'libtess returned empty result from triangulation pass'
                : 'libtess returned empty result from single-pass triangulation';
            logger.warn(warning);
            return {
                triangles: { vertices: [], indices: [] },
                contours: extrusionContours
            };
        }
        return {
            triangles: {
                vertices: triangleResult.vertices,
                indices: triangleResult.indices || []
            },
            contours: extrusionContours,
            contoursAreBoundary: removeOverlaps
        };
    }
    pathsToContours(paths, reversePoints = false) {
        const contours = new Array(paths.length);
        for (let p = 0; p < paths.length; p++) {
            const points = paths[p].points;
            const pointCount = points.length;
            // Clipper-style paths can be explicitly closed by repeating the first point at the end
            // Normalize to a single closing vertex for stable side wall generation
            const isClosed = pointCount > 1 &&
                points[0].x === points[pointCount - 1].x &&
                points[0].y === points[pointCount - 1].y;
            const end = isClosed ? pointCount - 1 : pointCount;
            // +1 to append a closing vertex
            const contour = new Array((end + 1) * 2);
            let i = 0;
            if (reversePoints) {
                for (let k = end - 1; k >= 0; k--) {
                    const pt = points[k];
                    contour[i++] = pt.x;
                    contour[i++] = pt.y;
                }
            }
            else {
                for (let k = 0; k < end; k++) {
                    const pt = points[k];
                    contour[i++] = pt.x;
                    contour[i++] = pt.y;
                }
            }
            // Some glyphs omit closePath, leaving gaps in extruded side walls
            if (i >= 2) {
                contour[i++] = contour[0];
                contour[i++] = contour[1];
            }
            contours[p] = contour;
        }
        return contours;
    }
    reverseContours(contours) {
        const reversed = new Array(contours.length);
        for (let i = 0; i < contours.length; i++) {
            reversed[i] = this.reverseContour(contours[i]);
        }
        return reversed;
    }
    reverseContour(contour) {
        const len = contour.length;
        if (len === 0)
            return [];
        const isClosed = len >= 4 &&
            contour[0] === contour[len - 2] &&
            contour[1] === contour[len - 1];
        const end = isClosed ? len - 2 : len;
        if (end === 0)
            return [];
        const reversed = new Array(end + 2);
        let out = 0;
        for (let i = end - 2; i >= 0; i -= 2) {
            reversed[out++] = contour[i];
            reversed[out++] = contour[i + 1];
        }
        if (out >= 2) {
            reversed[out++] = reversed[0];
            reversed[out++] = reversed[1];
        }
        return reversed;
    }
    performTessellation(contours, mode) {
        const tess = new dt();
        tess.gluTessProperty(H.WINDING_RULE, Y.NONZERO);
        const vertices = [];
        const indices = [];
        const contourIndices = [];
        let currentContour = [];
        if (mode === 'boundary') {
            tess.gluTessProperty(H.BOUNDARY_ONLY, 1);
        }
        if (mode === 'triangles') {
            tess.gluTessCallback(H.VERTEX_DATA, (data) => {
                indices.push(data);
            });
        }
        else {
            tess.gluTessCallback(H.BEGIN, () => {
                currentContour = [];
            });
            tess.gluTessCallback(H.VERTEX_DATA, (data) => {
                currentContour.push(data);
            });
            tess.gluTessCallback(H.END, () => {
                if (currentContour.length > 0) {
                    contourIndices.push(currentContour);
                }
            });
        }
        tess.gluTessCallback(H.COMBINE, (coords) => {
            const idx = vertices.length / 2;
            vertices.push(coords[0], coords[1]);
            return idx;
        });
        tess.gluTessCallback(H.ERROR, (errno) => {
            logger.warn(`libtess error: ${errno}`);
        });
        tess.gluTessNormal(0, 0, 1);
        tess.gluTessBeginPolygon();
        for (const contour of contours) {
            tess.gluTessBeginContour();
            for (let i = 0; i < contour.length; i += 2) {
                const idx = vertices.length / 2;
                vertices.push(contour[i], contour[i + 1]);
                tess.gluTessVertex([contour[i], contour[i + 1]], idx);
            }
            tess.gluTessEndContour();
        }
        tess.gluTessEndPolygon();
        if (vertices.length === 0) {
            return null;
        }
        if (mode === 'triangles') {
            return { vertices, indices };
        }
        else {
            return { vertices, contourIndices };
        }
    }
    boundaryToContours(boundaryResult) {
        if (!boundaryResult.contourIndices) {
            return [];
        }
        const contours = [];
        for (const indices of boundaryResult.contourIndices) {
            const contour = [];
            for (const idx of indices) {
                const vertIdx = idx * 2;
                contour.push(boundaryResult.vertices[vertIdx], boundaryResult.vertices[vertIdx + 1]);
            }
            if (contour.length > 2) {
                if (contour[0] !== contour[contour.length - 2] ||
                    contour[1] !== contour[contour.length - 1]) {
                    contour.push(contour[0], contour[1]);
                }
            }
            contours.push(contour);
        }
        return contours;
    }
    // Check if contours need winding normalization via boundary pass
    // Returns false if topology is simple enough to skip the expensive pass
    needsWindingNormalization(contours) {
        if (contours.length === 0)
            return false;
        // Heuristic 1: Single contour never needs normalization
        if (contours.length === 1)
            return false;
        // Heuristic 2: All same winding = all outers, no holes
        // Compute signed areas
        let firstSign = null;
        for (const contour of contours) {
            const area = this.signedArea(contour);
            const sign = area >= 0 ? 1 : -1;
            if (firstSign === null) {
                firstSign = sign;
            }
            else if (sign !== firstSign) {
                // Mixed winding detected → might have holes or complex topology
                return true;
            }
        }
        // All same winding → simple topology, no normalization needed
        return false;
    }
    // Compute signed area (CCW = positive, CW = negative)
    signedArea(contour) {
        let area = 0;
        const len = contour.length;
        if (len < 6)
            return 0; // Need at least 3 points
        for (let i = 0; i < len; i += 2) {
            const x1 = contour[i];
            const y1 = contour[i + 1];
            const x2 = contour[(i + 2) % len];
            const y2 = contour[(i + 3) % len];
            area += x1 * y2 - x2 * y1;
        }
        return area / 2;
    }
}

class Extruder {
    constructor() { }
    extrude(geometry, depth = 0, unitsPerEm) {
        const points = geometry.triangles.vertices;
        const triangleIndices = geometry.triangles.indices;
        const contours = geometry.contours;
        const contoursAreBoundary = geometry.contoursAreBoundary === true;
        const pointLen = points.length;
        const numPoints = pointLen / 2;
        // Use boundary contours for side walls when available
        let boundaryEdges = [];
        let sideEdgeCount = 0;
        let useContours = false;
        if (depth !== 0) {
            if (contoursAreBoundary && contours.length > 0) {
                useContours = true;
                for (const contour of contours) {
                    const contourPointCount = contour.length >> 1;
                    if (contourPointCount >= 2) {
                        sideEdgeCount += contourPointCount - 1;
                    }
                }
            }
            else {
                // Use a directionless key (min/max) to detect shared edges
                // Store the directed edge (a->b) and mark as null when seen twice
                const edgeMap = new Map();
                const triLen = triangleIndices.length;
                for (let i = 0; i < triLen; i += 3) {
                    const a = triangleIndices[i];
                    const b = triangleIndices[i + 1];
                    const c = triangleIndices[i + 2];
                    let key, packed;
                    if (a < b) {
                        key = (a << 16) | b;
                    }
                    else {
                        key = (b << 16) | a;
                    }
                    packed = (a << 16) | b;
                    let data = edgeMap.get(key);
                    if (data === undefined) {
                        edgeMap.set(key, packed);
                    }
                    else if (data !== null) {
                        edgeMap.set(key, null);
                    }
                    if (b < c) {
                        key = (b << 16) | c;
                    }
                    else {
                        key = (c << 16) | b;
                    }
                    packed = (b << 16) | c;
                    data = edgeMap.get(key);
                    if (data === undefined) {
                        edgeMap.set(key, packed);
                    }
                    else if (data !== null) {
                        edgeMap.set(key, null);
                    }
                    if (c < a) {
                        key = (c << 16) | a;
                    }
                    else {
                        key = (a << 16) | c;
                    }
                    packed = (c << 16) | a;
                    data = edgeMap.get(key);
                    if (data === undefined) {
                        edgeMap.set(key, packed);
                    }
                    else if (data !== null) {
                        edgeMap.set(key, null);
                    }
                }
                boundaryEdges = [];
                for (const packedEdge of edgeMap.values()) {
                    if (packedEdge === null)
                        continue;
                    boundaryEdges.push(packedEdge >>> 16, packedEdge & 0xffff);
                }
                sideEdgeCount = boundaryEdges.length >> 1;
            }
        }
        const sideVertexCount = sideEdgeCount * 4;
        const baseVertexCount = depth === 0 ? numPoints : numPoints * 2;
        const vertexCount = baseVertexCount + sideVertexCount;
        const vertices = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const indexCount = depth === 0
            ? triangleIndices.length
            : triangleIndices.length * 2 + sideEdgeCount * 6;
        const indices = new Uint32Array(indexCount);
        if (depth === 0) {
            for (let p = 0, vPos = 0; p < pointLen; p += 2, vPos += 3) {
                vertices[vPos] = points[p];
                vertices[vPos + 1] = points[p + 1];
                vertices[vPos + 2] = 0;
                normals[vPos] = 0;
                normals[vPos + 1] = 0;
                normals[vPos + 2] = 1;
            }
            indices.set(triangleIndices);
            return { vertices, normals, indices };
        }
        const minBackOffset = unitsPerEm * 0.000025;
        const backZ = depth <= minBackOffset ? minBackOffset : depth;
        const backOffset = numPoints * 3;
        for (let p = 0, vi = 0, base0 = 0; p < pointLen; p += 2, vi++, base0 += 3) {
            const x = points[p];
            const y = points[p + 1];
            // Cap at z=0
            vertices[base0] = x;
            vertices[base0 + 1] = y;
            vertices[base0 + 2] = 0;
            normals[base0] = 0;
            normals[base0 + 1] = 0;
            normals[base0 + 2] = -1;
            // Cap at z=depth
            const baseD = base0 + backOffset;
            vertices[baseD] = x;
            vertices[baseD + 1] = y;
            vertices[baseD + 2] = backZ;
            normals[baseD] = 0;
            normals[baseD + 1] = 0;
            normals[baseD + 2] = 1;
        }
        // Front cap faces -Z, reverse winding from libtess CCW output
        const triLen = triangleIndices.length;
        for (let i = 0; i < triLen; i++) {
            indices[i] = triangleIndices[triLen - 1 - i];
        }
        // Back cap faces +Z, use original winding
        for (let i = 0; i < triLen; i++) {
            indices[triLen + i] = triangleIndices[i] + numPoints;
        }
        let nextVertex = numPoints * 2;
        let idxPos = triLen * 2;
        if (useContours) {
            for (const contour of contours) {
                const contourLen = contour.length;
                if (contourLen < 4)
                    continue;
                for (let i = 0; i < contourLen - 2; i += 2) {
                    const p0x = contour[i];
                    const p0y = contour[i + 1];
                    const p1x = contour[i + 2];
                    const p1y = contour[i + 3];
                    const ex = p1x - p0x;
                    const ey = p1y - p0y;
                    const lenSq = ex * ex + ey * ey;
                    let nx = 0;
                    let ny = 0;
                    if (lenSq > 1e-10) {
                        const invLen = 1 / Math.sqrt(lenSq);
                        nx = ey * invLen;
                        ny = -ex * invLen;
                    }
                    const base = nextVertex * 3;
                    vertices[base] = p0x;
                    vertices[base + 1] = p0y;
                    vertices[base + 2] = 0;
                    vertices[base + 3] = p1x;
                    vertices[base + 4] = p1y;
                    vertices[base + 5] = 0;
                    vertices[base + 6] = p0x;
                    vertices[base + 7] = p0y;
                    vertices[base + 8] = backZ;
                    vertices[base + 9] = p1x;
                    vertices[base + 10] = p1y;
                    vertices[base + 11] = backZ;
                    normals[base] = nx;
                    normals[base + 1] = ny;
                    normals[base + 2] = 0;
                    normals[base + 3] = nx;
                    normals[base + 4] = ny;
                    normals[base + 5] = 0;
                    normals[base + 6] = nx;
                    normals[base + 7] = ny;
                    normals[base + 8] = 0;
                    normals[base + 9] = nx;
                    normals[base + 10] = ny;
                    normals[base + 11] = 0;
                    const baseVertex = nextVertex;
                    indices[idxPos] = baseVertex;
                    indices[idxPos + 1] = baseVertex + 1;
                    indices[idxPos + 2] = baseVertex + 2;
                    indices[idxPos + 3] = baseVertex + 1;
                    indices[idxPos + 4] = baseVertex + 3;
                    indices[idxPos + 5] = baseVertex + 2;
                    idxPos += 6;
                    nextVertex += 4;
                }
            }
        }
        else {
            for (let e = 0; e < sideEdgeCount; e++) {
                const edgeIndex = e << 1;
                const u = boundaryEdges[edgeIndex];
                const v = boundaryEdges[edgeIndex + 1];
                const u2 = u << 1;
                const v2 = v << 1;
                const p0x = points[u2];
                const p0y = points[u2 + 1];
                const p1x = points[v2];
                const p1y = points[v2 + 1];
                const ex = p1x - p0x;
                const ey = p1y - p0y;
                const lenSq = ex * ex + ey * ey;
                let nx = 0;
                let ny = 0;
                if (lenSq > 1e-10) {
                    const invLen = 1 / Math.sqrt(lenSq);
                    nx = ey * invLen;
                    ny = -ex * invLen;
                }
                const base = nextVertex * 3;
                vertices[base] = p0x;
                vertices[base + 1] = p0y;
                vertices[base + 2] = 0;
                vertices[base + 3] = p1x;
                vertices[base + 4] = p1y;
                vertices[base + 5] = 0;
                vertices[base + 6] = p0x;
                vertices[base + 7] = p0y;
                vertices[base + 8] = backZ;
                vertices[base + 9] = p1x;
                vertices[base + 10] = p1y;
                vertices[base + 11] = backZ;
                normals[base] = nx;
                normals[base + 1] = ny;
                normals[base + 2] = 0;
                normals[base + 3] = nx;
                normals[base + 4] = ny;
                normals[base + 5] = 0;
                normals[base + 6] = nx;
                normals[base + 7] = ny;
                normals[base + 8] = 0;
                normals[base + 9] = nx;
                normals[base + 10] = ny;
                normals[base + 11] = 0;
                const baseVertex = nextVertex;
                indices[idxPos] = baseVertex;
                indices[idxPos + 1] = baseVertex + 1;
                indices[idxPos + 2] = baseVertex + 2;
                indices[idxPos + 3] = baseVertex + 1;
                indices[idxPos + 4] = baseVertex + 3;
                indices[idxPos + 5] = baseVertex + 2;
                idxPos += 6;
                nextVertex += 4;
            }
        }
        return { vertices, normals, indices };
    }
}

const OVERLAP_EPSILON = 1e-3;
class BoundaryClusterer {
    constructor() { }
    cluster(glyphContoursList, positions) {
        perfLogger.start('BoundaryClusterer.cluster', {
            glyphCount: glyphContoursList.length
        });
        const n = glyphContoursList.length;
        if (n === 0) {
            perfLogger.end('BoundaryClusterer.cluster');
            return [];
        }
        if (n === 1) {
            perfLogger.end('BoundaryClusterer.cluster');
            return [[0]];
        }
        const result = this.clusterSweepLine(glyphContoursList, positions);
        perfLogger.end('BoundaryClusterer.cluster');
        return result;
    }
    clusterSweepLine(glyphContoursList, positions) {
        const n = glyphContoursList.length;
        const bounds = new Array(n);
        const events = new Array(2 * n);
        let eventIndex = 0;
        for (let i = 0; i < n; i++) {
            bounds[i] = this.getWorldBounds(glyphContoursList[i], positions[i]);
            events[eventIndex++] = [bounds[i].minX, 0, i];
            events[eventIndex++] = [bounds[i].maxX, 1, i];
        }
        events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const parent = Array.from({ length: n }, (_, i) => i);
        const rank = new Array(n).fill(0);
        function find(x) {
            return parent[x] === x ? x : (parent[x] = find(parent[x]));
        }
        function union(x, y) {
            const px = find(x);
            const py = find(y);
            if (px === py)
                return;
            if (rank[px] < rank[py]) {
                parent[px] = py;
            }
            else if (rank[px] > rank[py]) {
                parent[py] = px;
            }
            else {
                parent[py] = px;
                rank[px]++;
            }
        }
        const active = new Set();
        for (const [, eventType, glyphIndex] of events) {
            if (eventType === 0) {
                const bounds1 = bounds[glyphIndex];
                for (const activeIndex of active) {
                    const bounds2 = bounds[activeIndex];
                    if (bounds1.minY < bounds2.maxY + OVERLAP_EPSILON &&
                        bounds1.maxY > bounds2.minY - OVERLAP_EPSILON) {
                        union(glyphIndex, activeIndex);
                    }
                }
                active.add(glyphIndex);
            }
            else {
                active.delete(glyphIndex);
            }
        }
        const clusters = new Map();
        for (let i = 0; i < n; i++) {
            const root = find(i);
            let list = clusters.get(root);
            if (!list) {
                list = [];
                clusters.set(root, list);
            }
            list.push(i);
        }
        return Array.from(clusters.values());
    }
    getWorldBounds(contours, position) {
        return {
            minX: contours.bounds.min.x + position.x,
            minY: contours.bounds.min.y + position.y,
            maxX: contours.bounds.max.x + position.x,
            maxY: contours.bounds.max.y + position.y
        };
    }
}

const DEFAULT_OPTIMIZATION_CONFIG = {
    enabled: true,
    areaThreshold: 1.0
};
// Scratch buffers reused across calls. Grown on demand, never shrunk
let _cap = 1024;
let _px = new Float64Array(_cap);
let _py = new Float64Array(_cap);
let _area = new Float64Array(_cap);
let _prev = new Int32Array(_cap);
let _next = new Int32Array(_cap);
let _heap = new Int32Array(_cap);
let _hpos = new Int32Array(_cap);
function ensureCap(n) {
    if (n <= _cap)
        return;
    _cap = 1;
    while (_cap < n)
        _cap <<= 1;
    _px = new Float64Array(_cap);
    _py = new Float64Array(_cap);
    _area = new Float64Array(_cap);
    _prev = new Int32Array(_cap);
    _next = new Int32Array(_cap);
    _heap = new Int32Array(_cap);
    _hpos = new Int32Array(_cap);
}
class PathOptimizer {
    constructor(config) {
        this.stats = {
            pointsRemovedByVisvalingam: 0,
            originalPointCount: 0
        };
        this.config = config;
    }
    setConfig(config) {
        this.config = config;
    }
    optimizePath(path) {
        const points = path.points;
        const n = points.length;
        if (n < 5 || !this.config.enabled) {
            if (this.config.enabled)
                this.stats.originalPointCount += n;
            return path;
        }
        this.stats.originalPointCount += n;
        const removed = simplifyVW(points, n, this.config.areaThreshold);
        if (removed === 0)
            return path;
        this.stats.pointsRemovedByVisvalingam += removed;
        const result = new Array(n - removed);
        let idx = 0;
        let out = 0;
        while (idx >= 0) {
            result[out++] = points[idx];
            idx = _next[idx];
        }
        return { ...path, points: result };
    }
    getStats() {
        return { ...this.stats };
    }
    resetStats() {
        this.stats = {
            pointsRemovedByVisvalingam: 0,
            originalPointCount: 0
        };
    }
}
// Visvalingam-Whyatt simplification. Iteratively removes the point
// whose removal causes the smallest change in contour area (measured
// as the triangle formed with its two neighbors) until all remaining
// triangles exceed areaThreshold
//
// Uses parallel typed arrays for the linked list and a binary min-heap
// with an index-based position map for O(log n) extract and update.
// Coordinates are flattened into Float64Array to keep area computation
// on contiguous memory. Areas are stored as 2x actual (skipping the
// shoelace /2) and the threshold is doubled to match
//
// Returns the number of points removed. The caller reads _next[] to
// walk the surviving linked list
function simplifyVW(points, n, areaThreshold) {
    if (n <= 3)
        return 0;
    ensureCap(n);
    const px = _px;
    const py = _py;
    const area = _area;
    const prev = _prev;
    const next = _next;
    const heap = _heap;
    const hpos = _hpos;
    // Flatten coordinates and initialize doubly-linked list
    for (let i = 0; i < n; i++) {
        const p = points[i];
        px[i] = p.x;
        py[i] = p.y;
        prev[i] = i - 1;
        next[i] = i + 1;
    }
    next[n - 1] = -1;
    // Compute triangle areas for interior points and seed the heap
    const heapLen0 = n - 2;
    area[0] = Infinity;
    area[n - 1] = Infinity;
    for (let i = 1; i < n - 1; i++) {
        area[i] = area2x(px, py, i - 1, i, i + 1);
        heap[i - 1] = i;
        hpos[i] = i - 1;
    }
    hpos[0] = -1;
    hpos[n - 1] = -1;
    // Bottom-up heapify, O(n)
    let heapLen = heapLen0;
    for (let i = (heapLen >> 1) - 1; i >= 0; i--) {
        siftDown(heap, hpos, area, i, heapLen);
    }
    const threshold2x = areaThreshold * 2;
    const maxRemovals = n - 3;
    let removed = 0;
    while (heapLen > 0 && removed < maxRemovals) {
        const minIdx = heap[0];
        if (area[minIdx] > threshold2x)
            break;
        // Extract min
        heapLen--;
        if (heapLen > 0) {
            const last = heap[heapLen];
            heap[0] = last;
            hpos[last] = 0;
            siftDown(heap, hpos, area, 0, heapLen);
        }
        hpos[minIdx] = -1;
        // Unlink
        const pi = prev[minIdx];
        const ni = next[minIdx];
        if (pi >= 0)
            next[pi] = ni;
        if (ni >= 0)
            prev[ni] = pi;
        removed++;
        // Recompute prev neighbor's area and update heap position
        if (pi >= 0 && prev[pi] >= 0) {
            const oldArea = area[pi];
            const newArea = area2x(px, py, prev[pi], pi, ni);
            area[pi] = newArea;
            const pos = hpos[pi];
            if (pos >= 0) {
                if (newArea < oldArea)
                    siftUp(heap, hpos, area, pos);
                else if (newArea > oldArea)
                    siftDown(heap, hpos, area, pos, heapLen);
            }
        }
        // Same for next neighbor
        if (ni >= 0 && next[ni] >= 0) {
            const oldArea = area[ni];
            const newArea = area2x(px, py, pi, ni, next[ni]);
            area[ni] = newArea;
            const pos = hpos[ni];
            if (pos >= 0) {
                if (newArea < oldArea)
                    siftUp(heap, hpos, area, pos);
                else if (newArea > oldArea)
                    siftDown(heap, hpos, area, pos, heapLen);
            }
        }
    }
    return removed;
}
function siftUp(heap, hpos, area, i) {
    const idx = heap[i];
    const val = area[idx];
    while (i > 0) {
        const parent = (i - 1) >> 1;
        const pidx = heap[parent];
        if (area[pidx] <= val)
            break;
        heap[i] = pidx;
        hpos[pidx] = i;
        i = parent;
    }
    heap[i] = idx;
    hpos[idx] = i;
}
function siftDown(heap, hpos, area, i, len) {
    const idx = heap[i];
    const val = area[idx];
    const half = len >> 1;
    while (i < half) {
        let child = (i << 1) + 1;
        let childIdx = heap[child];
        let childVal = area[childIdx];
        const right = child + 1;
        if (right < len) {
            const rIdx = heap[right];
            const rVal = area[rIdx];
            if (rVal < childVal) {
                child = right;
                childIdx = rIdx;
                childVal = rVal;
            }
        }
        if (childVal >= val)
            break;
        heap[i] = childIdx;
        hpos[childIdx] = i;
        i = child;
    }
    heap[i] = idx;
    hpos[idx] = i;
}
// Doubled triangle area via the shoelace formula. Skipping the /2
// means callers compare against a doubled threshold instead
function area2x(px, py, i1, i2, i3) {
    const v = px[i1] * (py[i2] - py[i3]) +
        px[i2] * (py[i3] - py[i1]) +
        px[i3] * (py[i1] - py[i2]);
    return v < 0 ? -v : v;
}

/**
 * @license
 * Anti-Grain Geometry - Version 2.4
 * Copyright (C) 2002-2005 Maxim Shemanarev (McSeem)
 *
 * This software is a partial port of the AGG library, specifically the adaptive
 * subdivision algorithm for polygonization. The original software was available
 * at http://www.antigrain.com and was distributed under the BSD 3-Clause License
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *
 * 3. The name of the author may not be used to endorse or promote
 *    products derived from this software without specific prior
 *    written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
const DEFAULT_CURVE_FIDELITY = {
    distanceTolerance: 0.5,
    angleTolerance: 0.2,
    cuspLimit: 0,
    collinearityEpsilon: 1e-6,
    recursionLimit: 16
};
const COLLINEARITY_EPSILON = DEFAULT_CURVE_FIDELITY.collinearityEpsilon;
// Module-level state for the recursive subdivision functions,
// set from instance config before each polygonize call
// Output array, reset before each polygonize call
let _out;
// Cached tolerance state
let _distTolSq = 0;
let _colEps = 0;
let _maxLvl = 0;
let _angleTol = 0;
let _tanAngSq = 0;
let _cuspLim = 0;
let _tanCuspSq = 0;
// Collinearity checks in the recursive core prevent near-duplicate points
function emit(x, y) {
    _out.push(new Vec2(x, y));
}
// Quadratic recursive subdivision (AGG curve3_div)
function quadRec(x1, y1, x2, y2, x3, y3, level) {
    if (level > _maxLvl)
        return;
    const x12 = (x1 + x2) * 0.5;
    const y12 = (y1 + y2) * 0.5;
    const x23 = (x2 + x3) * 0.5;
    const y23 = (y2 + y3) * 0.5;
    const x123 = (x12 + x23) * 0.5;
    const y123 = (y12 + y23) * 0.5;
    const dx = x3 - x1;
    const dy = y3 - y1;
    let d = Math.abs((x2 - x3) * dy - (y2 - y3) * dx);
    if (d > _colEps) {
        if (d * d <= _distTolSq * (dx * dx + dy * dy)) {
            if (_angleTol > 0) {
                const v1x = x2 - x1;
                const v1y = y2 - y1;
                const v2x = x3 - x2;
                const v2y = y3 - y2;
                const cross = v1x * v2y - v1y * v2x;
                const dot = v1x * v2x + v1y * v2y;
                if (dot > 0 && cross * cross < _tanAngSq * dot * dot) {
                    emit(x123, y123);
                    return;
                }
            }
            else {
                emit(x123, y123);
                return;
            }
        }
    }
    else {
        let da = dx * dx + dy * dy;
        if (da === 0) {
            d = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        }
        else {
            d = ((x2 - x1) * dx + (y2 - y1) * dy) / da;
            if (d > 0 && d < 1)
                return;
            if (d <= 0)
                d = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
            else if (d >= 1)
                d = (x2 - x3) * (x2 - x3) + (y2 - y3) * (y2 - y3);
            else {
                const px = x1 + d * dx;
                const py = y1 + d * dy;
                d = (x2 - px) * (x2 - px) + (y2 - py) * (y2 - py);
            }
        }
        if (d < _distTolSq) {
            emit(x2, y2);
            return;
        }
    }
    const nl = level + 1;
    quadRec(x1, y1, x12, y12, x123, y123, nl);
    quadRec(x123, y123, x23, y23, x3, y3, nl);
}
// Cubic recursive subdivision (AGG curve4_div)
// cubicBegin handles level 0, which always subdivides
function cubicBegin(x1, y1, x2, y2, x3, y3, x4, y4) {
    const x12 = (x1 + x2) * 0.5;
    const y12 = (y1 + y2) * 0.5;
    const x23 = (x2 + x3) * 0.5;
    const y23 = (y2 + y3) * 0.5;
    const x34 = (x3 + x4) * 0.5;
    const y34 = (y3 + y4) * 0.5;
    const x123 = (x12 + x23) * 0.5;
    const y123 = (y12 + y23) * 0.5;
    const x234 = (x23 + x34) * 0.5;
    const y234 = (y23 + y34) * 0.5;
    const x1234 = (x123 + x234) * 0.5;
    const y1234 = (y123 + y234) * 0.5;
    cubicRec(x1, y1, x12, y12, x123, y123, x1234, y1234, 1);
    cubicRec(x1234, y1234, x234, y234, x34, y34, x4, y4, 1);
}
function cubicRec(x1, y1, x2, y2, x3, y3, x4, y4, level) {
    if (level > _maxLvl)
        return;
    const x12 = (x1 + x2) * 0.5;
    const y12 = (y1 + y2) * 0.5;
    const x23 = (x2 + x3) * 0.5;
    const y23 = (y2 + y3) * 0.5;
    const x34 = (x3 + x4) * 0.5;
    const y34 = (y3 + y4) * 0.5;
    const x123 = (x12 + x23) * 0.5;
    const y123 = (y12 + y23) * 0.5;
    const x234 = (x23 + x34) * 0.5;
    const y234 = (y23 + y34) * 0.5;
    const x1234 = (x123 + x234) * 0.5;
    const y1234 = (y123 + y234) * 0.5;
    const dx = x4 - x1;
    const dy = y4 - y1;
    let d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx);
    let d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx);
    const sc = (d2 > _colEps ? 2 : 0) + (d3 > _colEps ? 1 : 0);
    switch (sc) {
        case 0: {
            let k = dx * dx + dy * dy;
            if (k === 0) {
                d2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
                d3 = (x3 - x1) * (x3 - x1) + (y3 - y1) * (y3 - y1);
            }
            else {
                k = 1 / k;
                let t1 = x2 - x1;
                let t2 = y2 - y1;
                d2 = k * (t1 * dx + t2 * dy);
                t1 = x3 - x1;
                t2 = y3 - y1;
                d3 = k * (t1 * dx + t2 * dy);
                if (d2 > 0 && d2 < 1 && d3 > 0 && d3 < 1)
                    return;
                if (d2 <= 0)
                    d2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
                else if (d2 >= 1)
                    d2 = (x2 - x4) * (x2 - x4) + (y2 - y4) * (y2 - y4);
                else {
                    const px = x1 + d2 * dx, py = y1 + d2 * dy;
                    d2 = (x2 - px) * (x2 - px) + (y2 - py) * (y2 - py);
                }
                if (d3 <= 0)
                    d3 = (x3 - x1) * (x3 - x1) + (y3 - y1) * (y3 - y1);
                else if (d3 >= 1)
                    d3 = (x3 - x4) * (x3 - x4) + (y3 - y4) * (y3 - y4);
                else {
                    const px = x1 + d3 * dx, py = y1 + d3 * dy;
                    d3 = (x3 - px) * (x3 - px) + (y3 - py) * (y3 - py);
                }
            }
            if (d2 > d3) {
                if (d2 < _distTolSq) {
                    emit(x2, y2);
                    return;
                }
            }
            else {
                if (d3 < _distTolSq) {
                    emit(x3, y3);
                    return;
                }
            }
            break;
        }
        case 1:
            if (d3 * d3 <= _distTolSq * (dx * dx + dy * dy)) {
                if (_angleTol > 0) {
                    const v1x = x3 - x2, v1y = y3 - y2;
                    const v2x = x4 - x3, v2y = y4 - y3;
                    const cross = v1x * v2y - v1y * v2x;
                    const dot = v1x * v2x + v1y * v2y;
                    if (dot > 0 && cross * cross < _tanAngSq * dot * dot) {
                        emit(x2, y2);
                        emit(x3, y3);
                        return;
                    }
                    if (_cuspLim > 0 &&
                        (dot <= 0 || cross * cross > _tanCuspSq * dot * dot)) {
                        emit(x3, y3);
                        return;
                    }
                }
                else {
                    emit(x23, y23);
                    return;
                }
            }
            break;
        case 2:
            if (d2 * d2 <= _distTolSq * (dx * dx + dy * dy)) {
                if (_angleTol > 0) {
                    const v1x = x2 - x1, v1y = y2 - y1;
                    const v2x = x3 - x2, v2y = y3 - y2;
                    const cross = v1x * v2y - v1y * v2x;
                    const dot = v1x * v2x + v1y * v2y;
                    if (dot > 0 && cross * cross < _tanAngSq * dot * dot) {
                        emit(x2, y2);
                        emit(x3, y3);
                        return;
                    }
                    if (_cuspLim > 0 &&
                        (dot <= 0 || cross * cross > _tanCuspSq * dot * dot)) {
                        emit(x2, y2);
                        return;
                    }
                }
                else {
                    emit(x23, y23);
                    return;
                }
            }
            break;
        case 3: {
            if ((d2 + d3) * (d2 + d3) <= _distTolSq * (dx * dx + dy * dy)) {
                if (_angleTol > 0) {
                    const a1x = x2 - x1, a1y = y2 - y1;
                    const a2x = x3 - x2, a2y = y3 - y2;
                    const c1 = a1x * a2y - a1y * a2x;
                    const dot1 = a1x * a2x + a1y * a2y;
                    const b2x = x4 - x3, b2y = y4 - y3;
                    const c2 = a2x * b2y - a2y * b2x;
                    const dot2 = a2x * b2x + a2y * b2y;
                    // Sum of unsigned angles via tangent addition identity
                    if (dot1 > 0 && dot2 > 0) {
                        const ac1 = c1 < 0 ? -c1 : c1;
                        const ac2 = c2 < 0 ? -c2 : c2;
                        const cc = ac1 * dot2 + ac2 * dot1;
                        const cd = dot1 * dot2 - ac1 * ac2;
                        if (cd > 0 && cc * cc < _tanAngSq * cd * cd) {
                            emit(x23, y23);
                            return;
                        }
                    }
                    if (_cuspLim > 0) {
                        if (dot1 <= 0 || c1 * c1 > _tanCuspSq * dot1 * dot1) {
                            emit(x2, y2);
                            return;
                        }
                        if (dot2 <= 0 || c2 * c2 > _tanCuspSq * dot2 * dot2) {
                            emit(x3, y3);
                            return;
                        }
                    }
                }
                else {
                    emit(x23, y23);
                    return;
                }
            }
            break;
        }
    }
    const nl = level + 1;
    cubicRec(x1, y1, x12, y12, x123, y123, x1234, y1234, nl);
    cubicRec(x1234, y1234, x234, y234, x34, y34, x4, y4, nl);
}
class Polygonizer {
    constructor(curveFidelityConfig) {
        this.curveSteps = null;
        // Precomputed tolerances
        this._distTolSq = 0;
        this._angleTol = 0;
        this._tanAngSq = 0;
        this._cuspLim = 0;
        this._tanCuspSq = 0;
        this._colEps = 0;
        this._maxLvl = 0;
        this.curveFidelityConfig = {
            ...DEFAULT_CURVE_FIDELITY,
            ...curveFidelityConfig
        };
        this.precompute();
    }
    setCurveFidelityConfig(curveFidelityConfig) {
        this.curveFidelityConfig = {
            ...DEFAULT_CURVE_FIDELITY,
            ...curveFidelityConfig
        };
        this.precompute();
    }
    precompute() {
        const c = this.curveFidelityConfig;
        const dt = c.distanceTolerance ?? DEFAULT_CURVE_FIDELITY.distanceTolerance;
        this._distTolSq = dt * dt;
        this._angleTol = c.angleTolerance ?? DEFAULT_CURVE_FIDELITY.angleTolerance;
        this._tanAngSq = this._angleTol > 0
            ? Math.tan(this._angleTol) ** 2 : 0;
        this._cuspLim = c.cuspLimit ?? 0;
        this._tanCuspSq = this._cuspLim > 0
            ? Math.tan(this._cuspLim) ** 2 : 0;
        this._colEps = c.collinearityEpsilon ?? DEFAULT_CURVE_FIDELITY.collinearityEpsilon;
        this._maxLvl = c.recursionLimit ?? DEFAULT_CURVE_FIDELITY.recursionLimit;
    }
    // Set module-level state from instance tolerances
    activate() {
        _distTolSq = this._distTolSq;
        _angleTol = this._angleTol;
        _tanAngSq = this._tanAngSq;
        _cuspLim = this._cuspLim;
        _tanCuspSq = this._tanCuspSq;
        _colEps = this._colEps;
        _maxLvl = this._maxLvl;
        _out = [];
    }
    // Fixed-step subdivision; overrides adaptive curveFidelity when set
    setCurveSteps(curveSteps) {
        if (curveSteps === undefined || curveSteps === null) {
            this.curveSteps = null;
            return;
        }
        if (!Number.isFinite(curveSteps)) {
            this.curveSteps = null;
            return;
        }
        const stepsInt = Math.round(curveSteps);
        this.curveSteps = stepsInt >= 1 ? stepsInt : null;
    }
    polygonizeQuadratic(start, control, end) {
        if (this.curveSteps !== null) {
            return this.polygonizeQuadraticFixedSteps(start, control, end, this.curveSteps);
        }
        this.activate();
        quadRec(start.x, start.y, control.x, control.y, end.x, end.y, 0);
        emit(end.x, end.y);
        return _out;
    }
    polygonizeCubic(start, control1, control2, end) {
        if (this.curveSteps !== null) {
            return this.polygonizeCubicFixedSteps(start, control1, control2, end, this.curveSteps);
        }
        this.activate();
        cubicBegin(start.x, start.y, control1.x, control1.y, control2.x, control2.y, end.x, end.y);
        emit(end.x, end.y);
        return _out;
    }
    polygonizeQuadraticFixedSteps(start, control, end, steps) {
        this.activate();
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x12 = start.x + (control.x - start.x) * t;
            const y12 = start.y + (control.y - start.y) * t;
            const x23 = control.x + (end.x - control.x) * t;
            const y23 = control.y + (end.y - control.y) * t;
            emit(x12 + (x23 - x12) * t, y12 + (y23 - y12) * t);
        }
        return _out;
    }
    polygonizeCubicFixedSteps(start, control1, control2, end, steps) {
        this.activate();
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x12 = start.x + (control1.x - start.x) * t;
            const y12 = start.y + (control1.y - start.y) * t;
            const x23 = control1.x + (control2.x - control1.x) * t;
            const y23 = control1.y + (control2.y - control1.y) * t;
            const x34 = control2.x + (end.x - control2.x) * t;
            const y34 = control2.y + (end.y - control2.y) * t;
            const x123 = x12 + (x23 - x12) * t;
            const y123 = y12 + (y23 - y12) * t;
            const x234 = x23 + (x34 - x23) * t;
            const y234 = y23 + (y34 - y23) * t;
            emit(x123 + (x234 - x123) * t, y123 + (y234 - y123) * t);
        }
        return _out;
    }
}

class GlyphContourCollector {
    constructor(curveFidelityConfig, optimizationConfig) {
        this.currentGlyphId = 0;
        this.currentTextIndex = 0;
        this.currentGlyphPaths = [];
        this.currentPath = null;
        this.currentPoint = null;
        this.currentGlyphBounds = {
            min: new Vec2(Infinity, Infinity),
            max: new Vec2(-Infinity, -Infinity)
        };
        this.collectedGlyphs = [];
        this.glyphPositions = [];
        this.glyphTextIndices = [];
        this.currentPosition = new Vec2(0, 0);
        this.polygonizer = new Polygonizer(curveFidelityConfig);
        this.pathOptimizer = new PathOptimizer({
            ...DEFAULT_OPTIMIZATION_CONFIG,
            ...optimizationConfig
        });
    }
    setPosition(x, y) {
        this.currentPosition.set(x, y);
    }
    updatePosition(dx, dy) {
        this.currentPosition.x += dx;
        this.currentPosition.y += dy;
    }
    beginGlyph(glyphId, textIndex) {
        if (this.currentGlyphPaths.length > 0) {
            this.finishGlyph();
        }
        this.currentGlyphId = glyphId;
        this.currentTextIndex = textIndex;
        this.currentGlyphPaths = [];
        this.currentGlyphBounds.min.set(Infinity, Infinity);
        this.currentGlyphBounds.max.set(-Infinity, -Infinity);
        // Record position for this glyph
        this.glyphPositions.push(this.currentPosition.clone());
        // Time polygonization + path optimization per glyph
        perfLogger.start('Glyph.polygonizeAndOptimize', {
            glyphId,
            textIndex
        });
    }
    finishGlyph() {
        if (this.currentPath) {
            this.finishPath();
        }
        if (this.currentGlyphPaths.length > 0) {
            this.collectedGlyphs.push({
                glyphId: this.currentGlyphId,
                paths: this.currentGlyphPaths,
                bounds: {
                    min: {
                        x: this.currentGlyphBounds.min.x,
                        y: this.currentGlyphBounds.min.y
                    },
                    max: {
                        x: this.currentGlyphBounds.max.x,
                        y: this.currentGlyphBounds.max.y
                    }
                }
            });
            // Track textIndex separately
            this.glyphTextIndices.push(this.currentTextIndex);
        }
        // Stop timing for this glyph (even if it ended up empty)
        perfLogger.end('Glyph.polygonizeAndOptimize');
        this.currentGlyphPaths = [];
    }
    onMoveTo(x, y) {
        if (this.currentPath) {
            this.finishPath();
        }
        this.currentPoint = new Vec2(x, y);
        this.updateBounds(this.currentPoint);
        this.currentPath = {
            points: [this.currentPoint],
            glyphIndex: this.currentGlyphId
        };
    }
    onLineTo(x, y) {
        if (!this.currentPath || !this.currentPoint)
            return;
        const point = new Vec2(x, y);
        this.updateBounds(point);
        this.currentPath.points.push(point);
        this.currentPoint = point;
    }
    onQuadTo(cx, cy, x, y) {
        if (!this.currentPath || !this.currentPoint)
            return;
        const start = this.currentPoint;
        const control = new Vec2(cx, cy);
        const end = new Vec2(x, y);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const d = Math.abs((control.x - end.x) * dy - (control.y - end.y) * dx);
        if (d < COLLINEARITY_EPSILON) {
            this.onLineTo(x, y);
            return;
        }
        const flattenedPoints = this.polygonizer.polygonizeQuadratic(start, control, end);
        for (let i = 0; i < flattenedPoints.length; i++) {
            const pt = flattenedPoints[i];
            this.updateBounds(pt);
            this.currentPath.points.push(pt);
        }
        this.currentPoint = end;
    }
    onCubicTo(c1x, c1y, c2x, c2y, x, y) {
        if (!this.currentPath || !this.currentPoint)
            return;
        const start = this.currentPoint;
        const control1 = new Vec2(c1x, c1y);
        const control2 = new Vec2(c2x, c2y);
        const end = new Vec2(x, y);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const d1 = Math.abs((control1.x - end.x) * dy - (control1.y - end.y) * dx);
        const d2 = Math.abs((control2.x - end.x) * dy - (control2.y - end.y) * dx);
        if (d1 < COLLINEARITY_EPSILON && d2 < COLLINEARITY_EPSILON) {
            this.onLineTo(x, y);
            return;
        }
        const flattenedPoints = this.polygonizer.polygonizeCubic(start, control1, control2, end);
        for (let i = 0; i < flattenedPoints.length; i++) {
            const pt = flattenedPoints[i];
            this.updateBounds(pt);
            this.currentPath.points.push(pt);
        }
        this.currentPoint = end;
    }
    onClosePath() {
        if (!this.currentPath || !this.currentPoint)
            return;
        const firstPoint = this.currentPath.points[0];
        if (!this.currentPoint.equals(firstPoint)) {
            this.currentPath.points.push(firstPoint);
        }
        this.finishPath();
    }
    finishPath() {
        if (this.currentPath) {
            const path = this.pathOptimizer.optimizePath(this.currentPath);
            this.currentGlyphPaths.push(path);
            this.currentPath = null;
            this.currentPoint = null;
        }
    }
    updateBounds(point) {
        this.currentGlyphBounds.min.x = Math.min(this.currentGlyphBounds.min.x, point.x);
        this.currentGlyphBounds.min.y = Math.min(this.currentGlyphBounds.min.y, point.y);
        this.currentGlyphBounds.max.x = Math.max(this.currentGlyphBounds.max.x, point.x);
        this.currentGlyphBounds.max.y = Math.max(this.currentGlyphBounds.max.y, point.y);
    }
    getCollectedGlyphs() {
        // Finish any pending glyph
        if (this.currentGlyphPaths.length > 0) {
            this.finishGlyph();
        }
        return this.collectedGlyphs;
    }
    getGlyphPositions() {
        return this.glyphPositions;
    }
    getTextIndices() {
        return this.glyphTextIndices;
    }
    reset() {
        this.collectedGlyphs = [];
        this.glyphPositions = [];
        this.glyphTextIndices = [];
        this.currentGlyphPaths = [];
        this.currentPath = null;
        this.currentPoint = null;
        this.currentGlyphId = 0;
        this.currentTextIndex = 0;
        this.currentPosition.set(0, 0);
        this.currentGlyphBounds = {
            min: new Vec2(Infinity, Infinity),
            max: new Vec2(-Infinity, -Infinity)
        };
    }
    setCurveFidelityConfig(config) {
        this.polygonizer.setCurveFidelityConfig(config);
    }
    setCurveSteps(curveSteps) {
        this.polygonizer.setCurveSteps(curveSteps);
    }
    setGeometryOptimization(options) {
        this.pathOptimizer.setConfig({
            ...DEFAULT_OPTIMIZATION_CONFIG,
            ...options
        });
    }
    getOptimizationStats() {
        return this.pathOptimizer.getStats();
    }
}

class DrawCallbackHandler {
    constructor() {
        this.moveTo_func = null;
        this.lineTo_func = null;
        this.quadTo_func = null;
        this.cubicTo_func = null;
        this.closePath_func = null;
        this.drawFuncsPtr = 0;
        this.position = { x: 0, y: 0 };
    }
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        if (this.collector) {
            this.collector.setPosition(x, y);
        }
    }
    updatePosition(dx, dy) {
        this.position.x += dx;
        this.position.y += dy;
        if (this.collector) {
            this.collector.updatePosition(dx, dy);
        }
    }
    setCollector(collector) {
        this.collector = collector;
    }
    createDrawFuncs(font, collector) {
        if (!font || !font.module || !font.hb) {
            throw new Error('Invalid font object');
        }
        this.collector = collector;
        if (this.drawFuncsPtr) {
            return;
        }
        const module = font.module;
        // Collect contours at origin - position applied during instancing
        this.moveTo_func = module.addFunction((_dfuncs, _draw_data, _draw_state, to_x, to_y) => {
            this.collector?.onMoveTo(to_x, to_y);
        }, 'viiiffi');
        this.lineTo_func = module.addFunction((_dfuncs, _draw_data, _draw_state, to_x, to_y) => {
            this.collector?.onLineTo(to_x, to_y);
        }, 'viiiffi');
        this.quadTo_func = module.addFunction((_dfuncs, _draw_data, _draw_state, c_x, c_y, to_x, to_y) => {
            this.collector?.onQuadTo(c_x, c_y, to_x, to_y);
        }, 'viiiffffi');
        this.cubicTo_func = module.addFunction((_dfuncs, _draw_data, _draw_state, c1_x, c1_y, c2_x, c2_y, to_x, to_y) => {
            this.collector?.onCubicTo(c1_x, c1_y, c2_x, c2_y, to_x, to_y);
        }, 'viiiffffffi');
        this.closePath_func = module.addFunction((_dfuncs, _draw_data, _draw_state) => {
            this.collector?.onClosePath();
        }, 'viiii');
        // Create HarfBuzz draw functions object using the module exports
        this.drawFuncsPtr = module.exports.hb_draw_funcs_create();
        module.exports.hb_draw_funcs_set_move_to_func(this.drawFuncsPtr, this.moveTo_func, 0, 0);
        module.exports.hb_draw_funcs_set_line_to_func(this.drawFuncsPtr, this.lineTo_func, 0, 0);
        module.exports.hb_draw_funcs_set_quadratic_to_func(this.drawFuncsPtr, this.quadTo_func, 0, 0);
        module.exports.hb_draw_funcs_set_cubic_to_func(this.drawFuncsPtr, this.cubicTo_func, 0, 0);
        module.exports.hb_draw_funcs_set_close_path_func(this.drawFuncsPtr, this.closePath_func, 0, 0);
    }
    getDrawFuncsPtr() {
        if (!this.drawFuncsPtr) {
            throw new Error('Draw functions not initialized');
        }
        return this.drawFuncsPtr;
    }
    destroy(font) {
        if (!font || !font.module || !font.hb) {
            return;
        }
        const module = font.module;
        try {
            if (this.drawFuncsPtr) {
                module.exports.hb_draw_funcs_destroy(this.drawFuncsPtr);
                this.drawFuncsPtr = 0;
            }
            if (this.moveTo_func !== null) {
                module.removeFunction(this.moveTo_func);
                this.moveTo_func = null;
            }
            if (this.lineTo_func !== null) {
                module.removeFunction(this.lineTo_func);
                this.lineTo_func = null;
            }
            if (this.quadTo_func !== null) {
                module.removeFunction(this.quadTo_func);
                this.quadTo_func = null;
            }
            if (this.cubicTo_func !== null) {
                module.removeFunction(this.cubicTo_func);
                this.cubicTo_func = null;
            }
            if (this.closePath_func !== null) {
                module.removeFunction(this.closePath_func);
                this.closePath_func = null;
            }
        }
        catch (error) {
            logger.warn('Error destroying draw callbacks:', error);
        }
        this.collector = undefined;
    }
}
// Share a single DrawCallbackHandler per HarfBuzz module to avoid leaking
// wasm function pointers when users create many Text instances
const sharedDrawCallbackHandlers = new WeakMap();
function getSharedDrawCallbackHandler(font) {
    const key = font.module;
    const existing = sharedDrawCallbackHandlers.get(key);
    if (existing)
        return existing;
    const handler = new DrawCallbackHandler();
    sharedDrawCallbackHandlers.set(key, handler);
    return handler;
}

class GlyphGeometryBuilder {
    constructor(cache, loadedFont) {
        this.fontId = 'default';
        this.cacheKeyPrefix = 'default';
        this.emptyGlyphs = new Set();
        this.clusterPositions = [];
        this.clusterContoursScratch = [];
        this.taskScratch = [];
        this.cache = cache;
        this.loadedFont = loadedFont;
        this.tessellator = new Tessellator();
        this.extruder = new Extruder();
        this.clusterer = new BoundaryClusterer();
        this.collector = new GlyphContourCollector();
        this.drawCallbacks = getSharedDrawCallbackHandler(this.loadedFont);
        this.drawCallbacks.createDrawFuncs(this.loadedFont, this.collector);
        this.contourCache = globalContourCache;
        this.wordCache = globalWordCache;
        this.clusteringCache = globalClusteringCache;
    }
    getOptimizationStats() {
        return this.collector.getOptimizationStats();
    }
    setCurveFidelityConfig(config) {
        this.curveFidelityConfig = config;
        this.collector.setCurveFidelityConfig(config);
        this.updateCacheKeyPrefix();
    }
    setCurveSteps(curveSteps) {
        // Normalize: unset for undefined/null/non-finite/<=0
        if (curveSteps === undefined || curveSteps === null) {
            this.curveSteps = undefined;
        }
        else if (!Number.isFinite(curveSteps)) {
            this.curveSteps = undefined;
        }
        else {
            const stepsInt = Math.round(curveSteps);
            this.curveSteps = stepsInt >= 1 ? stepsInt : undefined;
        }
        this.collector.setCurveSteps(this.curveSteps);
        this.updateCacheKeyPrefix();
    }
    setGeometryOptimization(options) {
        this.geometryOptimizationOptions = options;
        this.collector.setGeometryOptimization(options);
        this.updateCacheKeyPrefix();
    }
    setFontId(fontId) {
        this.fontId = fontId;
        this.updateCacheKeyPrefix();
    }
    updateCacheKeyPrefix() {
        this.cacheKeyPrefix = `${this.fontId}__${this.getGeometryConfigSignature()}`;
    }
    getGeometryConfigSignature() {
        const curveSignature = (() => {
            if (this.curveSteps !== undefined) {
                return `cf:steps:${this.curveSteps}`;
            }
            const distanceTolerance = this.curveFidelityConfig?.distanceTolerance ??
                DEFAULT_CURVE_FIDELITY.distanceTolerance;
            const angleTolerance = this.curveFidelityConfig?.angleTolerance ??
                DEFAULT_CURVE_FIDELITY.angleTolerance;
            return `cf:${distanceTolerance.toFixed(4)},${angleTolerance.toFixed(4)}`;
        })();
        const enabled = this.geometryOptimizationOptions?.enabled ??
            DEFAULT_OPTIMIZATION_CONFIG.enabled;
        const areaThreshold = this.geometryOptimizationOptions?.areaThreshold ??
            DEFAULT_OPTIMIZATION_CONFIG.areaThreshold;
        // Use fixed precision to keep cache keys stable and avoid float noise
        return [
            curveSignature,
            `opt:${enabled ? 1 : 0},${areaThreshold.toFixed(4)}`
        ].join('|');
    }
    buildInstancedGeometry(clustersByLine, depth, removeOverlaps, isCFF, scale, separateGlyphs = false, coloredTextIndices) {
        if (isLogEnabled) {
            let wordCount = 0;
            for (let i = 0; i < clustersByLine.length; i++) {
                wordCount += clustersByLine[i].length;
            }
            perfLogger.start('GlyphGeometryBuilder.buildInstancedGeometry', {
                lineCount: clustersByLine.length,
                wordCount,
                depth,
                removeOverlaps
            });
        }
        else {
            perfLogger.start('GlyphGeometryBuilder.buildInstancedGeometry');
        }
        const tasks = this.taskScratch;
        tasks.length = 0;
        let taskCount = 0;
        let totalVertexFloats = 0;
        let totalNormalFloats = 0;
        let totalIndexCount = 0;
        let vertexCursor = 0; // vertex offset (not float offset)
        const pushTask = (data, px, py, pz) => {
            const vertexStart = vertexCursor;
            let task = tasks[taskCount];
            if (task) {
                task.data = data;
                task.px = px;
                task.py = py;
                task.pz = pz;
                task.vertexStart = vertexStart;
            }
            else {
                task = { data, px, py, pz, vertexStart };
                tasks[taskCount] = task;
            }
            taskCount++;
            totalVertexFloats += data.vertices.length;
            totalNormalFloats += data.normals.length;
            totalIndexCount += data.indices.length;
            vertexCursor += data.vertices.length / 3;
            return vertexStart;
        };
        const glyphInfos = [];
        const planeBounds = {
            min: { x: Infinity, y: Infinity, z: 0 },
            max: { x: -Infinity, y: -Infinity, z: depth }
        };
        for (let lineIndex = 0; lineIndex < clustersByLine.length; lineIndex++) {
            const line = clustersByLine[lineIndex];
            for (const cluster of line) {
                const clusterX = cluster.position.x;
                const clusterY = cluster.position.y;
                const clusterZ = cluster.position.z;
                const clusterGlyphContours = [];
                for (const glyph of cluster.glyphs) {
                    clusterGlyphContours.push(this.getContoursForGlyph(glyph.g));
                }
                let boundaryGroups;
                if (cluster.glyphs.length <= 1) {
                    boundaryGroups = [[0]];
                }
                else {
                    // Check clustering cache (same text + glyph IDs + positions = same overlap groups)
                    // Key must be font-specific; glyph ids/bounds differ between fonts
                    // Positions must match since overlap detection depends on relative glyph placement
                    const cacheKey = `${this.cacheKeyPrefix}_${cluster.text}`;
                    const cached = this.clusteringCache.get(cacheKey);
                    let isValid = false;
                    if (cached && cached.glyphIds.length === cluster.glyphs.length) {
                        isValid = true;
                        for (let i = 0; i < cluster.glyphs.length; i++) {
                            const glyph = cluster.glyphs[i];
                            const cachedPos = cached.positions[i];
                            if (cached.glyphIds[i] !== glyph.g ||
                                cachedPos.x !== (glyph.x ?? 0) ||
                                cachedPos.y !== (glyph.y ?? 0)) {
                                isValid = false;
                                break;
                            }
                        }
                    }
                    if (isValid && cached) {
                        boundaryGroups = cached.groups;
                    }
                    else {
                        const glyphCount = cluster.glyphs.length;
                        if (this.clusterPositions.length < glyphCount) {
                            for (let i = this.clusterPositions.length; i < glyphCount; i++) {
                                this.clusterPositions.push(new Vec3(0, 0, 0));
                            }
                        }
                        this.clusterPositions.length = glyphCount;
                        for (let i = 0; i < glyphCount; i++) {
                            const glyph = cluster.glyphs[i];
                            const pos = this.clusterPositions[i];
                            pos.x = glyph.x ?? 0;
                            pos.y = glyph.y ?? 0;
                            pos.z = 0;
                        }
                        boundaryGroups = this.clusterer.cluster(clusterGlyphContours, this.clusterPositions);
                        this.clusteringCache.set(cacheKey, {
                            glyphIds: cluster.glyphs.map((g) => g.g),
                            positions: cluster.glyphs.map((g) => ({
                                x: g.x ?? 0,
                                y: g.y ?? 0
                            })),
                            groups: boundaryGroups
                        });
                    }
                }
                const forceSeparate = separateGlyphs;
                // Split boundary groups so colored and non-colored glyphs don't merge together
                // This preserves overlap removal within each color class while keeping
                // geometry separate for accurate vertex coloring
                let finalGroups = boundaryGroups;
                if (coloredTextIndices && coloredTextIndices.size > 0) {
                    finalGroups = [];
                    for (const group of boundaryGroups) {
                        if (group.length <= 1) {
                            finalGroups.push(group);
                        }
                        else {
                            // Split group into colored and non-colored sub-groups
                            const coloredIndices = [];
                            const nonColoredIndices = [];
                            for (const idx of group) {
                                const glyph = cluster.glyphs[idx];
                                if (coloredTextIndices.has(glyph.absoluteTextIndex)) {
                                    coloredIndices.push(idx);
                                }
                                else {
                                    nonColoredIndices.push(idx);
                                }
                            }
                            // Add non-empty sub-groups
                            if (coloredIndices.length > 0) {
                                finalGroups.push(coloredIndices);
                            }
                            if (nonColoredIndices.length > 0) {
                                finalGroups.push(nonColoredIndices);
                            }
                        }
                    }
                }
                // Iterate over the geometric groups identified by BoundaryClusterer
                // logical groups (words) split into geometric sub-groups
                for (const groupIndices of finalGroups) {
                    const isOverlappingGroup = groupIndices.length > 1;
                    const shouldCluster = isOverlappingGroup && !forceSeparate;
                    if (shouldCluster) {
                        // Cluster-level caching for this specific group of overlapping glyphs
                        const subClusterGlyphs = groupIndices.map((i) => cluster.glyphs[i]);
                        const clusterKey = this.getClusterKey(subClusterGlyphs, depth, removeOverlaps);
                        let cachedCluster = this.wordCache.get(clusterKey);
                        if (!cachedCluster) {
                            const clusterContours = this.clusterContoursScratch;
                            let contourIndex = 0;
                            const refX = subClusterGlyphs[0].x ?? 0;
                            const refY = subClusterGlyphs[0].y ?? 0;
                            for (let i = 0; i < groupIndices.length; i++) {
                                const originalIndex = groupIndices[i];
                                const glyphContours = clusterGlyphContours[originalIndex];
                                const glyph = cluster.glyphs[originalIndex];
                                const relX = (glyph.x ?? 0) - refX;
                                const relY = (glyph.y ?? 0) - refY;
                                for (const path of glyphContours.paths) {
                                    const points = path.points;
                                    const pointCount = points.length;
                                    if (pointCount < 3)
                                        continue;
                                    const isClosed = pointCount > 1 &&
                                        points[0].x === points[pointCount - 1].x &&
                                        points[0].y === points[pointCount - 1].y;
                                    const end = isClosed ? pointCount - 1 : pointCount;
                                    const needed = (end + 1) * 2;
                                    let contour = clusterContours[contourIndex];
                                    if (!contour || contour.length < needed) {
                                        contour = new Array(needed);
                                        clusterContours[contourIndex] = contour;
                                    }
                                    else {
                                        contour.length = needed;
                                    }
                                    let out = 0;
                                    for (let k = 0; k < end; k++) {
                                        const pt = points[k];
                                        contour[out++] = pt.x + relX;
                                        contour[out++] = pt.y + relY;
                                    }
                                    if (out >= 2) {
                                        contour[out++] = contour[0];
                                        contour[out++] = contour[1];
                                    }
                                    contourIndex++;
                                }
                            }
                            clusterContours.length = contourIndex;
                            cachedCluster = this.tessellateGlyphCluster(clusterContours, depth, isCFF);
                            this.wordCache.set(clusterKey, cachedCluster);
                        }
                        // Calculate the absolute position of this sub-cluster based on its first glyph
                        // (since the cached geometry is relative to that first glyph)
                        const firstGlyphInGroup = subClusterGlyphs[0];
                        const groupPosX = clusterX + (firstGlyphInGroup.x ?? 0);
                        const groupPosY = clusterY + (firstGlyphInGroup.y ?? 0);
                        const groupPosZ = clusterZ;
                        const vertexStart = pushTask(cachedCluster, groupPosX, groupPosY, groupPosZ);
                        const clusterVertexCount = cachedCluster.vertices.length / 3;
                        for (let i = 0; i < groupIndices.length; i++) {
                            const originalIndex = groupIndices[i];
                            const glyph = cluster.glyphs[originalIndex];
                            const glyphContours = clusterGlyphContours[originalIndex];
                            const glyphPosX = clusterX + (glyph.x ?? 0);
                            const glyphPosY = clusterY + (glyph.y ?? 0);
                            const glyphPosZ = clusterZ;
                            const glyphInfo = this.createGlyphInfo(glyph, vertexStart, clusterVertexCount, glyphPosX, glyphPosY, glyphPosZ, glyphContours, depth);
                            glyphInfos.push(glyphInfo);
                            this.updatePlaneBounds(glyphInfo.bounds, planeBounds);
                        }
                    }
                    else {
                        // Glyph-level caching (standard path for isolated glyphs or when forced separate)
                        for (const i of groupIndices) {
                            const glyph = cluster.glyphs[i];
                            const glyphContours = clusterGlyphContours[i];
                            const glyphPosX = clusterX + (glyph.x ?? 0);
                            const glyphPosY = clusterY + (glyph.y ?? 0);
                            const glyphPosZ = clusterZ;
                            // Skip glyphs with no paths (spaces, zero-width characters, etc.)
                            if (glyphContours.paths.length === 0) {
                                const glyphInfo = this.createGlyphInfo(glyph, 0, 0, glyphPosX, glyphPosY, glyphPosZ, glyphContours, depth);
                                glyphInfos.push(glyphInfo);
                                continue;
                            }
                            const glyphCacheKey = getGlyphCacheKey(this.cacheKeyPrefix, glyph.g, depth, removeOverlaps);
                            let cachedGlyph = this.cache.get(glyphCacheKey);
                            if (!cachedGlyph) {
                                cachedGlyph = this.tessellateGlyph(glyphContours, depth, removeOverlaps, isCFF);
                                this.cache.set(glyphCacheKey, cachedGlyph);
                            }
                            else {
                                cachedGlyph.useCount++;
                            }
                            const vertexStart = pushTask(cachedGlyph, glyphPosX, glyphPosY, glyphPosZ);
                            const glyphInfo = this.createGlyphInfo(glyph, vertexStart, cachedGlyph.vertices.length / 3, glyphPosX, glyphPosY, glyphPosZ, glyphContours, depth);
                            glyphInfos.push(glyphInfo);
                            this.updatePlaneBounds(glyphInfo.bounds, planeBounds);
                        }
                    }
                }
            }
        }
        tasks.length = taskCount;
        const vertexArray = new Float32Array(totalVertexFloats);
        const normalArray = new Float32Array(totalNormalFloats);
        const indexArray = new Uint32Array(totalIndexCount);
        let vertexPos = 0; // float index (multiple of 3)
        let normalPos = 0; // float index (multiple of 3)
        let indexPos = 0; // index count
        for (let t = 0; t < tasks.length; t++) {
            const task = tasks[t];
            const v = task.data.vertices;
            const n = task.data.normals;
            const idx = task.data.indices;
            const px = task.px;
            const py = task.py;
            const pz = task.pz;
            const offsetX = px * scale;
            const offsetY = py * scale;
            const offsetZ = pz * scale;
            const vLen = v.length;
            let outPos = vertexPos;
            for (let j = 0; j < vLen; j += 3) {
                vertexArray[outPos] = v[j] * scale + offsetX;
                vertexArray[outPos + 1] = v[j + 1] * scale + offsetY;
                vertexArray[outPos + 2] = v[j + 2] * scale + offsetZ;
                outPos += 3;
            }
            vertexPos = outPos;
            normalArray.set(n, normalPos);
            normalPos += n.length;
            const vertexStart = task.vertexStart;
            const idxLen = idx.length;
            let outIndexPos = indexPos;
            for (let j = 0; j < idxLen; j++) {
                indexArray[outIndexPos++] = idx[j] + vertexStart;
            }
            indexPos = outIndexPos;
        }
        perfLogger.end('GlyphGeometryBuilder.buildInstancedGeometry');
        planeBounds.min.x *= scale;
        planeBounds.min.y *= scale;
        planeBounds.min.z *= scale;
        planeBounds.max.x *= scale;
        planeBounds.max.y *= scale;
        planeBounds.max.z *= scale;
        for (let i = 0; i < glyphInfos.length; i++) {
            glyphInfos[i].bounds.min.x *= scale;
            glyphInfos[i].bounds.min.y *= scale;
            glyphInfos[i].bounds.min.z *= scale;
            glyphInfos[i].bounds.max.x *= scale;
            glyphInfos[i].bounds.max.y *= scale;
            glyphInfos[i].bounds.max.z *= scale;
        }
        return {
            vertices: vertexArray,
            normals: normalArray,
            indices: indexArray,
            glyphInfos,
            planeBounds
        };
    }
    getClusterKey(glyphs, depth, removeOverlaps) {
        if (glyphs.length === 0)
            return '';
        const refX = glyphs[0].x ?? 0;
        const refY = glyphs[0].y ?? 0;
        const parts = glyphs.map((g) => {
            const relX = (g.x ?? 0) - refX;
            const relY = (g.y ?? 0) - refY;
            return `${g.g}:${relX},${relY}`;
        });
        const ids = parts.join('|');
        const roundedDepth = Math.round(depth * 1000) / 1000;
        return `${this.cacheKeyPrefix}_${ids}_${roundedDepth}_${removeOverlaps}`;
    }
    createGlyphInfo(glyph, vertexStart, vertexCount, positionX, positionY, positionZ, contours, depth) {
        return {
            textIndex: glyph.absoluteTextIndex,
            lineIndex: glyph.lineIndex,
            vertexStart,
            vertexCount,
            bounds: {
                min: {
                    x: contours.bounds.min.x + positionX,
                    y: contours.bounds.min.y + positionY,
                    z: positionZ
                },
                max: {
                    x: contours.bounds.max.x + positionX,
                    y: contours.bounds.max.y + positionY,
                    z: positionZ + depth
                }
            }
        };
    }
    getContoursForGlyph(glyphId) {
        // Fast path: skip HarfBuzz draw for known-empty glyphs (spaces, zero-width, etc)
        if (this.emptyGlyphs.has(glyphId)) {
            return {
                glyphId,
                paths: [],
                bounds: {
                    min: { x: 0, y: 0 },
                    max: { x: 0, y: 0 }
                }
            };
        }
        const key = `${this.cacheKeyPrefix}_${glyphId}`;
        const cached = this.contourCache.get(key);
        if (cached) {
            return cached;
        }
        // Rebind collector before draw operation
        this.drawCallbacks.setCollector(this.collector);
        this.collector.reset();
        this.collector.beginGlyph(glyphId, 0);
        this.loadedFont.module.exports.hb_font_draw_glyph(this.loadedFont.font.ptr, glyphId, this.drawCallbacks.getDrawFuncsPtr(), 0);
        this.collector.finishGlyph();
        const collected = this.collector.getCollectedGlyphs()[0];
        const contours = collected || {
            glyphId,
            paths: [],
            bounds: {
                min: { x: 0, y: 0 },
                max: { x: 0, y: 0 }
            }
        };
        // Mark glyph as empty for future fast-path
        if (contours.paths.length === 0) {
            this.emptyGlyphs.add(glyphId);
        }
        this.contourCache.set(key, contours);
        return contours;
    }
    tessellateGlyphCluster(contours, depth, isCFF) {
        const processedGeometry = this.tessellator.processContours(contours, true, isCFF, depth !== 0);
        return this.extrudeAndPackage(processedGeometry, depth);
    }
    extrudeAndPackage(processedGeometry, depth) {
        perfLogger.start('Extruder.extrude', {
            depth,
            upem: this.loadedFont.upem
        });
        const extrudedResult = this.extruder.extrude(processedGeometry, depth, this.loadedFont.upem);
        perfLogger.end('Extruder.extrude');
        const vertices = extrudedResult.vertices;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            if (x < minX)
                minX = x;
            if (x > maxX)
                maxX = x;
            if (y < minY)
                minY = y;
            if (y > maxY)
                maxY = y;
            if (z < minZ)
                minZ = z;
            if (z > maxZ)
                maxZ = z;
        }
        const boundsMin = new Vec3(minX, minY, minZ);
        const boundsMax = new Vec3(maxX, maxY, maxZ);
        return {
            geometry: processedGeometry,
            vertices: extrudedResult.vertices,
            normals: extrudedResult.normals,
            indices: extrudedResult.indices,
            bounds: { min: boundsMin, max: boundsMax },
            useCount: 1
        };
    }
    tessellateGlyph(glyphContours, depth, removeOverlaps, isCFF) {
        perfLogger.start('GlyphGeometryBuilder.tessellateGlyph', {
            glyphId: glyphContours.glyphId,
            pathCount: glyphContours.paths.length
        });
        const processedGeometry = this.tessellator.process(glyphContours.paths, removeOverlaps, isCFF, depth !== 0);
        perfLogger.end('GlyphGeometryBuilder.tessellateGlyph');
        return this.extrudeAndPackage(processedGeometry, depth);
    }
    updatePlaneBounds(glyphBounds, planeBounds) {
        const pMin = planeBounds.min;
        const pMax = planeBounds.max;
        const gMin = glyphBounds.min;
        const gMax = glyphBounds.max;
        if (gMin.x < pMin.x)
            pMin.x = gMin.x;
        if (gMin.y < pMin.y)
            pMin.y = gMin.y;
        if (gMin.z < pMin.z)
            pMin.z = gMin.z;
        if (gMax.x > pMax.x)
            pMax.x = gMax.x;
        if (gMax.y > pMax.y)
            pMax.y = gMax.y;
        if (gMax.z > pMax.z)
            pMax.z = gMax.z;
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    clearCache() {
        this.cache.clear();
        this.wordCache.clear();
        this.clusteringCache.clear();
        this.contourCache.clear();
    }
}

class TextRangeQuery {
    constructor(text, glyphs) {
        this.text = text;
        this.glyphsByTextIndex = new Map();
        glyphs.forEach((g) => {
            const existing = this.glyphsByTextIndex.get(g.textIndex) || [];
            existing.push(g);
            this.glyphsByTextIndex.set(g.textIndex, existing);
        });
    }
    execute(options) {
        const ranges = [];
        if (options.byText) {
            ranges.push(...this.findByText(options.byText));
        }
        if (options.byCharRange) {
            ranges.push(...this.findByCharRange(options.byCharRange));
        }
        return ranges;
    }
    findByText(patterns) {
        const ranges = [];
        for (const pattern of patterns) {
            let index = 0;
            while ((index = this.text.indexOf(pattern, index)) !== -1) {
                ranges.push(this.createTextRange(index, index + pattern.length, pattern));
                index += pattern.length;
            }
        }
        return ranges;
    }
    findByCharRange(ranges) {
        return ranges.map((range) => {
            const text = this.text.slice(range.start, range.end);
            return this.createTextRange(range.start, range.end, text);
        });
    }
    createTextRange(start, end, originalText) {
        const relevantGlyphs = [];
        const lineGroups = new Map();
        for (let i = start; i < end; i++) {
            const glyphs = this.glyphsByTextIndex.get(i);
            if (glyphs) {
                for (const glyph of glyphs) {
                    relevantGlyphs.push(glyph);
                    const lineGlyphs = lineGroups.get(glyph.lineIndex) || [];
                    lineGlyphs.push(glyph);
                    lineGroups.set(glyph.lineIndex, lineGlyphs);
                }
            }
        }
        const bounds = Array.from(lineGroups.values()).map((lineGlyphs) => this.calculateBounds(lineGlyphs));
        return {
            start,
            end,
            originalText,
            bounds,
            glyphs: relevantGlyphs,
            lineIndices: Array.from(lineGroups.keys()).sort((a, b) => a - b)
        };
    }
    calculateBounds(glyphs) {
        if (glyphs.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 }
            };
        }
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (const glyph of glyphs) {
            if (glyph.bounds.min.x < minX)
                minX = glyph.bounds.min.x;
            if (glyph.bounds.min.y < minY)
                minY = glyph.bounds.min.y;
            if (glyph.bounds.min.z < minZ)
                minZ = glyph.bounds.min.z;
            if (glyph.bounds.max.x > maxX)
                maxX = glyph.bounds.max.x;
            if (glyph.bounds.max.y > maxY)
                maxY = glyph.bounds.max.y;
            if (glyph.bounds.max.z > maxZ)
                maxZ = glyph.bounds.max.z;
        }
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }
}

class MeshGeometryBuilder {
    constructor(loadedFont, fontId) {
        this.loadedFont = loadedFont;
        this.fontId = fontId;
    }
    setFont(loadedFont, fontId) {
        this.loadedFont = loadedFont;
        this.fontId = fontId;
        this.geometryBuilder = undefined;
    }
    build(layout, options) {
        perfLogger.start('MeshGeometryBuilder.build', {
            textLength: options.text.length
        });
        try {
            if (!this.geometryBuilder) {
                this.geometryBuilder = new GlyphGeometryBuilder(globalGlyphCache, this.loadedFont);
                this.geometryBuilder.setFontId(this.fontId);
            }
            const useCurveSteps = options.curveSteps !== undefined &&
                options.curveSteps !== null &&
                options.curveSteps > 0;
            this.geometryBuilder.setCurveSteps(options.curveSteps);
            this.geometryBuilder.setCurveFidelityConfig(useCurveSteps ? undefined : options.curveFidelity);
            this.geometryBuilder.setGeometryOptimization(options.geometryOptimization);
            const shouldRemoveOverlaps = options.removeOverlaps ?? this.loadedFont.isVariable ?? false;
            let coloredTextIndices;
            let byTextMatches;
            if (options.color &&
                typeof options.color === 'object' &&
                !Array.isArray(options.color)) {
                if (options.color.byText || options.color.byCharRange) {
                    coloredTextIndices = new Set();
                    if (options.color.byText) {
                        byTextMatches = [];
                        for (const pattern of Object.keys(options.color.byText)) {
                            let index = 0;
                            while ((index = options.text.indexOf(pattern, index)) !== -1) {
                                byTextMatches.push({
                                    pattern,
                                    start: index,
                                    end: index + pattern.length
                                });
                                for (let i = index; i < index + pattern.length; i++) {
                                    coloredTextIndices.add(i);
                                }
                                index += pattern.length;
                            }
                        }
                    }
                    if (options.color.byCharRange) {
                        for (const range of options.color.byCharRange) {
                            for (let i = range.start; i < range.end; i++) {
                                coloredTextIndices.add(i);
                            }
                        }
                    }
                }
            }
            const shapedResult = this.geometryBuilder.buildInstancedGeometry(layout.clustersByLine, layout.layoutData.depth, shouldRemoveOverlaps, this.loadedFont.metrics.isCFF, layout.layoutData.pixelsPerFontUnit, options.perGlyphAttributes ?? false, coloredTextIndices);
            const result = this.finalizeGeometry(shapedResult.vertices, shapedResult.normals, shapedResult.indices, shapedResult.glyphInfos, shapedResult.planeBounds, options, options.text, byTextMatches);
            if (options.perGlyphAttributes) {
                const glyphAttrs = this.createGlyphAttributes(result.vertices.length / 3, result.glyphs);
                result.glyphAttributes = glyphAttrs;
            }
            return result;
        }
        finally {
            perfLogger.end('MeshGeometryBuilder.build');
        }
    }
    getCacheSize() {
        return this.geometryBuilder?.getCacheStats().size ?? 0;
    }
    clearCache() {
        this.geometryBuilder?.clearCache();
    }
    reset() {
        this.geometryBuilder = undefined;
        this.textLayout = undefined;
    }
    finalizeGeometry(vertices, normals, indices, glyphInfoArray, planeBounds, options, originalText, byTextMatches) {
        const { layout = {} } = options;
        const { width, align = layout.direction === 'rtl' ? 'right' : 'left' } = layout;
        if (!this.textLayout) {
            this.textLayout = new TextLayout(this.loadedFont);
        }
        const alignmentResult = this.textLayout.computeAlignmentOffset({
            width,
            align,
            planeBounds
        });
        const offset = alignmentResult.offset;
        planeBounds.min.x = alignmentResult.adjustedBounds.min.x;
        planeBounds.max.x = alignmentResult.adjustedBounds.max.x;
        if (offset !== 0) {
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] += offset;
            }
            for (let i = 0; i < glyphInfoArray.length; i++) {
                glyphInfoArray[i].bounds.min.x += offset;
                glyphInfoArray[i].bounds.max.x += offset;
            }
        }
        let colors;
        let coloredRanges;
        if (options.color) {
            const colorResult = this.applyColorSystem(vertices, glyphInfoArray, options.color, options.text, byTextMatches);
            colors = colorResult.colors;
            coloredRanges = colorResult.coloredRanges;
        }
        const optimizationStats = this.geometryBuilder.getOptimizationStats();
        const trianglesGenerated = indices.length / 3;
        const verticesGenerated = vertices.length / 3;
        return {
            vertices,
            normals,
            indices,
            colors,
            glyphs: glyphInfoArray,
            planeBounds,
            stats: {
                trianglesGenerated,
                verticesGenerated,
                pointsRemovedByVisvalingam: optimizationStats.pointsRemovedByVisvalingam,
                originalPointCount: optimizationStats.originalPointCount
            },
            query: (() => {
                let cachedQuery = null;
                return (queryOptions) => {
                    if (!originalText) {
                        throw new Error('Original text not available for querying');
                    }
                    if (!cachedQuery) {
                        cachedQuery = new TextRangeQuery(originalText, glyphInfoArray);
                    }
                    return cachedQuery.execute(queryOptions);
                };
            })(),
            coloredRanges,
            glyphAttributes: undefined
        };
    }
    applyColorSystem(vertices, glyphInfoArray, color, originalText, byTextMatches) {
        const vertexCount = vertices.length / 3;
        const colors = new Float32Array(vertexCount * 3);
        const coloredRanges = [];
        if (Array.isArray(color)) {
            for (let i = 0; i < vertexCount; i++) {
                const baseIndex = i * 3;
                colors[baseIndex] = color[0];
                colors[baseIndex + 1] = color[1];
                colors[baseIndex + 2] = color[2];
            }
            coloredRanges.push({
                start: 0,
                end: originalText.length,
                originalText,
                color,
                bounds: [],
                glyphs: glyphInfoArray,
                lineIndices: [...new Set(glyphInfoArray.map((g) => g.lineIndex))]
            });
        }
        else {
            const defaultColor = color.default || [1, 1, 1];
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = defaultColor[0];
                colors[i + 1] = defaultColor[1];
                colors[i + 2] = defaultColor[2];
            }
            let glyphsByTextIndex;
            if ((color.byText && byTextMatches) || color.byCharRange) {
                glyphsByTextIndex = new Map();
                for (const glyph of glyphInfoArray) {
                    const existing = glyphsByTextIndex.get(glyph.textIndex);
                    if (existing) {
                        existing.push(glyph);
                    }
                    else {
                        glyphsByTextIndex.set(glyph.textIndex, [glyph]);
                    }
                }
            }
            if (color.byText && byTextMatches && glyphsByTextIndex) {
                for (const match of byTextMatches) {
                    const targetColor = color.byText[match.pattern];
                    if (!targetColor)
                        continue;
                    const matchGlyphs = [];
                    const lineGroups = new Map();
                    for (let i = match.start; i < match.end; i++) {
                        const glyphs = glyphsByTextIndex.get(i);
                        if (glyphs) {
                            for (const glyph of glyphs) {
                                matchGlyphs.push(glyph);
                                const lineGlyphs = lineGroups.get(glyph.lineIndex);
                                if (lineGlyphs) {
                                    lineGlyphs.push(glyph);
                                }
                                else {
                                    lineGroups.set(glyph.lineIndex, [glyph]);
                                }
                                for (let v = 0; v < glyph.vertexCount; v++) {
                                    const vertexIndex = (glyph.vertexStart + v) * 3;
                                    if (vertexIndex >= 0 && vertexIndex < colors.length) {
                                        colors[vertexIndex] = targetColor[0];
                                        colors[vertexIndex + 1] = targetColor[1];
                                        colors[vertexIndex + 2] = targetColor[2];
                                    }
                                }
                            }
                        }
                    }
                    const bounds = Array.from(lineGroups.values()).map((lineGlyphs) => this.calculateGlyphBounds(lineGlyphs));
                    coloredRanges.push({
                        start: match.start,
                        end: match.end,
                        originalText: match.pattern,
                        color: targetColor,
                        bounds,
                        glyphs: matchGlyphs,
                        lineIndices: Array.from(lineGroups.keys()).sort((a, b) => a - b)
                    });
                }
            }
            if (color.byCharRange && glyphsByTextIndex) {
                for (const range of color.byCharRange) {
                    const rangeGlyphs = [];
                    const lineGroups = new Map();
                    for (let i = range.start; i < range.end; i++) {
                        const glyphs = glyphsByTextIndex.get(i);
                        if (glyphs) {
                            for (const glyph of glyphs) {
                                rangeGlyphs.push(glyph);
                                const lineGlyphs = lineGroups.get(glyph.lineIndex);
                                if (lineGlyphs) {
                                    lineGlyphs.push(glyph);
                                }
                                else {
                                    lineGroups.set(glyph.lineIndex, [glyph]);
                                }
                                for (let v = 0; v < glyph.vertexCount; v++) {
                                    const vertexIndex = (glyph.vertexStart + v) * 3;
                                    if (vertexIndex >= 0 && vertexIndex < colors.length) {
                                        colors[vertexIndex] = range.color[0];
                                        colors[vertexIndex + 1] = range.color[1];
                                        colors[vertexIndex + 2] = range.color[2];
                                    }
                                }
                            }
                        }
                    }
                    const bounds = Array.from(lineGroups.values()).map((lineGlyphs) => this.calculateGlyphBounds(lineGlyphs));
                    coloredRanges.push({
                        start: range.start,
                        end: range.end,
                        originalText: originalText.slice(range.start, range.end),
                        color: range.color,
                        bounds,
                        glyphs: rangeGlyphs,
                        lineIndices: Array.from(lineGroups.keys()).sort((a, b) => a - b)
                    });
                }
            }
        }
        return { colors, coloredRanges };
    }
    calculateGlyphBounds(glyphs) {
        if (glyphs.length === 0) {
            return {
                min: { x: 0, y: 0, z: 0 },
                max: { x: 0, y: 0, z: 0 }
            };
        }
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (const glyph of glyphs) {
            if (glyph.bounds.min.x < minX)
                minX = glyph.bounds.min.x;
            if (glyph.bounds.min.y < minY)
                minY = glyph.bounds.min.y;
            if (glyph.bounds.min.z < minZ)
                minZ = glyph.bounds.min.z;
            if (glyph.bounds.max.x > maxX)
                maxX = glyph.bounds.max.x;
            if (glyph.bounds.max.y > maxY)
                maxY = glyph.bounds.max.y;
            if (glyph.bounds.max.z > maxZ)
                maxZ = glyph.bounds.max.z;
        }
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }
    createGlyphAttributes(vertexCount, glyphs) {
        const glyphCenters = new Float32Array(vertexCount * 3);
        const glyphIndices = new Float32Array(vertexCount);
        const glyphLineIndices = new Float32Array(vertexCount);
        const glyphProgress = new Float32Array(vertexCount);
        const glyphBaselineY = new Float32Array(vertexCount);
        let minX = Infinity;
        let maxX = -Infinity;
        for (let i = 0; i < glyphs.length; i++) {
            const cx = (glyphs[i].bounds.min.x + glyphs[i].bounds.max.x) / 2;
            if (cx < minX)
                minX = cx;
            if (cx > maxX)
                maxX = cx;
        }
        const range = maxX - minX;
        for (let index = 0; index < glyphs.length; index++) {
            const glyph = glyphs[index];
            const centerX = (glyph.bounds.min.x + glyph.bounds.max.x) / 2;
            const centerY = (glyph.bounds.min.y + glyph.bounds.max.y) / 2;
            const centerZ = (glyph.bounds.min.z + glyph.bounds.max.z) / 2;
            const baselineY = glyph.bounds.min.y;
            const progress = range > 0 ? (centerX - minX) / range : 0;
            const start = glyph.vertexStart;
            const end = Math.min(start + glyph.vertexCount, vertexCount);
            if (end <= start)
                continue;
            glyphIndices.fill(index, start, end);
            glyphLineIndices.fill(glyph.lineIndex, start, end);
            glyphProgress.fill(progress, start, end);
            glyphBaselineY.fill(baselineY, start, end);
            for (let v = start * 3; v < end * 3; v += 3) {
                glyphCenters[v] = centerX;
                glyphCenters[v + 1] = centerY;
                glyphCenters[v + 2] = centerZ;
            }
        }
        return {
            glyphCenter: glyphCenters,
            glyphIndex: glyphIndices,
            glyphLineIndex: glyphLineIndices,
            glyphProgress,
            glyphBaselineY
        };
    }
}

export { DEFAULT_CURVE_FIDELITY, DrawCallbackHandler, FontMetadataExtractor, MeshGeometryBuilder, Text, TextRangeQuery, createGlyphCache, getSharedDrawCallbackHandler, globalGlyphCache, globalOutlineCache };
