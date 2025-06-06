import type { PageServerLoad } from './$types'
import { ResolutionRepository, SubjectRepository, VotingType, getDefaultConnection } from '@ufukk/shared/src/reader/models';
import { instanceToPlain } from 'class-transformer'
import { MoreThan } from "typeorm"

export const load: PageServerLoad = async ({ url }) => {
    const conn = await getDefaultConnection()
    const resolutionRepo = ResolutionRepository.createInstance(conn);
    // Get available years (assuming you have this method)
    const years = await resolutionRepo.getAvailableYears();


    const numberOfResolutions = (await resolutionRepo.getYearResolutionNumbers()).reduce((a, b) => a + b.total, 0)
    const numberOfGeneralCouncilResolutions = await resolutionRepo.getResolutionNumbersByVotingType(VotingType.GeneralCouncil)
    const numberOfSecurityCouncilResolutions = await resolutionRepo.getResolutionNumbersByVotingType(VotingType.SecurityCouncil)

    return {
        numberOfResolutions: numberOfResolutions,
        numberOfGeneralCouncilResolutions: numberOfGeneralCouncilResolutions,
        numberOfSecurityCouncilResolutions: numberOfSecurityCouncilResolutions,
        years
    };
};