import { defaultDataSource, YearRange, ResolutionRepository, CountryRepository, AuthorRepository, AgendaRepository, SubjectRepository, ResolutionVoteRepository, ResolutionType, VotingType, ResolutionStatus, Vote, make_slug, SlugAliasRepository } from '@ufukk/shared/src/reader/models';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	// log all headers
	if (!defaultDataSource.isInitialized) {
		await defaultDataSource.initialize();
		console.log('Database connected successfully.');
	}

	console.log(...request.headers);
	const resolutionRepo = ResolutionRepository.createInstance(defaultDataSource);
	const total = await resolutionRepo.resolutionCountByYear(2001, VotingType.GeneralCouncil)
	// create a JSON Response using a header we received
	return json({
		// retrieve a specific header
		count: total,
		userAgent: request.headers.get('user-agent')
	});
};
