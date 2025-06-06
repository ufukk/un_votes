import { getDefaultConnection, YearRange, ResolutionRepository, Resolution, CountryRepository, AuthorRepository, AgendaRepository, SubjectRepository, ResolutionVoteRepository, ResolutionType, VotingType, ResolutionStatus, Vote, make_slug, SlugAliasRepository } from '@ufukk/shared/src/reader/models';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const data: { subjectIds: number[], year: string | null, votingType: string | null, page: number | null } = await request.json()
	const conn = await getDefaultConnection()
	const resolutionRepo = ResolutionRepository.createInstance(conn);
	const voteRepo = ResolutionVoteRepository.createInstance(conn)
	const size = 25
	const first = size * (data.page ? data.page - 1 : 0)
	const { total, resolutions } = await resolutionRepo.pagedQuery({ start: first, size: size, subjectIds: data.subjectIds || undefined, year: new Number(data.year).valueOf() || undefined })
	const results = await Promise.all(resolutions.map(async (res) => {
		const resV: (Resolution & { voteCountYes: number, voteCountNo: number, voteCountAbstained: number }) = { voteCountYes: 0, voteCountNo: 0, voteCountAbstained: 0, ...res }
		resV.voteCountYes = await voteRepo.voteCountsForResolution(res.resolutionId, Vote.Yes)
		resV.voteCountNo = await voteRepo.voteCountsForResolution(res.resolutionId, Vote.No)
		resV.voteCountAbstained = await voteRepo.voteCountsForResolution(res.resolutionId, Vote.Abstained)
		return resV
	}))
	return json({
		total,
		results
	})
}
