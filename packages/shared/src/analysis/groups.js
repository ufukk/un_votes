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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFrequentVotingGroups = findFrequentVotingGroups;
exports.findCountryGroup = findCountryGroup;
exports.findFrequentVotingGroupsHier = findFrequentVotingGroupsHier;
exports.findFrequentVotingGroupsFlat = findFrequentVotingGroupsFlat;
var models_1 = require("../reader/models");
var kmeans = require("ml-kmeans"); // Install ml-kmeans for clustering
function findFrequentVotingGroups(yearRange_1) {
    return __awaiter(this, arguments, void 0, function (yearRange, votingType) {
        var connection, resolutionVoteRepository, countryRepository, q, resolutions, resolutionIds, votes, countryVotesMap, _i, votes_1, vote, countrySlugs, similarityMatrix, i, j, votesA, votesB, sameVotes, totalVotes, _a, _b, resolutionId, similarity, numClusters, kmeansResult, clusters, i, clusterId, groups, _c, _d, _e, clusterId, countryGroup, totalCompatibility, count, i, j, indexA, indexB, averageCompatibility;
        if (votingType === void 0) { votingType = null; }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    connection = models_1.defaultDataSource;
                    resolutionVoteRepository = connection.getRepository(models_1.ResolutionVote);
                    countryRepository = connection.getRepository(models_1.Country);
                    q = connection.getRepository(models_1.Resolution)
                        .createQueryBuilder('resolution')
                        .where('resolution.year >= :start AND resolution.year <= :finish', { start: yearRange.start, finish: yearRange.finish });
                    if (votingType) {
                        q = q.andWhere('votingType = :votingType', { votingType: votingType });
                    }
                    return [4 /*yield*/, q.getMany()];
                case 1:
                    resolutions = _f.sent();
                    resolutionIds = resolutions.map(function (res) { return res.resolutionId; });
                    return [4 /*yield*/, resolutionVoteRepository
                            .createQueryBuilder('vote')
                            .leftJoinAndSelect('vote.resolution', 'resolution')
                            .leftJoinAndSelect('vote.country', 'country')
                            .where('vote.resolutionResolutionId IN (:...resolutionIds)', { resolutionIds: resolutionIds })
                            .andWhere('vote.vote IN (:...votes)', { votes: [models_1.Vote.Yes, models_1.Vote.No, models_1.Vote.Abstained] })
                            .getMany()];
                case 2: return [4 /*yield*/, _f.sent()];
                case 3:
                    votes = _f.sent();
                    countryVotesMap = new Map();
                    for (_i = 0, votes_1 = votes; _i < votes_1.length; _i++) {
                        vote = votes_1[_i];
                        if (!countryVotesMap.has(vote.country.slug)) {
                            countryVotesMap.set(vote.country.slug, new Map());
                        }
                        countryVotesMap.get(vote.country.slug).set(vote.resolution.resolutionId, vote.vote);
                    }
                    countrySlugs = Array.from(countryVotesMap.keys());
                    similarityMatrix = [];
                    for (i = 0; i < countrySlugs.length; i++) {
                        similarityMatrix[i] = [];
                        for (j = 0; j < countrySlugs.length; j++) {
                            if (i === j) {
                                similarityMatrix[i][j] = 1; // A country is 100% similar to itself
                            }
                            else {
                                votesA = countryVotesMap.get(countrySlugs[i]);
                                votesB = countryVotesMap.get(countrySlugs[j]);
                                sameVotes = 0;
                                totalVotes = 0;
                                for (_a = 0, _b = votesA.keys(); _a < _b.length; _a++) {
                                    resolutionId = _b[_a];
                                    if (votesB.has(resolutionId)) {
                                        totalVotes++;
                                        if (votesA.get(resolutionId) === votesB.get(resolutionId)) {
                                            sameVotes++;
                                        }
                                    }
                                }
                                similarity = totalVotes === 0 ? 0 : sameVotes / totalVotes;
                                similarityMatrix[i][j] = similarity;
                            }
                        }
                    }
                    numClusters = 10;
                    kmeansResult = kmeans.kmeans(similarityMatrix, numClusters, { initialization: 'random' });
                    clusters = new Map();
                    for (i = 0; i < kmeansResult.clusters.length; i++) {
                        clusterId = kmeansResult.clusters[i];
                        if (!clusters.has(clusterId)) {
                            clusters.set(clusterId, []);
                        }
                        clusters.get(clusterId).push(countrySlugs[i]);
                    }
                    groups = [];
                    for (_c = 0, _d = clusters.entries(); _c < _d.length; _c++) {
                        _e = _d[_c], clusterId = _e[0], countryGroup = _e[1];
                        totalCompatibility = 0;
                        count = 0;
                        for (i = 0; i < countryGroup.length; i++) {
                            for (j = i + 1; j < countryGroup.length; j++) {
                                indexA = countrySlugs.indexOf(countryGroup[i]);
                                indexB = countrySlugs.indexOf(countryGroup[j]);
                                totalCompatibility += similarityMatrix[indexA][indexB];
                                count++;
                            }
                        }
                        averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
                        groups.push({ group: countryGroup, averageCompatibility: averageCompatibility });
                    }
                    // Sort groups by average compatibility in descending order
                    groups.sort(function (a, b) { return b.averageCompatibility - a.averageCompatibility; });
                    return [2 /*return*/, groups];
            }
        });
    });
}
function findCountryGroup(countrySlug, groups) {
    for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
        var group = groups_1[_i];
        if (group.group.includes(countrySlug)) {
            return group;
        }
    }
    return null; // Return null if the country is not found in any group
}
var hclust = require("ml-hclust"); // Install ml-hclust for hierarchical clustering
function findFrequentVotingGroupsHier(yearRange) {
    return __awaiter(this, void 0, void 0, function () {
        var connection, resolutionVoteRepository, countryRepository, resolutions, resolutionIds, votes, countryFeatureMap, _i, votes_2, vote, index, countrySlugs, featureVectors, tree, groups, _a, _b, cluster, countryGroup, totalCompatibility, count, i, j, indexA, indexB, averageCompatibility;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    connection = models_1.defaultDataSource;
                    resolutionVoteRepository = connection.getRepository(models_1.ResolutionVote);
                    countryRepository = connection.getRepository(models_1.Country);
                    return [4 /*yield*/, connection.getRepository(models_1.Resolution)
                            .createQueryBuilder("resolution")
                            .where("resolution.year >= :start AND resolution.year <= :finish", { start: yearRange.start, finish: yearRange.finish })
                            .getMany()];
                case 1:
                    resolutions = _c.sent();
                    resolutionIds = resolutions.map(function (res) { return res.resolutionId; });
                    return [4 /*yield*/, resolutionVoteRepository
                            .createQueryBuilder("vote")
                            .leftJoinAndSelect("vote.country", "country")
                            .leftJoinAndSelect("vote.resolution", "resolution")
                            .where("vote.resolutionResolutionId IN (:...resolutionIds)", { resolutionIds: resolutionIds })
                            .andWhere("vote.vote IN (:...votes)", { votes: [models_1.Vote.Yes, models_1.Vote.No, models_1.Vote.Abstained] })
                            .getMany()];
                case 2:
                    votes = _c.sent();
                    countryFeatureMap = new Map();
                    for (_i = 0, votes_2 = votes; _i < votes_2.length; _i++) {
                        vote = votes_2[_i];
                        if (!countryFeatureMap.has(vote.country.slug)) {
                            countryFeatureMap.set(vote.country.slug, new Array(resolutionIds.length).fill(0));
                        }
                        index = resolutionIds.indexOf(vote.resolution.resolutionId);
                        countryFeatureMap.get(vote.country.slug)[index] = vote.vote === models_1.Vote.Yes ? 2 : vote.vote === models_1.Vote.No ? 1 : vote.vote == models_1.Vote.Abstained ? 0 : -1;
                    }
                    countrySlugs = Array.from(countryFeatureMap.keys());
                    featureVectors = countrySlugs.map(function (slug) { return countryFeatureMap.get(slug); });
                    tree = hclust.agnes(featureVectors, { method: 'average' });
                    groups = [];
                    for (_a = 0, _b = tree.children; _a < _b.length; _a++) {
                        cluster = _b[_a];
                        countryGroup = cluster.indices().map(function (index) { return countrySlugs[index]; });
                        // Skip groups with only one country
                        if (countryGroup.length <= 1) {
                            continue;
                        }
                        totalCompatibility = 0;
                        count = 0;
                        for (i = 0; i < countryGroup.length; i++) {
                            for (j = i + 1; j < countryGroup.length; j++) {
                                indexA = countrySlugs.indexOf(countryGroup[i]);
                                indexB = countrySlugs.indexOf(countryGroup[j]);
                                totalCompatibility += 1 - featureVectors[indexA][indexB]; // Convert distance back to similarity
                                count++;
                            }
                        }
                        averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
                        groups.push({ group: countryGroup, averageCompatibility: averageCompatibility });
                    }
                    // Sort groups by average compatibility in descending order
                    groups.sort(function (a, b) { return b.averageCompatibility - a.averageCompatibility; });
                    return [2 /*return*/, groups];
            }
        });
    });
}
function findFrequentVotingGroupsFlat(yearRange) {
    return __awaiter(this, void 0, void 0, function () {
        var connection, resolutionVoteRepository, countryRepository, votingType, resolutions, resolutionIds, votes, countryFeatureMap, _i, votes_3, vote, index, countrySlugs, featureVectors, numClusters, kmeansResult, clusters, i, clusterId, groups, _a, _b, _c, clusterId, countryGroup, totalCompatibility, count, i, j, vectorA, vectorB, dotProduct, magnitudeA, magnitudeB, k, similarity, averageCompatibility;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    connection = models_1.defaultDataSource;
                    resolutionVoteRepository = connection.getRepository(models_1.ResolutionVote);
                    countryRepository = connection.getRepository(models_1.Country);
                    votingType = models_1.VotingType.GeneralCouncil;
                    return [4 /*yield*/, connection.getRepository(models_1.Resolution)
                            .createQueryBuilder("resolution")
                            .where("resolution.year >= :start AND resolution.year <= :finish", { start: yearRange.start, finish: yearRange.finish })
                            .andWhere('resolution.votingType = :votingType', { votingType: votingType })
                            .getMany()];
                case 1:
                    resolutions = _d.sent();
                    resolutionIds = resolutions.map(function (res) { return res.resolutionId; });
                    return [4 /*yield*/, resolutionVoteRepository
                            .createQueryBuilder("vote")
                            .leftJoinAndSelect("vote.country", "country")
                            .leftJoinAndSelect("vote.resolution", "resolution")
                            .where("vote.resolutionResolutionId IN (:...resolutionIds)", { resolutionIds: resolutionIds })
                            .andWhere("vote.vote IN (:...votes)", { votes: [models_1.Vote.Yes, models_1.Vote.No, models_1.Vote.Abstained] })
                            .orderBy({ countryCountryId: 'ASC', resolutionResolutionId: 'ASC' })
                            .getMany()];
                case 2:
                    votes = _d.sent();
                    countryFeatureMap = new Map();
                    for (_i = 0, votes_3 = votes; _i < votes_3.length; _i++) {
                        vote = votes_3[_i];
                        if (!countryFeatureMap.has(vote.country.slug)) {
                            countryFeatureMap.set(vote.country.slug, new Array(resolutionIds.length).fill(0));
                        }
                        index = resolutionIds.indexOf(vote.resolution.resolutionId);
                        countryFeatureMap.get(vote.country.slug)[index] = vote.vote == models_1.Vote.Yes ? 2 : vote.vote == models_1.Vote.No ? 1 : vote.vote == models_1.Vote.Abstained ? 0 : -1;
                    }
                    countrySlugs = Array.from(countryFeatureMap.keys());
                    featureVectors = countrySlugs.map(function (slug) { return countryFeatureMap.get(slug); });
                    numClusters = 10;
                    kmeansResult = kmeans.kmeans(featureVectors, numClusters, { initialization: "random" });
                    clusters = new Map();
                    for (i = 0; i < kmeansResult.clusters.length; i++) {
                        clusterId = kmeansResult.clusters[i];
                        if (!clusters.has(clusterId)) {
                            clusters.set(clusterId, []);
                        }
                        clusters.get(clusterId).push(countrySlugs[i]);
                    }
                    groups = [];
                    for (_a = 0, _b = clusters.entries(); _a < _b.length; _a++) {
                        _c = _b[_a], clusterId = _c[0], countryGroup = _c[1];
                        // Skip groups with only one country
                        if (countryGroup.length <= 1) {
                            continue;
                        }
                        totalCompatibility = 0;
                        count = 0;
                        for (i = 0; i < countryGroup.length; i++) {
                            for (j = i + 1; j < countryGroup.length; j++) {
                                vectorA = countryFeatureMap.get(countryGroup[i]);
                                vectorB = countryFeatureMap.get(countryGroup[j]);
                                dotProduct = 0;
                                magnitudeA = 0;
                                magnitudeB = 0;
                                for (k = 0; k < vectorA.length; k++) {
                                    dotProduct += vectorA[k] * vectorB[k];
                                    magnitudeA += vectorA[k] * vectorA[k];
                                    magnitudeB += vectorB[k] * vectorB[k];
                                }
                                similarity = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
                                totalCompatibility += similarity;
                                count++;
                            }
                        }
                        averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
                        groups.push({ group: countryGroup, averageCompatibility: averageCompatibility });
                    }
                    // Sort groups by average compatibility in descending order
                    groups.sort(function (a, b) { return b.averageCompatibility - a.averageCompatibility; });
                    return [2 /*return*/, groups];
            }
        });
    });
}
