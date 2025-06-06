import { getDefaultConnection, SubjectRepository } from '@ufukk/shared/src/reader/models';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Like } from 'typeorm'

export const POST: RequestHandler = async ({ request }) => {
    const subjectRepo = SubjectRepository.createInstance(await getDefaultConnection());
    const { query } = await request.json()
    const results = (await subjectRepo.find({
        take: 10, where: {
            subjectName: Like(`%${query}%`)
        }
    })).map((value) => { return { id: value.subjectId, name: value.subjectName } })
    // create a JSON Response using a header we received
    return json(results)
}
