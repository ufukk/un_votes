import { In } from "typeorm";
import { defaultDataSource, getDefaultConnection, ResolutionVote, ResolutionVoteRepository, Vote } from "../reader/models";

interface ResolutionVotes {
    [resolutionSymbol: string]: {
        [countryName: string]: Vote;
    };
}

export async function getResolutionVotes(selectedCountries: string[] | null = null): Promise<ResolutionVotes> {
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);
    const votes = selectedCountries ? await voteRepo.createQueryBuilder("resolution_vote")
    .leftJoinAndSelect('resolution_vote.country', 'country')
    .leftJoinAndSelect('resolution_vote.resolution', 'resolution')
    .where("country.slug IN (:...selectedCountries)", { selectedCountries }).orderBy("countryCountryId", "ASC").getMany()
        : await voteRepo.createQueryBuilder("resolution_vote").orderBy({country: 'ASC'}).getMany()
    const resolutionVotes: ResolutionVotes = {};
    votes.forEach(vote => {
        if (!resolutionVotes[vote.resolution.symbol]) {
            resolutionVotes[vote.resolution.symbol] = {};
        }
        resolutionVotes[vote.resolution.symbol][vote.country.slug] = vote.vote;
    });
    return resolutionVotes;
}

interface VotingMatrix {
    [countryName: string]: {
        [resolutionSymbol: string]: Vote;
    };
}

async function getVotingMatrix(selectedCountries: string[] | null = null): Promise<VotingMatrix> {
    const resolutionVotes = await getResolutionVotes(selectedCountries);
    const votingMatrix: VotingMatrix = {};

    for (const resolutionSymbol in resolutionVotes) {
        for (const countryName in resolutionVotes[resolutionSymbol]) {
            if (!votingMatrix[countryName]) {
                votingMatrix[countryName] = {};
            }
            votingMatrix[countryName][resolutionSymbol] = resolutionVotes[resolutionSymbol][countryName];
        }
    }

    return votingMatrix;
}

async function calculatePairwiseAlignmentsParallel(selectedCountries: string[] | null = null): Promise<{ [pair: string]: number }> {
    const votingMatrix = await getVotingMatrix(selectedCountries);
    const countries = selectedCountries || Object.keys(votingMatrix);
    const alignments: { [pair: string]: number } = {};
    const promises = [];
    for (let i = 0; i < countries.length; i++) {
        for (let j = i + 1; j < countries.length; j++) {
            promises.push(
                (async () => {
                    const country1 = countries[i];
                    const country2 = countries[j];
                    const key = `${country1}/${country2}`;

                    let matchingVotes = 0;
                    let totalVotes = 0;
                    for (const resolutionSymbol in votingMatrix[country1]) {
                        if (resolutionSymbol in votingMatrix[country2]) {
                            totalVotes++;
                            if (votingMatrix[country1][resolutionSymbol] === votingMatrix[country2][resolutionSymbol]) {
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

export async function findMatchingVotingCountries(country: string, threshold = 20): Promise<string[]> {
    const voteRepo = ResolutionVoteRepository.createInstance(defaultDataSource);

    // Use createQueryBuilder to find countries with at least 20 matching votes
    const result = await voteRepo
        .createQueryBuilder("rv1") // Alias for the first resolution_vote table
        .innerJoin("rv1.resolution", "resolution") // Join with the resolution table
        .innerJoin("rv1.country", "c1") // Join with the country table for the given country
        .innerJoin(
            ResolutionVote,
            "rv2", // Alias for the second resolution_vote table
            "rv2.resolutionSymbol = rv1.resolutionSymbol AND rv2.vote = rv1.vote"
        )
        .innerJoin("rv2.country", "c2") // Join with the country table for the other country
        .where("c1.slug = :country", { country }) // Filter by the given country
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

export async function findTopVotingPartners(country: string, topN: number = 5, selectedCountries: string[] | null = null): Promise<{ country: string, alignment: number }[]> {
    const alignments = await calculatePairwiseAlignmentsParallel(selectedCountries ? [country, ...selectedCountries] : null);
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

    return countryAlignments.sort((a, b) => b.alignment - a.alignment).slice(0, topN);
}