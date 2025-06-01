"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDynamicKeywords = extractDynamicKeywords;
exports.extractKeywords2 = extractKeywords2;
exports.extractKeywords = extractKeywords;
exports.extractNouns = extractNouns;
var natural_1 = require("natural");
var compromise_1 = require("compromise");
var defaultOptions = {
    minWordLength: 3,
    excludeCommonWords: true,
    includeAcronyms: true
};
function extractDynamicKeywords(text, options) {
    if (options === void 0) { options = {}; }
    var opts = __assign(__assign({}, defaultOptions), options);
    // Common words to exclude
    var commonWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
        'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
        'will', 'with', 'their', 'this', 'but', 'they', 'have', 'had', 'what',
        'when', 'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each',
        'few', 'more', 'most', 'other', 'some', 'such', 'over', 'than', 'too',
        'very', 'can', 'will', 'just', 'should', 'now', 'including'
    ]);
    // Split the text into two parts based on the period
    var _a = text.split('.'), mainText = _a[0], categories = _a[1];
    var keywords = new Set();
    // Process the main text
    var processText = function (text) {
        // Split on common delimiters
        var words = text.split(/[\s,\-–]+/);
        var i = 0;
        while (i < words.length) {
            var word = words[i];
            // Skip empty strings and common words
            if (!word || (opts.excludeCommonWords && commonWords.has(word.toLowerCase()))) {
                i++;
                continue;
            }
            // Handle acronyms and uppercase terms
            if (opts.includeAcronyms && word.toUpperCase() === word && word.length >= 2) {
                keywords.add(word);
                i++;
                continue;
            }
            // Look for proper nouns and multi-word phrases
            if (word.charAt(0).toUpperCase() === word.charAt(0)) {
                var phrase = [word];
                var j = i + 1;
                while (j < words.length &&
                    words[j] &&
                    (words[j].charAt(0).toUpperCase() === words[j].charAt(0) ||
                        commonWords.has(words[j].toLowerCase()))) {
                    phrase.push(words[j]);
                    j++;
                }
                if (phrase.length > 1) {
                    keywords.add(phrase.join(' '));
                    i = j;
                    continue;
                }
            }
            // Add individual words that meet the minimum length requirement
            if (word.length >= opts.minWordLength) {
                keywords.add(word);
            }
            i++;
        }
    };
    // Process main text
    processText(mainText);
    // Process categories (after --)
    if (categories) {
        var categoryParts = categories.split('--');
        categoryParts.forEach(function (part) {
            var cleanPart = part.trim();
            if (cleanPart) {
                keywords.add(cleanPart);
            }
        });
    }
    // Post-process keywords
    return Array.from(keywords)
        .filter(function (keyword) { return keyword.length >= opts.minWordLength; })
        .map(function (keyword) { return keyword.trim(); })
        .filter(function (keyword) { return keyword; });
}
function extractKeywords2(input) {
    var doc = (0, compromise_1.default)(input);
    // Extract nouns, proper nouns, and adjectives
    var nouns = doc.nouns().out('array');
    var properNouns = doc.match('#ProperNoun').out('array');
    var adjectives = doc.adjectives().out('array');
    // Combine all extracted terms
    var keywords = __spreadArray(__spreadArray(__spreadArray([], nouns, true), properNouns, true), adjectives, true);
    // Remove duplicates and return unique keywords
    return __spreadArray([], new Set(keywords), true);
}
function extractProperNouns(text) {
    var doc = (0, compromise_1.default)(text);
    // Extract proper nouns (capitalized words that are not at the start of a sentence)
    var properNouns = doc.match('#ProperNoun').out('array');
    return properNouns;
}
// Function to extract keywords
function extractKeywords(titles) {
    var stopWords = new Set(natural_1.default.stopwords); // Load stop words
    var keywords = new Set();
    titles.forEach(function (title) {
        // Remove prefixes like "S/78 [23]"
        var cleanedTitle = title.replace(/^[AS]\/[\d\w]+[ \w-\d]+[\/[]+[\d\] ]+/, '');
        // Tokenize the title
        var nouns = extractNouns(cleanedTitle);
        natural_1.default.PorterStemmer.removeStopWords(nouns);
        // Remove stop words and add to keywords set
        nouns.forEach(function (token) {
            var properNouns = extractProperNouns(token);
            keywords.add(token);
        });
    });
    return Array.from(keywords);
}
function extractNouns(text) {
    var doc = (0, compromise_1.default)(text);
    return doc.nouns().out('array');
}
