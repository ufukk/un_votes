import { defaultDataSource, YearRange, ResolutionVote, Country, Resolution, Vote, VotingType } from '../reader/models';
import { In } from 'typeorm';
import * as kmeans from 'ml-kmeans'; // Install ml-kmeans for clustering

export async function findFrequentVotingGroups(yearRange: YearRange, votingType: VotingType | null = null): Promise<{ group: string[], averageCompatibility: number }[]> {
    const connection = defaultDataSource;
    const resolutionVoteRepository = connection.getRepository(ResolutionVote);
    const countryRepository = connection.getRepository(Country);

    // Fetch all resolutions within the year range
    let q = connection.getRepository(Resolution)
        .createQueryBuilder('resolution')
        .where('resolution.year >= :start AND resolution.year <= :finish', { start: yearRange.start, finish: yearRange.finish })

    if(votingType) {
        q = q.andWhere('votingType = :votingType', {votingType})
    }
    const resolutions = await q.getMany()
    const resolutionIds = resolutions.map(res => res.resolutionId);

    // Fetch all votes for the resolutions within the year range
    const votes = await await resolutionVoteRepository
    .createQueryBuilder('vote')
    .leftJoinAndSelect('vote.resolution', 'resolution')
    .leftJoinAndSelect('vote.country', 'country')
    .where('vote.resolutionResolutionId IN (:...resolutionIds)', { resolutionIds })
    .andWhere('vote.vote IN (:...votes)', { votes: [Vote.Yes, Vote.No, Vote.Abstained] })
    .getMany();

    // Create a map of country slugs to their votes per resolution
    const countryVotesMap = new Map<string, Map<number, Vote>>();
    for (const vote of votes) {
        if (!countryVotesMap.has(vote.country.slug)) {
            countryVotesMap.set(vote.country.slug, new Map<number, Vote>());
        }
        countryVotesMap.get(vote.country.slug)!.set(vote.resolution.resolutionId, vote.vote);
    }

    const countrySlugs = Array.from(countryVotesMap.keys());

    // Create a similarity matrix between countries
    const similarityMatrix: number[][] = [];
    for (let i = 0; i < countrySlugs.length; i++) {
        similarityMatrix[i] = [];
        for (let j = 0; j < countrySlugs.length; j++) {
            if (i === j) {
                similarityMatrix[i][j] = 1; // A country is 100% similar to itself
            } else {
                const votesA = countryVotesMap.get(countrySlugs[i])!;
                const votesB = countryVotesMap.get(countrySlugs[j])!;

                let sameVotes = 0;
                let totalVotes = 0;

                for (const resolutionId of votesA.keys()) {
                    if (votesB.has(resolutionId)) {
                        totalVotes++;
                        if (votesA.get(resolutionId) === votesB.get(resolutionId)) {
                            sameVotes++;
                        }
                    }
                }

                const similarity = totalVotes === 0 ? 0 : sameVotes / totalVotes;
                similarityMatrix[i][j] = similarity;
            }
        }
    }

    // Perform K-Means clustering on the similarity matrix
    const numClusters = 10; // You can adjust the number of clusters
    const kmeansResult = kmeans.kmeans(similarityMatrix, numClusters, { initialization: 'random' });

    // Group countries based on their cluster assignments
    const clusters: Map<number, string[]> = new Map();
    for (let i = 0; i < kmeansResult.clusters.length; i++) {
        const clusterId = kmeansResult.clusters[i];
        if (!clusters.has(clusterId)) {
            clusters.set(clusterId, []);
        }
        clusters.get(clusterId)!.push(countrySlugs[i]);
    }

    // Calculate average compatibility for each cluster
    const groups: { group: string[], averageCompatibility: number }[] = [];
    for (const [clusterId, countryGroup] of clusters.entries()) {
        let totalCompatibility = 0;
        let count = 0;

        for (let i = 0; i < countryGroup.length; i++) {
            for (let j = i + 1; j < countryGroup.length; j++) {
                const indexA = countrySlugs.indexOf(countryGroup[i]);
                const indexB = countrySlugs.indexOf(countryGroup[j]);
                totalCompatibility += similarityMatrix[indexA][indexB];
                count++;
            }
        }

        const averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
        groups.push({ group: countryGroup, averageCompatibility });
    }

    // Sort groups by average compatibility in descending order
    groups.sort((a, b) => b.averageCompatibility - a.averageCompatibility);

    return groups;
}

export function findCountryGroup(
    countrySlug: string,
    groups: { group: string[], averageCompatibility: number }[]
): { group: string[], averageCompatibility: number } | null {
    for (const group of groups) {
        if (group.group.includes(countrySlug)) {
            return group;
        }
    }
    return null; // Return null if the country is not found in any group
}

import * as hclust from "ml-hclust"; // Install ml-hclust for hierarchical clustering

export async function findFrequentVotingGroupsHier(yearRange: YearRange): Promise<{ group: string[], averageCompatibility: number }[]> {
    const connection = defaultDataSource
    const resolutionVoteRepository = connection.getRepository(ResolutionVote);
    const countryRepository = connection.getRepository(Country);

    // Fetch all resolutions within the year range
    const resolutions = await connection.getRepository(Resolution)
        .createQueryBuilder("resolution")
        .where("resolution.year >= :start AND resolution.year <= :finish", { start: yearRange.start, finish: yearRange.finish })
        .getMany();

    const resolutionIds = resolutions.map(res => res.resolutionId);

    // Fetch all votes for the resolutions within the year range
    const votes = await resolutionVoteRepository
        .createQueryBuilder("vote")
        .leftJoinAndSelect("vote.country", "country")
        .leftJoinAndSelect("vote.resolution", "resolution")
        .where("vote.resolutionResolutionId IN (:...resolutionIds)", { resolutionIds })
        .andWhere("vote.vote IN (:...votes)", { votes: [Vote.Yes, Vote.No, Vote.Abstained] })
        .getMany();

    // Create a map of country slugs to their feature vectors
    const countryFeatureMap = new Map<string, number[]>();
    for (const vote of votes) {
        if (!countryFeatureMap.has(vote.country.slug)) {
            countryFeatureMap.set(vote.country.slug, new Array(resolutionIds.length).fill(0));
        }
        const index = resolutionIds.indexOf(vote.resolution.resolutionId);
        countryFeatureMap.get(vote.country.slug)![index] = vote.vote === Vote.Yes ? 2 : vote.vote === Vote.No ? 1 : vote.vote == Vote.Abstained ? 0 : -1;
    }

    const countrySlugs = Array.from(countryFeatureMap.keys());
    const featureVectors = countrySlugs.map(slug => countryFeatureMap.get(slug)!);

    const tree = hclust.agnes(featureVectors, { method: 'average' }); // Use average linkage

    // Group countries based on their cluster assignments
    const groups: { group: string[], averageCompatibility: number }[] = [];
    for (const cluster of tree.children) {
        const countryGroup = cluster.indices().map((index: number) => countrySlugs[index]);

        // Skip groups with only one country
        if (countryGroup.length <= 1) {
            continue;
        }

        // Calculate average compatibility for the group
        let totalCompatibility = 0;
        let count = 0;

        for (let i = 0; i < countryGroup.length; i++) {
            for (let j = i + 1; j < countryGroup.length; j++) {
                const indexA = countrySlugs.indexOf(countryGroup[i]);
                const indexB = countrySlugs.indexOf(countryGroup[j]);
                totalCompatibility += 1 - featureVectors[indexA][indexB]; // Convert distance back to similarity
                count++;
            }
        }

        const averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
        groups.push({ group: countryGroup, averageCompatibility });
    }

    // Sort groups by average compatibility in descending order
    groups.sort((a, b) => b.averageCompatibility - a.averageCompatibility);

    return groups;
}


export async function findFrequentVotingGroupsFlat(yearRange: YearRange): Promise<{ group: string[], averageCompatibility: number }[]> {
    const connection = defaultDataSource
    const resolutionVoteRepository = connection.getRepository(ResolutionVote);
    const countryRepository = connection.getRepository(Country);

    const votingType = VotingType.GeneralCouncil;
    // Fetch all resolutions within the year range
    const resolutions = await connection.getRepository(Resolution)
        .createQueryBuilder("resolution")
        .where("resolution.year >= :start AND resolution.year <= :finish", { start: yearRange.start, finish: yearRange.finish })
        .andWhere('resolution.votingType = :votingType', {votingType})
        .getMany();

    const resolutionIds = resolutions.map(res => res.resolutionId);

    // Fetch all votes for the resolutions within the year range
    const votes = await resolutionVoteRepository
        .createQueryBuilder("vote")
        .leftJoinAndSelect("vote.country", "country")
        .leftJoinAndSelect("vote.resolution", "resolution")
        .where("vote.resolutionResolutionId IN (:...resolutionIds)", { resolutionIds })
        .andWhere("vote.vote IN (:...votes)", { votes: [Vote.Yes, Vote.No, Vote.Abstained] })
        .orderBy({countryCountryId: 'ASC', resolutionResolutionId: 'ASC'})
        .getMany();

    // Create a map of country slugs to their feature vectors
    const countryFeatureMap = new Map<string, number[]>();
    for (const vote of votes) {
        if (!countryFeatureMap.has(vote.country.slug)) {
            countryFeatureMap.set(vote.country.slug, new Array(resolutionIds.length).fill(0));
        }
        const index = resolutionIds.indexOf(vote.resolution.resolutionId);
        countryFeatureMap.get(vote.country.slug)![index] = vote.vote == Vote.Yes ? 2 : vote.vote == Vote.No ? 1 : vote.vote == Vote.Abstained ? 0 : -1;
    }

    const countrySlugs = Array.from(countryFeatureMap.keys());
    const featureVectors = countrySlugs.map(slug => countryFeatureMap.get(slug)!);

    // Perform K-Means clustering on the feature vectors
    const numClusters = 10; // Adjust the number of clusters as needed
    const kmeansResult = kmeans.kmeans(featureVectors, numClusters, { initialization: "random" });
    // Group countries based on their cluster assignments
    const clusters: Map<number, string[]> = new Map();
    for (let i = 0; i < kmeansResult.clusters.length; i++) {
        const clusterId = kmeansResult.clusters[i];
        if (!clusters.has(clusterId)) {
            clusters.set(clusterId, []);
        }
        clusters.get(clusterId)!.push(countrySlugs[i]);
    }

    // Calculate average compatibility for each cluster
    const groups: { group: string[], averageCompatibility: number }[] = [];
    for (const [clusterId, countryGroup] of clusters.entries()) {
        // Skip groups with only one country
        if (countryGroup.length <= 1) {
            continue;
        }

        let totalCompatibility = 0;
        let count = 0;

        for (let i = 0; i < countryGroup.length; i++) {
            for (let j = i + 1; j < countryGroup.length; j++) {
                const vectorA = countryFeatureMap.get(countryGroup[i])!;
                const vectorB = countryFeatureMap.get(countryGroup[j])!;

                // Calculate cosine similarity between feature vectors
                let dotProduct = 0;
                let magnitudeA = 0;
                let magnitudeB = 0;

                for (let k = 0; k < vectorA.length; k++) {
                    dotProduct += vectorA[k] * vectorB[k];
                    magnitudeA += vectorA[k] * vectorA[k];
                    magnitudeB += vectorB[k] * vectorB[k];
                }

                const similarity = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
                totalCompatibility += similarity;
                count++;
            }
        }

        const averageCompatibility = count === 0 ? 0 : totalCompatibility / count;
        groups.push({ group: countryGroup, averageCompatibility });
    }

    // Sort groups by average compatibility in descending order
    groups.sort((a, b) => b.averageCompatibility - a.averageCompatibility);

    return groups;
}