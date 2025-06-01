import { defaultDataSource, YearRange, Country, getDefaultConnection, ResolutionVote, ResolutionVoteRepository, Vote } from "../reader/models";
import { kmeans } from "ml-kmeans";
import * as mlHclust from "ml-hclust";

interface ResolutionVotes {
    [resolutionId: number]: {
        [countryName: string]: Vote;
    };
}

export async function getResolutionVotes(selectedCountries: string[], range: YearRange): Promise<ResolutionVotes> {
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);
    const votes = await voteRepo.createQueryBuilder("resolution_vote")
    .leftJoinAndSelect('resolution_vote.country', 'country')
    .leftJoinAndSelect('resolution_vote.resolution', 'resolution')
    .where("country.slug IN (:...selectedCountries)", { selectedCountries })
    .andWhere(`resolution.year BETWEEN ${range.start} AND ${range.finish}`)
    .orderBy("countryCountryId", "ASC").getMany()
    const resolutionVotes: ResolutionVotes = {};
    votes.forEach(vote => {
        if (!resolutionVotes[vote.resolution.resolutionId]) {
            resolutionVotes[vote.resolution.resolutionId] = {};
        }
        resolutionVotes[vote.resolution.resolutionId][vote.country.slug] = vote.vote;
    });
    return resolutionVotes;
}

interface VotingMatrix {
    [countryName: string]: {
        [resolutionId: string]: Vote;
    };
}

async function getVotingMatrix(selectedCountries: string[], range: YearRange): Promise<VotingMatrix> {
    const resolutionVotes = await getResolutionVotes(selectedCountries, range);
    const votingMatrix: VotingMatrix = {};

    for (const resolutionId in resolutionVotes) {
        for (const countryName in resolutionVotes[resolutionId]) {
            if (!votingMatrix[countryName]) {
                votingMatrix[countryName] = {};
            }
            votingMatrix[countryName][resolutionId] = resolutionVotes[resolutionId][countryName];
        }
    }

    return votingMatrix;
}

async function calculatePairwiseAlignmentsParallel(selectedCountries: string[], range: YearRange): Promise<{ [pair: string]: number }> {
    const votingMatrix = await getVotingMatrix(selectedCountries, range);
    const alignments: { [pair: string]: number } = {};
    const promises = [];
    for (let i = 0; i < selectedCountries.length; i++) {
        for (let j = i + 1; j < selectedCountries.length; j++) {
            promises.push(
                (async () => {
                    const country1 = selectedCountries[i];
                    const country2 = selectedCountries[j];
                    const key = `${country1}/${country2}`;

                    let matchingVotes = 0;
                    let totalVotes = 0;
                    for (const resolutionId in votingMatrix[country1]) {
                        if (resolutionId in votingMatrix[country2]) {
                            totalVotes++;
                            if (votingMatrix[country1][resolutionId] === votingMatrix[country2][resolutionId]) {
                                matchingVotes++;
                            }
                        }
                    }

                    alignments[key] = totalVotes > 0 ? (matchingVotes / totalVotes) * 100 : 0;
                })()
            );
        }
    }

    await Promise.all(promises);
    return alignments;
}

export async function findMatchingVotingCountries(country: string, range: YearRange, threshold = 20): Promise<any[]> {
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);

    // Use createQueryBuilder to find countries with at least 20 matching votes
    const result = await voteRepo
        .createQueryBuilder("rv1") // Alias for the first resolution_vote table
        .innerJoin("rv1.resolution", "resolution") // Join with the resolution table
        .innerJoin("rv1.country", "c1") // Join with the country table for the given country
        .innerJoin(
            ResolutionVote,
            "rv2", // Alias for the second resolution_vote table
            "rv2.resolutionResolutionId = rv1.resolutionResolutionId AND rv2.vote = rv1.vote"
        )
        .innerJoin("rv2.country", "c2") // Join with the country table for the other country
        .where("c1.slug = :country", { country }) // Filter by the given country
        .andWhere("resolution.year BETWEEN :start AND :finish", { start: range.start, finish: range.finish }) // Exclude the given country
        .andWhere("c2.slug != :country", { country }) // Exclude the given country
        .select("c2.slug AS slug, COUNT(*) as total") // Select the name of the other country
        .groupBy("c2.slug") // Group by the other country's name
        .having(`total >= ${threshold}`) // Filter countries with at least 20 matching votes
        .orderBy('total', 'DESC') // Order by the number of matching votes
        .getRawMany(); // Execute the query and get raw results

    // Extract the country names from the result
    const matchingCountries = result.map((row) => row);

    return matchingCountries;
}


export async function findMostActiveCountries(threshold = 100, range: YearRange): Promise<any[]> {
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);

    // Use createQueryBuilder to find countries with at least 20 matching votes
    const result = await voteRepo
        .createQueryBuilder("rv1") // Alias for the first resolution_vote table
        .innerJoin("rv1.country", "c1") // Join with the country table for the given country
        .innerJoin("rv1.resolution", "r1") // Join with the resolution table
        .select("c1.slug AS slug, COUNT(*) as total") // Select the name of the other country
        .where(`r1.year BETWEEN ${range.start} AND ${range.finish}`)
        .groupBy("c1.slug") // Group by the other country's name
        .having(`total >= ${threshold}`) // Filter countries with at least 20 matching votes
        .orderBy('total', 'DESC') // Order by the number of matching votes
        .getRawMany(); // Execute the query and get raw results

    return result;
}


export async function findTopVotingPartners(country: string, topN: number = 5, selectedCountries: string[], range: YearRange, reverse=false): Promise<{ country: string, alignment: number }[]> {
    const alignments = await calculatePairwiseAlignmentsParallel([country, ...selectedCountries], range);
    const countryAlignments = [];
    const _lookup = []

    for (const pair in alignments) {
        if (pair.startsWith(`${country}/`) || pair.endsWith(`/${country}`)) {
            const otherCountry = pair.startsWith(`${country}/`) ? pair.split('/')[1] : pair.split('/')[0];
            const value = { country: otherCountry, alignment: alignments[pair] }
            if(otherCountry != country && !_lookup.includes(otherCountry)) {
                countryAlignments.push(value);
                _lookup.push(otherCountry)
            }
        }
    }

    return countryAlignments.sort((a, b) => reverse ? a.alignment - b.alignment : b.alignment - a.alignment).slice(0, topN);
}

export async function fetchVotingData(range: YearRange): Promise<{ countries: string[], voteMatrix: number[][] }> {
    const voteRepo = defaultDataSource.getRepository(ResolutionVote);
    const countries = (await findMostActiveCountries(50, range)).map((country) => country.slug)

    // Fetch all votes with resolution and country details
    const votes = await getResolutionVotes(countries, range)

    // Initialize the vote matrix
    const voteMatrix: number[][] = Array.from({ length: countries.length }, () =>
        Array(Object.keys(votes).length).fill(0) // 0 represents no vote
    );

    const keys = Object.keys(votes).map(Number);
    let rnd = 3;
    // Populate the vote matrix
    for(let i = 0; i < countries.length; i++) {
        for (let j = 0; j < keys.length; j++) {
            const resId = keys[j]
            const countryName = countries[i];
            const vote = votes[resId][countryName] ? Number(votes[resId][countryName]) : 0;
            voteMatrix[i][j] = vote; // Use the vote value (e.g., 1 for Yes, 2 for No, etc.)
        }
    }

    return { countries, voteMatrix };
}


export async function clusterCountriesByVoting(range: YearRange) {
    const { countries, voteMatrix } = await fetchVotingData(range);

    // Perform k-means clustering
    const numClusters = 10; // Adjust the number of clusters as needed
    const result = kmeans(voteMatrix, numClusters, {});
    // Organize the results
    const clusters: { [clusterId: number]: string[] } = {};
    for (let i = 0; i < result.clusters.length; i++) {
        const clusterId = result.clusters[i];
        const country = countries[i];
        if (!clusters[clusterId]) {
            clusters[clusterId] = [];
        }
        clusters[clusterId].push(country);
    }

    return clusters;
}


