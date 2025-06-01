"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.getResolutionVotes = getResolutionVotes;
exports.findMatchingVotingCountries = findMatchingVotingCountries;
exports.findMostActiveCountries = findMostActiveCountries;
exports.findTopVotingPartners = findTopVotingPartners;
exports.fetchVotingData = fetchVotingData;
exports.clusterCountriesByVoting = clusterCountriesByVoting;
var models_1 = require("../reader/models");
var ml_kmeans_1 = require("ml-kmeans");
function getResolutionVotes(selectedCountries, range) {
    return __awaiter(this, void 0, void 0, function () {
        var voteRepo, votes, resolutionVotes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    voteRepo = models_1.ResolutionVoteRepository.createInstance(models_1.defaultDataSource);
                    return [4 /*yield*/, voteRepo.createQueryBuilder("resolution_vote")
                            .leftJoinAndSelect('resolution_vote.country', 'country')
                            .leftJoinAndSelect('resolution_vote.resolution', 'resolution')
                            .where("country.slug IN (:...selectedCountries)", { selectedCountries: selectedCountries })
                            .andWhere("resolution.year BETWEEN ".concat(range.start, " AND ").concat(range.finish))
                            .orderBy("countryCountryId", "ASC").getMany()];
                case 1:
                    votes = _a.sent();
                    resolutionVotes = {};
                    votes.forEach(function (vote) {
                        if (!resolutionVotes[vote.resolution.resolutionId]) {
                            resolutionVotes[vote.resolution.resolutionId] = {};
                        }
                        resolutionVotes[vote.resolution.resolutionId][vote.country.slug] = vote.vote;
                    });
                    return [2 /*return*/, resolutionVotes];
            }
        });
    });
}
function getVotingMatrix(selectedCountries, range) {
    return __awaiter(this, void 0, void 0, function () {
        var resolutionVotes, votingMatrix, resolutionId, countryName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getResolutionVotes(selectedCountries, range)];
                case 1:
                    resolutionVotes = _a.sent();
                    votingMatrix = {};
                    for (resolutionId in resolutionVotes) {
                        for (countryName in resolutionVotes[resolutionId]) {
                            if (!votingMatrix[countryName]) {
                                votingMatrix[countryName] = {};
                            }
                            votingMatrix[countryName][resolutionId] = resolutionVotes[resolutionId][countryName];
                        }
                    }
                    return [2 /*return*/, votingMatrix];
            }
        });
    });
}
function calculatePairwiseAlignmentsParallel(selectedCountries, range) {
    return __awaiter(this, void 0, void 0, function () {
        var votingMatrix, alignments, promises, _loop_1, i;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getVotingMatrix(selectedCountries, range)];
                case 1:
                    votingMatrix = _a.sent();
                    alignments = {};
                    promises = [];
                    _loop_1 = function (i) {
                        var _loop_2 = function (j) {
                            promises.push((function () { return __awaiter(_this, void 0, void 0, function () {
                                var country1, country2, key, matchingVotes, totalVotes, resolutionId;
                                return __generator(this, function (_a) {
                                    country1 = selectedCountries[i];
                                    country2 = selectedCountries[j];
                                    key = "".concat(country1, "/").concat(country2);
                                    matchingVotes = 0;
                                    totalVotes = 0;
                                    for (resolutionId in votingMatrix[country1]) {
                                        if (resolutionId in votingMatrix[country2]) {
                                            totalVotes++;
                                            if (votingMatrix[country1][resolutionId] === votingMatrix[country2][resolutionId]) {
                                                matchingVotes++;
                                            }
                                        }
                                    }
                                    alignments[key] = totalVotes > 0 ? (matchingVotes / totalVotes) * 100 : 0;
                                    return [2 /*return*/];
                                });
                            }); })());
                        };
                        for (var j = i + 1; j < selectedCountries.length; j++) {
                            _loop_2(j);
                        }
                    };
                    for (i = 0; i < selectedCountries.length; i++) {
                        _loop_1(i);
                    }
                    return [4 /*yield*/, Promise.all(promises)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, alignments];
            }
        });
    });
}
function findMatchingVotingCountries(country_1, range_1) {
    return __awaiter(this, arguments, void 0, function (country, range, threshold) {
        var voteRepo, result, matchingCountries;
        if (threshold === void 0) { threshold = 20; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    voteRepo = models_1.ResolutionVoteRepository.createInstance(models_1.defaultDataSource);
                    return [4 /*yield*/, voteRepo
                            .createQueryBuilder("rv1") // Alias for the first resolution_vote table
                            .innerJoin("rv1.resolution", "resolution") // Join with the resolution table
                            .innerJoin("rv1.country", "c1") // Join with the country table for the given country
                            .innerJoin(models_1.ResolutionVote, "rv2", // Alias for the second resolution_vote table
                        "rv2.resolutionResolutionId = rv1.resolutionResolutionId AND rv2.vote = rv1.vote")
                            .innerJoin("rv2.country", "c2") // Join with the country table for the other country
                            .where("c1.slug = :country", { country: country }) // Filter by the given country
                            .andWhere("resolution.year BETWEEN :start AND :finish", { start: range.start, finish: range.finish }) // Exclude the given country
                            .andWhere("c2.slug != :country", { country: country }) // Exclude the given country
                            .select("c2.slug AS slug, COUNT(*) as total") // Select the name of the other country
                            .groupBy("c2.slug") // Group by the other country's name
                            .having("total >= ".concat(threshold)) // Filter countries with at least 20 matching votes
                            .orderBy('total', 'DESC') // Order by the number of matching votes
                            .getRawMany()];
                case 1:
                    result = _a.sent();
                    matchingCountries = result.map(function (row) { return row; });
                    return [2 /*return*/, matchingCountries];
            }
        });
    });
}
function findMostActiveCountries() {
    return __awaiter(this, arguments, void 0, function (threshold, range) {
        var voteRepo, result;
        if (threshold === void 0) { threshold = 100; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    voteRepo = models_1.ResolutionVoteRepository.createInstance(models_1.defaultDataSource);
                    return [4 /*yield*/, voteRepo
                            .createQueryBuilder("rv1") // Alias for the first resolution_vote table
                            .innerJoin("rv1.country", "c1") // Join with the country table for the given country
                            .innerJoin("rv1.resolution", "r1") // Join with the resolution table
                            .select("c1.slug AS slug, COUNT(*) as total") // Select the name of the other country
                            .where("r1.year BETWEEN ".concat(range.start, " AND ").concat(range.finish))
                            .groupBy("c1.slug") // Group by the other country's name
                            .having("total >= ".concat(threshold)) // Filter countries with at least 20 matching votes
                            .orderBy('total', 'DESC') // Order by the number of matching votes
                            .getRawMany()];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function findTopVotingPartners(country_1) {
    return __awaiter(this, arguments, void 0, function (country, topN, selectedCountries, range, reverse) {
        var alignments, countryAlignments, _lookup, pair, otherCountry, value;
        if (topN === void 0) { topN = 5; }
        if (reverse === void 0) { reverse = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, calculatePairwiseAlignmentsParallel(__spreadArray([country], selectedCountries, true), range)];
                case 1:
                    alignments = _a.sent();
                    countryAlignments = [];
                    _lookup = [];
                    for (pair in alignments) {
                        if (pair.startsWith("".concat(country, "/")) || pair.endsWith("/".concat(country))) {
                            otherCountry = pair.startsWith("".concat(country, "/")) ? pair.split('/')[1] : pair.split('/')[0];
                            value = { country: otherCountry, alignment: alignments[pair] };
                            if (otherCountry != country && !_lookup.includes(otherCountry)) {
                                countryAlignments.push(value);
                                _lookup.push(otherCountry);
                            }
                        }
                    }
                    return [2 /*return*/, countryAlignments.sort(function (a, b) { return reverse ? a.alignment - b.alignment : b.alignment - a.alignment; }).slice(0, topN)];
            }
        });
    });
}
function fetchVotingData(range) {
    return __awaiter(this, void 0, void 0, function () {
        var voteRepo, countries, votes, voteMatrix, keys, rnd, i, j, resId, countryName, vote;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    voteRepo = models_1.defaultDataSource.getRepository(models_1.ResolutionVote);
                    return [4 /*yield*/, findMostActiveCountries(50, range)];
                case 1:
                    countries = (_a.sent()).map(function (country) { return country.slug; });
                    return [4 /*yield*/, getResolutionVotes(countries, range)
                        // Initialize the vote matrix
                    ];
                case 2:
                    votes = _a.sent();
                    voteMatrix = Array.from({ length: countries.length }, function () {
                        return Array(Object.keys(votes).length).fill(0);
                    } // 0 represents no vote
                    );
                    keys = Object.keys(votes).map(Number);
                    rnd = 3;
                    // Populate the vote matrix
                    for (i = 0; i < countries.length; i++) {
                        for (j = 0; j < keys.length; j++) {
                            resId = keys[j];
                            countryName = countries[i];
                            vote = votes[resId][countryName] ? Number(votes[resId][countryName]) : 0;
                            voteMatrix[i][j] = vote; // Use the vote value (e.g., 1 for Yes, 2 for No, etc.)
                        }
                    }
                    return [2 /*return*/, { countries: countries, voteMatrix: voteMatrix }];
            }
        });
    });
}
function clusterCountriesByVoting(range) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, countries, voteMatrix, numClusters, result, clusters, i, clusterId, country;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetchVotingData(range)];
                case 1:
                    _a = _b.sent(), countries = _a.countries, voteMatrix = _a.voteMatrix;
                    numClusters = 10;
                    result = (0, ml_kmeans_1.kmeans)(voteMatrix, numClusters, {});
                    clusters = {};
                    for (i = 0; i < result.clusters.length; i++) {
                        clusterId = result.clusters[i];
                        country = countries[i];
                        if (!clusters[clusterId]) {
                            clusters[clusterId] = [];
                        }
                        clusters[clusterId].push(country);
                    }
                    return [2 /*return*/, clusters];
            }
        });
    });
}
